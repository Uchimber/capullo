"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { addMinutes, startOfDay, endOfDay, isBefore } from "date-fns";

import { Prisma } from "@/generated/prisma";

import { auth } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";

import { ServiceSchema, BookingSchema } from "@/lib/schema";
import { isBookingStatus, type BookingStatusValue } from "@/lib/booking-status";

async function checkAdmin() {
  const session = await auth();
  const metadata = session.sessionClaims?.metadata as
    | { role?: string }
    | undefined;
  const role = metadata?.role;
  if (role !== "admin") {
    throw new Error("Энэ үйлдлийг хийхэд админ эрх шаардлагатай.");
  }
}

// Public: for success page to poll until payment is confirmed (no admin)
export async function getBookingStatusForSuccess(bookingId: string) {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { status: true },
  });
  return b ? { status: b.status } : null;
}

async function lockBookingWriteScope(
  tx: Prisma.TransactionClient,
  serviceId: string,
) {
  // Postgres advisory transaction lock to serialize booking writes per service.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`booking-service:${serviceId}`}))`;
}

// SERVICES
export async function createService(formData: FormData) {
  await checkAdmin();

  const rawData = Object.fromEntries(formData.entries());
  const validated = ServiceSchema.parse(rawData);

  await prisma.service.create({
    data: {
      name: validated.name,
      duration: validated.duration,
      price: validated.price,
      description: validated.description,
    },
  });

  revalidatePath("/admin/services");
  revalidatePath("/");
}

export async function updateService(id: string, formData: FormData) {
  await checkAdmin();

  const rawData = Object.fromEntries(formData.entries());
  const validated = ServiceSchema.parse(rawData);

  await prisma.service.update({
    where: { id },
    data: {
      name: validated.name,
      duration: validated.duration,
      price: validated.price,
      description: validated.description,
    },
  });

  revalidatePath("/admin/services");
  revalidatePath("/");
}

export async function deleteService(id: string) {
  await checkAdmin();
  await prisma.service.delete({
    where: { id },
  });
  revalidatePath("/admin/services");
  revalidatePath("/");
}

export async function getServices() {
  await checkAdmin();
  const services = await prisma.service.findMany({
    orderBy: { createdAt: "desc" },
  });
  return JSON.parse(JSON.stringify(services));
}

// BOOKINGS QUERY (with pagination, filter, search)
export async function getBookings(params: {
  page?: number;
  limit?: number;
  status?: BookingStatusValue | "ALL";
  search?: string;
}) {
  await checkAdmin();
  const page = params.page || 1;
  const limit = params.limit || 15;
  const skip = (page - 1) * limit;

  const where: Prisma.BookingWhereInput = {};

  if (params.status && params.status !== "ALL") {
    where.status = params.status;
  } else {
    // Hide unpaid pending records from booking management views.
    where.status = { not: "PENDING" };
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { startTime: "desc" },
      include: { service: true },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings: JSON.parse(JSON.stringify(bookings)), // Serialize dates
    total,
    pages: Math.ceil(total / limit),
    page,
  };
}

// For scheduler auto-refresh
export async function getAdminBookings() {
  await checkAdmin();
  const bookings = await prisma.booking.findMany({
    where: {
      status: { not: "PENDING" },
    },
    include: { service: true },
    orderBy: { startTime: "asc" },
  });
  return JSON.parse(JSON.stringify(bookings));
}

