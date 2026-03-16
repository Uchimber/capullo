/**
 * Bonum Gateway – callback (webhook) handler.
 * API баримт: https://documenter.getpostman.com/view/6164222/2sB2cYbzu8#ed5dd085-090d-42c3-8d13-e0208d56c015
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";

const BONUM_SECRET_KEY = process.env.BONUM_SECRET_KEY;

function getBonumSecretKey() {
  if (!BONUM_SECRET_KEY) {
    throw new Error("BONUM_SECRET_KEY is missing in environment variables.");
  }
  return BONUM_SECRET_KEY;
}

function isValidChecksum(incoming: string | null, rawBody: string) {
  if (!incoming) return false;
  const expected = crypto
    .createHmac("sha256", getBonumSecretKey())
    .update(rawBody)
    .digest("hex");

  const incomingBuf = Buffer.from(incoming, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (incomingBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(incomingBuf, expectedBuf);
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    console.log("--- Bonum Webhook Start ---");

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error("Bonum Webhook: Body is not JSON");
      return NextResponse.json({ error: "Body is not JSON" }, { status: 400 });
    }

    const incomingChecksum = req.headers.get("x-checksum-v2");

    if (!isValidChecksum(incomingChecksum, rawBody)) {
      console.warn("Bonum Webhook rejected: invalid checksum");
      return NextResponse.json({ error: "Invalid checksum" }, { status: 401 });
    }

    const topStatus = (body.status ?? body.result ?? "").toString().toUpperCase();
    const bodyStatus = (body.body?.status ?? body.payment_status ?? "").toString().toUpperCase();

    const url = new URL(req.url);
    const transactionId = url.searchParams.get("transactionId") || body.transactionId || body.body?.transactionId;

    const successStatusSet = ["SUCCESS", "PAID", "COMPLETED", "0", "1", "DONE"];
    const isSuccess = successStatusSet.includes(topStatus) || successStatusSet.includes(bodyStatus);

    if (isSuccess && transactionId) {
      console.log(`Processing successful payment for transactionId: ${transactionId}`);

      let booking = await prisma.booking.findFirst({
        where: { paymentId: transactionId },
      });

      if (booking) {
        console.log(`Booking for transactionId ${transactionId} already exists: ${booking.id}`);
        if (booking.status !== "PAID") {
          await prisma.booking.update({
            where: { id: booking.id },
            data: { status: "PAID" },
          });
        }
      } else {
        const serviceId = url.searchParams.get("serviceId");
        const customerName = url.searchParams.get("customerName");
        const customerPhone = url.searchParams.get("customerPhone");
        const startTimeStr = url.searchParams.get("startTime");

        if (!serviceId || !customerName || !customerPhone || !startTimeStr) {
          console.error("Missing booking details in webhook URL query params");
          return NextResponse.json({ error: "Missing booking details" }, { status: 400 });
        }

        const service = await prisma.service.findUnique({ where: { id: serviceId } });
        if (!service) {
          return NextResponse.json({ error: "Service not found" }, { status: 404 });
        }

        const startTime = new Date(startTimeStr);
        const endTime = new Date(startTime.getTime() + service.duration * 60000);

        booking = await prisma.booking.create({
          data: {
            serviceId,
            customerName,
            customerPhone,
            startTime,
            endTime,
            status: "PAID",
            paymentId: transactionId,
          },
        });
        console.log(`✅ Created new PAID booking: ${booking.id}`);
      }

      revalidatePath("/admin/bookings");
      revalidatePath("/admin/scheduler");
      revalidatePath("/");
      revalidatePath(`/book/success/${transactionId}`);
    }

    console.log("--- Bonum Webhook End ---");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bonum Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const c = await cookies();
  const pendingIdFromCookie = c.get("pendingBookingId")?.value;

  const transactionId =
    searchParams.get("bookingId") ||
    searchParams.get("transactionId") ||
    searchParams.get("id") ||
    searchParams.get("invoiceId") ||
    pendingIdFromCookie;

  if (transactionId) {
    if (pendingIdFromCookie === transactionId) {
      c.delete("pendingBookingId");
    }

    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host") || "capullo-production.up.railway.app";
    const protocol = headersList.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;

    // Redirect to success page even if booking doesn't exist yet.
    // The success page will handle the "waiting" state.
    const redirectUrl = new URL(`/book/success/${transactionId}`, baseUrl);
    
    // Safety check for localhost in production
    if (redirectUrl.hostname.includes("localhost") && !host.includes("localhost")) {
      redirectUrl.host = "capullo-production.up.railway.app";
      redirectUrl.protocol = "https:";
    }

    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.json({
    message: "Bonum Webhook is active. Use POST for actual payment data.",
  });
}
