/**
 * Bonum Gateway – callback (webhook) handler.
 * API баримт: https://documenter.getpostman.com/view/6164222/2sB2cYbzu8#ed5dd085-090d-42c3-8d13-e0208d56c015
 *
 * Одоогоор ашиглаж буй талбарууд:
 * - Илгээлт: x-checksum-v2 (HMAC-SHA256, raw body)
 * - Төлөв: status, body.status, payment_status, result
 * - ID: transactionId, orderId, id, referenceId, transaction_id, invoiceId, paymentId
 * Баримтаас өөр талбар нэр гарвал энд нэмнэ.
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

    // 1. Verify Checksum
    const incomingChecksum = req.headers.get("x-checksum-v2");

    console.log("--- Bonum Webhook raw request ---");
    console.log("URL:", req.url);
    try {
      console.log("Parsed URL search params:", Object.fromEntries(new URL(req.url).searchParams.entries()));
    } catch (urlErr) {
      console.warn("Could not parse request URL for search params", urlErr);
    }
    console.log("Raw body:", rawBody);

    if (!isValidChecksum(incomingChecksum, rawBody)) {
      console.warn("Bonum Webhook rejected: invalid checksum", { incomingChecksum });
      return NextResponse.json({ error: "Invalid checksum" }, { status: 401 });
    }

    // Capture various possible status and ID fields (Bonum may use different shapes)
    const topStatus = (body.status ?? body.result ?? "").toString().toUpperCase();
    const bodyStatus = (
      body.body?.status ??
      body.payment_status ??
      body.body?.paymentStatus ??
      ""
    )
      .toString()
      .toUpperCase();

    // Retrieve callback query param fallback from createBonumInvoice callback URL
    const callbackParams = new URL(req.url).searchParams;
    const callbackBookingId = callbackParams.get("bookingId");

    // Transaction/order ID we sent; Bonum may echo it under different keys
    const callbackBookingId = new URL(req.url).searchParams.get("bookingId");
    const candidateIds = [
      callbackBookingId,
      body.transactionId,
      body.body?.transactionId,
      body.orderId,
      body.body?.orderId,
      body.referenceId,
      body.body?.referenceId,
      body.transaction_id,
      body.body?.transaction_id,
      body.ref,
      body.body?.ref,
      body.invoiceId,
      body.body?.invoiceId,
      body.paymentId,
      body.body?.paymentId,
      body.id,
      body.body?.id,
    ].filter((id) => !!id) as string[];

    const transactionId = candidateIds[0] || null;
    const invoiceId = body.invoiceId || body.body?.invoiceId || body.paymentId || body.body?.paymentId || body.id || body.body?.id;

    console.log(
      `Bonum Webhook Data: topStatus=${topStatus}, bodyStatus=${bodyStatus}, transactionId=${transactionId}, invoiceId=${invoiceId}, callbackBookingId=${callbackBookingId}`,
    );

    // Check if status indicates success (Bonum may use SUCCESS, PAID, COMPLETED, 0, 1, DONE etc.)
    const successStatusSet = ["SUCCESS", "PAID", "COMPLETED", "0", "1", "DONE"];
    const failureStatusSet = ["FAILED", "FAIL", "ERROR", "CANCELLED", "DECLINED"];

    const isSuccess =
      successStatusSet.includes(topStatus) ||
      successStatusSet.includes(bodyStatus) ||
      (body.type?.toString().toUpperCase() === "PAYMENT" && topStatus === "SUCCESS") ||
      (body.type?.toString().toUpperCase() === "CARD-TOKEN" && topStatus === "SUCCESS") ||
      (body.body?.status?.toString().toUpperCase() === "SUCCESS") ||
      (body.body?.status?.toString().toUpperCase() === "PAID");

    const isFailure =
      failureStatusSet.includes(topStatus) ||
      failureStatusSet.includes(bodyStatus) ||
      (body.type?.toString().toUpperCase() === "PAYMENT" && topStatus === "FAILED");

    // Use callback bookingId (from query), transactionId (our booking id), or invoiceId (Bonum id we store in booking.paymentId)
    const idToSearch = transactionId
      ? String(transactionId)
      : invoiceId
        ? String(invoiceId)
        : null;

    if (isSuccess && idToSearch) {
      console.log(
        `Processing successful payment for id: ${idToSearch}`,
      );

      const booking = await prisma.booking.findUnique({
        where: { id: idToSearch },
      });

      if (!booking) {
        console.error(
          `Bonum Webhook: Booking ${idToSearch} not found. Attempting paymentId fallback.`,
        );
        const bookingByPaymentId = await prisma.booking.findFirst({
          where: { paymentId: idToSearch },
        });

        if (bookingByPaymentId) {
          console.log(`Found booking by paymentId: ${bookingByPaymentId.id}`);
          await prisma.booking.update({
            where: { id: bookingByPaymentId.id },
            data: { status: "PAID" },
          });
          revalidatePath("/admin/bookings");
          revalidatePath("/admin/scheduler");
          revalidatePath(`/book/success/${bookingByPaymentId.id}`);
          return NextResponse.json({
            success: true,
            from: "paymentId_fallback",
          });
        }

        console.error(`Bonum Webhook: No booking found for ID ${idToSearch}`);
        return NextResponse.json(
          { error: "No booking found" },
          { status: 404 },
        );
      }

      if (booking.status === "PAID") {
        console.log(`Booking ${idToSearch} is already PAID.`);
        revalidatePath(`/book/success/${idToSearch}`);
        return NextResponse.json({ success: true, message: "Already paid" });
      }

      await prisma.booking.update({
        where: { id: idToSearch },
        data: {
          status: "PAID",
          paymentId: invoiceId
            ? String(invoiceId)
            : booking.paymentId || String(transactionId),
        },
      });

      console.log(`✅ Bonum Webhook: Booking ${idToSearch} marked as PAID`);

      revalidatePath("/admin/bookings");
      revalidatePath("/admin/scheduler");
      revalidatePath("/");
      revalidatePath(`/book/success/${idToSearch}`);
    } else if (isFailure && idToSearch) {
      console.warn(`Bonum Webhook: Payment failed for ${idToSearch}, cancel pending booking if exists.`);
      const booking = await prisma.booking.findUnique({ where: { id: idToSearch } });
      if (booking && booking.status === "PENDING") {
        await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
        revalidatePath("/admin/bookings");
        revalidatePath("/admin/scheduler");
        revalidatePath(`/book/success/${booking.id}`);
      } else if (!booking) {
        const bookingByPaymentId = await prisma.booking.findFirst({ where: { paymentId: idToSearch } });
        if (bookingByPaymentId && bookingByPaymentId.status === "PENDING") {
          await prisma.booking.update({ where: { id: bookingByPaymentId.id }, data: { status: "CANCELLED" } });
          revalidatePath("/admin/bookings");
          revalidatePath("/admin/scheduler");
          revalidatePath(`/book/success/${bookingByPaymentId.id}`);
        }
      }
      return NextResponse.json({ success: true, message: "Payment failed, pending booking cancelled" });
    } else {
      // Баримттай шалгахад: Bonum яг ямар status/ID талбар илгээж байгааг харах
      console.warn(
        `⚠️ Bonum Webhook: Success conditions not met. isSuccess=${isSuccess}, idToSearch=${idToSearch}`,
      );
      if (process.env.NODE_ENV !== "production") {
        const topKeys = Object.keys(body).join(", ");
        const innerKeys = typeof body.body === "object" && body.body ? Object.keys(body.body).join(", ") : "";
        console.info("Bonum webhook body keys (top):", topKeys, innerKeys ? "; (body.): " + innerKeys : "");
      }
    }

    console.log("--- Bonum Webhook End ---");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bonum Webhook Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
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
    searchParams.get("order_id") ||
    searchParams.get("orderId") ||
    searchParams.get("invoiceId") ||
    pendingIdFromCookie;

  if (transactionId) {
    // If we used the cookie, we can clear it now
    if (
      !searchParams.get("bookingId") &&
      pendingIdFromCookie === transactionId
    ) {
      c.delete("pendingBookingId");
    }

    const idToSearch = String(transactionId);
    const bookingById = await prisma.booking.findUnique({
      where: { id: idToSearch },
      select: { id: true, status: true },
    });
    const bookingByPaymentId = bookingById
      ? null
      : await prisma.booking.findFirst({
          where: { paymentId: idToSearch },
          select: { id: true, status: true },
        });

    const booking = bookingById || bookingByPaymentId;

    const headersList = await headers();
    const host =
      headersList.get("x-forwarded-host") ||
      headersList.get("host") ||
      "capullo-production.up.railway.app";
    const protocol = headersList.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;

    if (!booking) {
      return NextResponse.redirect(new URL("/", baseUrl));
    }

    // Always send user to success page. If not yet PAID, success page shows
    // waiting state and polls until webhook sets PAID (avoids showing payment form again).
    const redirectPath = `/book/success/${booking.id}`;
    const redirectUrl = new URL(redirectPath, baseUrl);

    // Safety check for localhost in production
    if (
      redirectUrl.hostname.includes("localhost") &&
      !host.includes("localhost")
    ) {
      redirectUrl.host = "capullo-production.up.railway.app";
      redirectUrl.protocol = "https:";
    }

    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.json({
    message: "Bonum Webhook is active. Use POST for actual payment data.",
    receivedParams: Object.fromEntries(searchParams.entries()),
    hasCookie: !!pendingIdFromCookie,
  });
}