// BOOKINGS
export async function createBooking(data: {
  serviceId: string;
  customerName: string;
  customerPhone: string;
  startTime: Date;
}) {
  const validated = BookingSchema.parse(data);

  const booking = await prisma.$transaction(async (tx) => {
    await lockBookingWriteScope(tx, validated.serviceId);

    const service = await tx.service.findUnique({
      where: { id: validated.serviceId },
    });

    if (!service) throw new Error("Үйлчилгээ олдсонгүй");

    const startTime = new Date(validated.startTime);
    const endTime = new Date(startTime.getTime() + service.duration * 60000);

    // Re-check availability inside the lock+transaction to avoid double-booking.
    const existingBooking = await tx.booking.findFirst({
      where: {
        status: { not: "CANCELLED" },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (existingBooking) {
      throw new Error(
        "Уучлаарай, энэ цаг саяхан захиалагдсан байна. Өөр цаг сонгоно уу.",
      );
    }

    return tx.booking.create({
      data: {
        serviceId: validated.serviceId,
        customerName: validated.customerName,
        customerPhone: validated.customerPhone,
        startTime: startTime,
        endTime: endTime,
        // Admin manual bookings are immediately valid without online payment.
        status: "CONFIRMED",
      },
    });
  });

  // Consistently revalidate all relevant paths
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/scheduler");
  revalidatePath("/admin");

  return booking;
}

// Combined: Create Booking + Pay in one action
// This is called when public user clicks "Pay" button
// Booking only exists in DB after this function is called
export async function createBookingAndPay(data: {
  serviceId: string;
  customerName: string;
  customerPhone: string;
  startTime: Date;
}) {
  try {
    const validated = BookingSchema.parse(data);

    const bookingResult = await prisma.$transaction(async (tx) => {
      await lockBookingWriteScope(tx, validated.serviceId);

      const service = await tx.service.findUnique({
        where: { id: validated.serviceId },
      });

      if (!service) {
        return { success: false as const, error: "Үйлчилгээ олдсонгүй" };
      }

      const startTime = new Date(validated.startTime);
      const endTime = new Date(startTime.getTime() + service.duration * 60000);
      const activeWindow = new Date(Date.now() - 10 * 60 * 1000); // 10 min

      // Re-check inside transaction after lock to prevent concurrent overlaps.
      const existingBooking = await tx.booking.findFirst({
        where: {
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          OR: [
            { status: { in: ["PAID", "CONFIRMED", "BLOCKED"] } },
            {
              status: "PENDING",
              paymentId: { not: null },
              createdAt: { gte: activeWindow },
            },
          ],
        },
      });

      if (existingBooking) {
        return {
          success: false as const,
          error:
            "Уучлаарай, энэ цаг саяхан захиалагдсан байна. Өөр цаг сонгоно уу.",
        };
      }

      const booking = await tx.booking.create({
        data: {
          serviceId: validated.serviceId,
          customerName: validated.customerName,
          customerPhone: validated.customerPhone,
          startTime,
          endTime,
          status: "PENDING",
        },
      });

      return { success: true as const, booking };
    });

    if (!bookingResult.success) {
      return { success: false, error: bookingResult.error };
    }

    const booking = bookingResult.booking;

    // Create invoice via Bonum
    const invoiceResult = await createBonumInvoice(booking.id);

    if (!invoiceResult.success) {
      // If invoice creation failed, delete the booking so it doesn't block the slot
      await prisma.booking.delete({ where: { id: booking.id } });
      return {
        success: false,
        error: invoiceResult.error || "Төлбөрийн нэхэмжлэх үүсгэж чадсангүй.",
      };
    }

    return { success: true, followUpLink: invoiceResult.followUpLink };
  } catch (err) {
    const error = err as Error;
    console.error("createBookingAndPay error:", error);
    return { success: false, error: `Системд алдаа гарлаа: ${error.message}` };
  }
}

export async function blockSlot(data: {
  serviceId: string;
  startTime: Date;
  duration?: number;
}) {
  await checkAdmin();
  const service = await prisma.service.findUnique({
    where: { id: data.serviceId },
  });
  if (!service) throw new Error("Үйлчилгээ олдсонгүй");

  const startTime = new Date(data.startTime);
  const blockDuration = data.duration || service.duration;
  const endTime = new Date(startTime.getTime() + blockDuration * 60000);

  // Use the same overlap check logic
  const existingBooking = await prisma.booking.findFirst({
    where: {
      status: { not: "CANCELLED" },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });

  // We allow overlapping blocked slots to prevent admin frustration?
  // Wait, no. We throw an error. But maybe allow if it's just blocking?
  // Let's keep the throw for now to prevent true overlaps.
  if (existingBooking)
    throw new Error("Энэ цаг өөр захиалгатай давхцаж байна.");

  // Create the "booking" for BLOCKED
  await prisma.booking.create({
    data: {
      serviceId: data.serviceId,
      customerName: "ЗАВГҮЙ / БЛОК",
      customerPhone: "ADMIN",
      startTime,
      endTime,
      status: "BLOCKED",
    },
  });

  revalidatePath("/admin/scheduler");
  revalidatePath("/admin");
}

export async function updateBookingStatus(id: string, status: string) {
  await checkAdmin();
  if (!isBookingStatus(status)) {
    throw new Error("Захиалгын төлөв буруу байна.");
  }
  await prisma.booking.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/scheduler");
  revalidatePath("/admin");
}

export async function rescheduleBooking(id: string, newStartTime: Date) {
  await checkAdmin();
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: true },
  });

  if (!booking) throw new Error("Захиалга олдсонгүй");
  const endTime = new Date(
    newStartTime.getTime() + booking.service.duration * 60000,
  );

  // Overlap check for rescheduling too
  const existingBooking = await prisma.booking.findFirst({
    where: {
      id: { not: id },
      status: { not: "CANCELLED" },
      OR: [
        {
          startTime: { lt: endTime },
          endTime: { gt: newStartTime },
        },
      ],
    },
  });

  if (existingBooking) {
    throw new Error("Энэ цаг өөр захиалгатай давхцаж байна.");
  }

  await prisma.booking.update({
    where: { id },
    data: {
      startTime: newStartTime,
      endTime: endTime,
    },
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/scheduler");
  revalidatePath("/admin");
}

// WORKING HOURS
export async function updateAllWorkingHours(formData: FormData) {
  await checkAdmin();
  const updates = [];

  for (let i = 0; i < 7; i++) {
    const startTime = formData.get(`startTime_${i}`) as string;
    const endTime = formData.get(`endTime_${i}`) as string;
    const isActive = formData.get(`isActive_${i}`) === "on";

    if (startTime && endTime) {
      updates.push(
        prisma.workingHours.upsert({
          where: { dayOfWeek: i },
          update: { startTime, endTime, isActive },
          create: { dayOfWeek: i, startTime, endTime, isActive },
        }),
      );
    }
  }

  // Senior Fix: Use Transaction for atomic mass updates
  await prisma.$transaction(updates);

  revalidatePath("/admin/settings");
}

export async function getAvailableSlots(
  date: Date,
  serviceId: string,
  isAdmin: boolean = false,
) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });
  if (!service) return [];

  // Ensure we are looking at the correct day of week in local time
  const dayOfWeek = date.getDay();
  const workingHours = await prisma.workingHours.findUnique({
    where: { dayOfWeek },
  });

  // If no working hours or not active, return empty
  if (!workingHours || !workingHours.isActive) return [];

  // CLEANUP: Delete very old PENDING bookings that never clicked "Pay"
  // to keep the database and admin dashboard clean.
  const cleanupTime = new Date(Date.now() - 30 * 60 * 1000); // 30 mins
  try {
    await prisma.booking.deleteMany({
      where: {
        status: "PENDING",
        paymentId: null,
        createdAt: { lt: cleanupTime },
      },
    });
  } catch (e) {
    console.error("Cleanup error:", e);
  }

  const activeWindow = new Date(Date.now() - 15 * 60 * 1000); // 15 minute window

  const bookings = await prisma.booking.findMany({
    where: {
      startTime: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
      OR: [
        { status: "PAID" },
        { status: "CONFIRMED" },
        { status: "BLOCKED" },
        {
          status: "PENDING",
          paymentId: { not: null }, // Only block if they actually clicked "Pay" (and thus generated an invoice)
          createdAt: { gte: activeWindow },
        },
      ],
    },
  });

  const slots = [];
  const [startHour, startMin] = workingHours.startTime.split(":").map(Number);
  const [endHour, endMin] = workingHours.endTime.split(":").map(Number);

  // Use the date object passed from client but set explicit hours in local time
  let currentSlot = new Date(date);
  currentSlot.setHours(startHour, startMin, 0, 0);

  const endLimit = new Date(date);
  endLimit.setHours(endHour, endMin, 0, 0);

  const now = new Date();
  const bufferTime = isAdmin ? now : addMinutes(now, 120); // 2 hour buffer for public

  while (isBefore(currentSlot, endLimit)) {
    const slotEnd = addMinutes(currentSlot, service.duration);

    if (isBefore(endLimit, slotEnd)) break;

    // Check if slot is in the past or within buffer (if not admin)
    const isPastOrBuffered = isBefore(currentSlot, bufferTime);

    const isOccupied = bookings.some((booking) => {
      const bStart = new Date(booking.startTime);
      const bEnd = new Date(booking.endTime);
      // Overlap check
      return currentSlot < bEnd && slotEnd > bStart;
    });

    if (!isOccupied && !isPastOrBuffered) {
      slots.push(new Date(currentSlot));
    }

    currentSlot = addMinutes(currentSlot, 30); // 30 min intervals
  }

  return slots;
}

