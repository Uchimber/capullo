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

    // Bonum webhook body: { type: "PAYMENT", status: "SUCCESS"|"FAILED", body: { invoiceId, transactionId } }
    const topStatus = (body.status ?? body.result ?? "").toString().toUpperCase();
    const bodyStatus = (body.body?.status ?? body.payment_status ?? body.body?.payment_status ?? "").toString().toUpperCase();

    const url = new URL(req.url);
    // body.transactionId = our transactionId (passed when creating invoice)
    const transactionId =
      body.body?.transactionId ??
      body.transactionId ??
      url.searchParams.get("transactionId") ??
      body.body?.transaction_id ??
      body.transaction_id ??
      body.body?.invoiceId ??
      body.invoiceId ??
      body.body?.orderId ??
      body.orderId;

    const successStatusSet = ["SUCCESS", "PAID", "COMPLETED", "0", "1", "DONE"];
    const isSuccess = successStatusSet.includes(topStatus) || successStatusSet.includes(bodyStatus);

    if (!transactionId && isSuccess) {
      console.warn("Bonum Webhook: success but no transactionId. Body:", JSON.stringify(body).slice(0, 500));
    }

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
        // Bonum only sends body.transactionId + body.invoiceId; no serviceId etc.
        // Look up PendingTransaction (saved when we created the invoice).
        const pending = await prisma.pendingTransaction.findUnique({
          where: { transactionId },
        });

        if (pending) {
          const service = await prisma.service.findUnique({ where: { id: pending.serviceId } });
          if (!service) {
            console.error(`Service not found: ${pending.serviceId}`);
            return NextResponse.json({ error: "Service not found" }, { status: 404 });
          }

          const startTime = new Date(pending.startTime);
          const endTime = new Date(startTime.getTime() + service.duration * 60000);

          booking = await prisma.booking.create({
            data: {
              serviceId: pending.serviceId,
              customerName: pending.customerName,
              customerPhone: pending.customerPhone,
              startTime,
              endTime,
              status: "PAID",
              paymentId: transactionId,
            },
          });
          await prisma.pendingTransaction.delete({ where: { transactionId } });
          console.log(`✅ Created new PAID booking: ${booking.id}`);
        } else {
          // Fallback: URL params (if Bonum used our callback URL with params)
          const serviceId = url.searchParams.get("serviceId") || body.serviceId || body.body?.serviceId;
          const customerName = url.searchParams.get("customerName") || body.customerName || body.body?.customerName;
          const customerPhone = url.searchParams.get("customerPhone") || body.customerPhone || body.body?.customerPhone;
          const startTimeStr = url.searchParams.get("startTime") || body.startTime || body.body?.startTime || body.paidAt || body.body?.paidAt;

          if (!serviceId || !customerName || !customerPhone || !startTimeStr) {
            console.error("Missing booking details. No PendingTransaction and no URL/body params. Body:", JSON.stringify(body).slice(0, 500));
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
          console.log(`✅ Created new PAID booking (from URL params): ${booking.id}`);
        }
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
