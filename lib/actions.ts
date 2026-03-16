"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { addMinutes, startOfDay, endOfDay, isBefore } from "date-fns";

import { Prisma } from "@prisma/client";

import { auth } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";

import { ServiceSchema, BookingSchema } from "@/lib/schema";

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
  status?: string;
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
    // Default: only CONFIRMED, PAID, BLOCKED (no PENDING)
    where.status = { in: ["CONFIRMED", "PAID", "BLOCKED"] };
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { customerName: { contains: q } },
      { customerPhone: { contains: q } },
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

// For scheduler auto-refresh - only CONFIRMED, PAID, BLOCKED
export async function getAdminBookings() {
  await checkAdmin();
  const bookings = await prisma.booking.findMany({
    where: { status: { in: ["CONFIRMED", "PAID", "BLOCKED"] } },
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

  const service = await prisma.service.findUnique({
    where: { id: validated.serviceId },
  });

  if (!service) throw new Error("Үйлчилгээ олдсонгүй");

  const startTime = new Date(validated.startTime);
  const endTime = new Date(startTime.getTime() + service.duration * 60000);

  // Server-side: prevent double booking
  const existingBooking = await prisma.booking.findFirst({
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

  const booking = await prisma.booking.create({
    data: {
      serviceId: validated.serviceId,
      customerName: validated.customerName,
      customerPhone: validated.customerPhone,
      startTime: startTime,
      endTime: endTime,
      status: "CONFIRMED", // Admin manual booking = CONFIRMED
    },
    include: { service: true },
  });

  // Consistently revalidate all relevant paths
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/scheduler");
  revalidatePath("/admin");

  return JSON.parse(JSON.stringify(booking));
}

// Create payment session and redirect to Bonum (NO booking until payment succeeds)
// Booking is created only when Bonum webhook confirms SUCCESS
export async function createBookingAndPay(data: {
  serviceId: string;
  customerName: string;
  customerPhone: string;
  startTime: Date;
}) {
  try {
    const validated = BookingSchema.parse(data);

    const service = await prisma.service.findUnique({
      where: { id: validated.serviceId },
    });

    if (!service) {
      return { success: false, error: "Үйлчилгээ олдсонгүй" };
    }

    const startTime = new Date(validated.startTime);
    const endTime = new Date(startTime.getTime() + service.duration * 60000);

    // Check slot is free (only PAID, CONFIRMED, BLOCKED block slots)
    const existingBooking = await prisma.booking.findFirst({
      where: {
        status: { in: ["PAID", "CONFIRMED", "BLOCKED"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (existingBooking) {
      return {
        success: false,
        error:
          "Уучлаарай, энэ цаг саяхан захиалагдсан байна. Өөр цаг сонгоно уу.",
      };
    }

    // Create PendingPayment (no booking yet - booking created on webhook SUCCESS)
    const pending = await prisma.pendingPayment.create({
      data: {
        serviceId: validated.serviceId,
        customerName: validated.customerName,
        customerPhone: validated.customerPhone,
        startTime,
      },
    });

    const invoiceResult = await createBonumInvoiceFromPending(pending.id);

    if (!invoiceResult.success) {
      await prisma.pendingPayment.delete({ where: { id: pending.id } });
      return {
        success: false,
        error: invoiceResult.error || "Төлбөрийн нэхэмжлэх үүсгэж чадсангүй.",
      };
    }

    const link = (invoiceResult as { success: true; followUpLink: string })
      .followUpLink;
    return { success: true, followUpLink: link };
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

  // Only PAID, CONFIRMED, BLOCKED occupy slots (no PENDING)
  const bookings = await prisma.booking.findMany({
    where: {
      startTime: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
      status: { in: ["PAID", "CONFIRMED", "BLOCKED"] },
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
const BONUM_TERMINAL_ID = "17172267";
const BONUM_SECRET_KEY =
  "1fc53f9389f489ff6e04617bd6338a710e1e7c579cb572aec421f560f363119c0e0039e4b765e53c5339c1e6c7727985a488ab4ac8141140571256af36c3f410421b2ff278fb499b10e3bdb7d3236212";
const BONUM_BASE_URL = "https://apis.bonum.mn";

import crypto from "crypto";

function generateChecksum(body: Record<string, unknown>): string {
  const rawBody = JSON.stringify(body);
  return crypto
    .createHmac("sha256", BONUM_SECRET_KEY)
    .update(rawBody)
    .digest("hex");
}

// Create Bonum invoice from PendingPayment (no booking yet - created on webhook SUCCESS)
export async function createBonumInvoiceFromPending(pendingPaymentId: string) {
  const pending = await prisma.pendingPayment.findUnique({
    where: { id: pendingPaymentId },
  });
  if (!pending) {
    return { success: false, error: "Төлбөрийн сесс олдсонгүй" };
  }
  const service = await prisma.service.findUnique({
    where: { id: pending.serviceId },
  });
  if (!service) {
    return { success: false, error: "Үйлчилгээ олдсонгүй" };
  }
  return createBonumInvoiceInternal({
    transactionId: pending.id,
    amount: service.price,
    serviceName: service.name,
    customerName: pending.customerName,
    customerPhone: pending.customerPhone,
    redirectPath: `/book/success?ps=${pending.id}`,
    callbackParam: `paymentSessionId=${pending.id}`,
    cookieKey: "pendingPaymentId",
    cookieValue: pending.id,
  });
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

    return createBonumInvoiceInternal({
      transactionId: booking.id,
      amount: booking.service.price,
      serviceName: booking.service.name,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      redirectPath: `/book/success/${booking.id}`,
      callbackParam: `bookingId=${booking.id}`,
      cookieKey: "pendingBookingId",
      cookieValue: booking.id,
      bookingIdForPaymentUpdate: booking.id,
    });
  } catch (err) {
    const error = err as Error;
    console.error("Unexpected error in createBonumInvoice:", error);
    return { success: false, error: `Системд алдаа гарлаа: ${error.message}` };
  }
}

async function createBonumInvoiceInternal(params: {
  transactionId: string;
  amount: number;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  redirectPath: string;
  callbackParam: string;
  cookieKey: string;
  cookieValue: string;
  bookingIdForPaymentUpdate?: string;
}) {
  const {
    transactionId,
    amount,
    serviceName,
    customerName,
    customerPhone,
    redirectPath,
    callbackParam,
    cookieKey,
    cookieValue,
    bookingIdForPaymentUpdate,
  } = params;

  const authRes = await fetch(
    `${BONUM_BASE_URL}/bonum-gateway/ecommerce/auth/create`,
    {
      method: "GET",
      headers: {
        Authorization: `AppSecret ${BONUM_SECRET_KEY}`,
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

  const headersList = await headers();
  const host = headersList.get("host") || "capullo-production.up.railway.app";
  const forwardedHost = headersList.get("x-forwarded-host");
  const protocol = headersList.get("x-forwarded-proto") || "https";
  const actualHost = forwardedHost || host;

  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl || baseUrl === "") {
    if (
      actualHost.includes("localhost") ||
      actualHost.includes("127.0.0.1") ||
      actualHost.includes("8080")
    ) {
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
  if (baseUrl.includes("localhost") && !actualHost.includes("localhost")) {
    baseUrl = `https://capullo-production.up.railway.app`;
  }

  const body = {
    amount,
    callback: `${baseUrl}/api/webhook/bonum?${callbackParam}`,
    redirectUri: `${baseUrl}${redirectPath}`,
    redirectUrl: `${baseUrl}${redirectPath}`,
    returnUrl: `${baseUrl}${redirectPath}`,
    transactionId,
    expiresIn: 3600,
    items: [
      {
        title: serviceName,
        remark: `${customerName} - ${customerPhone}`,
        image: "https://capullo.mn/logo.png",
        amount,
        count: 1,
      },
    ],
  };

  const checksum = generateChecksum(body);

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

  if (bookingIdForPaymentUpdate) {
    await prisma.booking.update({
      where: { id: bookingIdForPaymentUpdate },
      data: { paymentId: String(invoiceId) },
    });
  }

  try {
    const c = await cookies();
    c.set(cookieKey, cookieValue, {
      maxAge: 3600,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
  } catch (cookieErr) {
    console.warn(`Failed to set ${cookieKey} cookie:`, cookieErr);
  }

  return { success: true, followUpLink };
}