// BUSINESS SETTINGS
export async function updateBusinessSettings(formData: FormData) {
  await checkAdmin();
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;

  await prisma.businessSettings.upsert({
    where: { id: "singleton" },
    update: { phone, address },
    create: { id: "singleton", phone, address },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
}

export async function getBusinessSettings() {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "singleton" },
  });

  if (!settings) {
    return {
      phone: "98118008",
      address:
        'СБД 1-р хороо, 5-р хороолол 14251, Чингисийн өргөн чөлөө. "Бизнес плаза" төв. 302 тоот өрөө.',
    };
  }

  return settings;
}

// BONUM PAYMENT INTEGRATION
const BONUM_TERMINAL_ID = process.env.BONUM_TERMINAL_ID || "17172267";
const BONUM_SECRET_KEY = process.env.BONUM_SECRET_KEY;
const BONUM_BASE_URL = "https://apis.bonum.mn";

import crypto from "crypto";

function getBonumSecretKey() {
  if (!BONUM_SECRET_KEY) {
    throw new Error("BONUM_SECRET_KEY is missing in environment variables.");
  }
  return BONUM_SECRET_KEY;
}

function generateChecksum(body: Record<string, unknown>): string {
  const rawBody = JSON.stringify(body);
  return crypto
    .createHmac("sha256", getBonumSecretKey())
    .update(rawBody)
    .digest("hex");
}

