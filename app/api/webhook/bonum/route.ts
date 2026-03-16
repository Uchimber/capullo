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
    if (!isValidChecksum(incomingChecksum, rawBody)) {
      console.warn("Bonum Webhook rejected: invalid checksum");
      return NextResponse.json({ error: "Invalid checksum" }, { status: 401 });
    }

    // Capture various possible status and ID fields based on documentation
    const topStatus = (body.status || "").toString().toUpperCase();
    const bodyStatus = (body.body?.status || body.payment_status || "")
      .toString()
      .toUpperCase();

    // The actual "transactionId" is what we send as "transactionId" or "id"
    const transactionId =
      body.transactionId ||
      body.body?.transactionId ||
      body.orderId ||
      body.body?.orderId ||
      body.id ||
      body.body?.id;
    const invoiceId =
      body.invoiceId || body.body?.invoiceId || body.paymentId || body.id;

    console.log(
      `Bonum Webhook Data: topStatus=${topStatus}, bodyStatus=${bodyStatus}, transactionId=${transactionId}`,
    );

    // Check if status indicates success. Bonum often sends top-level SUCCESS and inner PAID.
    const isSuccess =
      ["SUCCESS", "PAID", "COMPLETED", "0"].includes(topStatus) ||
      ["PAID", "SUCCESS", "0"].includes(bodyStatus);

    if (isSuccess && transactionId) {
      console.log(
        `Processing successful payment for transaction: ${transactionId}`,
      );

      // Ensure we treat the ID as a string for the query
      const idToSearch = String(transactionId);

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
    } else {
      console.warn(
        `⚠️ Bonum Webhook: Success conditions not met. isSuccess=${isSuccess}, transId=${transactionId}`,
      );
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