export async function createBonumInvoice(bookingId: string) {
  console.log(`Starting Bonum invoice creation for booking: ${bookingId}`);
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });

    if (!booking) {
      console.error(`Booking not found: ${bookingId}`);
      return { success: false, error: "Захиалга олдсонгүй" };
    }

    // 1. Get Access Token
    console.log("Fetching Bonum access token...");
    const authRes = await fetch(
      `${BONUM_BASE_URL}/bonum-gateway/ecommerce/auth/create`,
      {
        method: "GET",
        headers: {
          Authorization: `AppSecret ${getBonumSecretKey()}`,
          "X-TERMINAL-ID": BONUM_TERMINAL_ID,
        },
        cache: "no-store",
      },
    );

    if (!authRes.ok) {
      const errorText = await authRes.text();
      console.error("Bonum Auth error response:", errorText);
      return {
        success: false,
        error: `Төлбөрийн системд нэвтэрч чадсангүй (${authRes.status})`,
      };
    }

    const authData = await authRes.json();
    const accessToken = authData.accessToken || authData.body?.accessToken;

    if (!accessToken) {
      console.error("Bonum Auth failed: No accessToken in response", authData);
      return {
        success: false,
        error: "Төлбөрийн системээс зөвшөөрөл авч чадсангүй.",
      };
    }

    // 2. Create Invoice
    const headersList = await headers();
    const host = headersList.get("host") || "capullo-production.up.railway.app";
    const forwardedHost = headersList.get("x-forwarded-host");
    const protocol = headersList.get("x-forwarded-proto") || "https";

    const actualHost = forwardedHost || host;

    // Determine baseUrl
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!baseUrl || baseUrl === "") {
      // If no ENV, detect from headers but be careful with localhost in production
      if (
        actualHost.includes("localhost") ||
        actualHost.includes("127.0.0.1") ||
        actualHost.includes("8080")
      ) {
        // If we detect 8080 or localhost but it's likely production, fallback to production URL
        if (forwardedHost && !forwardedHost.includes("localhost")) {
          baseUrl = `https://${forwardedHost}`;
        } else {
          baseUrl = actualHost.includes("localhost")
            ? `http://${actualHost}`
            : `https://capullo-production.up.railway.app`;
        }
      } else {
        baseUrl = `${protocol}://${actualHost}`;
      }
    }

    // Final safety: if we are still seeing localhost but we have a production-like host or it's not localhost
    if (baseUrl.includes("localhost") && !actualHost.includes("localhost")) {
      baseUrl = `https://capullo-production.up.railway.app`;
    }

    console.log(`Using Base URL for callbacks: ${baseUrl}`);

    const body = {
      amount: booking.service.price,
      callback: `${baseUrl}/api/webhook/bonum?bookingId=${booking.id}`,
      redirectUri: `${baseUrl}/book/success/${booking.id}`,
      redirectUrl: `${baseUrl}/book/success/${booking.id}`,
      returnUrl: `${baseUrl}/book/success/${booking.id}`,
      transactionId: booking.id,
      expiresIn: 3600,
      items: [
        {
          title: booking.service.name,
          remark: `${booking.customerName} - ${booking.customerPhone}`,
          image: "https://capullo.mn/logo.png",
          amount: booking.service.price,
          count: 1,
        },
      ],
    };

    const checksum = generateChecksum(body);

    console.log("Creating Bonum invoice...");
    const invoiceRes = await fetch(
      `${BONUM_BASE_URL}/bonum-gateway/ecommerce/invoices`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "x-checksum-v2": checksum,
        },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );

    if (!invoiceRes.ok) {
      const errorText = await invoiceRes.text();
      console.error("Bonum Invoice creation error response:", errorText);
      return {
        success: false,
        error: `Нэхэмжлэх үүсгэж чадсангүй (${invoiceRes.status})`,
      };
    }

    const invoiceData = await invoiceRes.json();
    // Handle both direct and nested response structure
    const followUpLink =
      invoiceData.followUpLink || invoiceData.body?.followUpLink;
    const invoiceId =
      invoiceData.invoiceId || invoiceData.body?.invoiceId || invoiceData.id;

    if (!followUpLink) {
      console.error("Bonum response missing followUpLink:", invoiceData);
      return {
        success: false,
        error: "Төлбөрийн холбоос хүлээн авч чадсангүй.",
      };
    }

    // Update booking with invoice ID for tracking
    console.log(`Updating booking ${bookingId} with invoiceId: ${invoiceId}`);
    await prisma.booking.update({
      where: { id: bookingId },
      data: { paymentId: String(invoiceId) },
    });

    // Store booking ID in cookie for redirect fallback
    try {
      const c = await cookies();
      c.set("pendingBookingId", bookingId, {
        maxAge: 3600, // 1 hour
        httpOnly: true,
        secure: true, // Always secure in production/Railway
        sameSite: "lax",
      });
    } catch (cookieErr) {
      console.warn("Failed to set pendingBookingId cookie:", cookieErr);
    }

    console.log("Invoice created successfully, returning link.");
    return { success: true, followUpLink };
  } catch (err) {
    const error = err as Error;
    console.error("Unexpected error in createBonumInvoice:", error);
    return { success: false, error: `Системд алдаа гарлаа: ${error.message}` };
  }
}
