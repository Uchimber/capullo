import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

const BONUM_SECRET_KEY = "1fc53f9389f489ff6e04617bd6338a710e1e7c579cb572aec421f560f363119c0e0039e4b765e53c5339c1e6c77279854b20e998ed4599983a9c9dba12b36e89ce7ee7659043ebffcf77a095587bf694";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const headers = Object.fromEntries(req.headers.entries());
    console.log('--- Bonum Webhook Start ---');
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('Raw Body:', rawBody);
    
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error('Bonum Webhook: Body is not JSON');
      return NextResponse.json({ error: 'Body is not JSON' }, { status: 400 });
    }
    
    // 1. Verify Checksum
    const incomingChecksum = req.headers.get('x-checksum-v2');
    const calculatedChecksum = crypto
      .createHmac('sha256', BONUM_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    if (incomingChecksum !== calculatedChecksum) {
      console.error('Bonum Webhook: Invalid Checksum. Expected:', calculatedChecksum, 'Received:', incomingChecksum);
      // Even if checksum fails, we might still want to log it but technically we should reject for security
      return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
    }

    // Capture various possible status and ID fields based on documentation
    const topLevelStatus = (body.status || '').toString().toUpperCase();
    const innerBody = body.body || {};
    const status = (innerBody.status || body.payment_status || '').toString().toUpperCase();
    const transactionId = innerBody.transactionId || body.transactionId || body.orderId || body.id || body.bookingId;
    const invoiceId = innerBody.invoiceId || body.invoiceId || body.id;

    console.log(`Bonum Webhook processing: topStatus=${topLevelStatus}, status=${status}, transactionId=${transactionId}`);

    // Check if status is PAID or topLevel is SUCCESS (depending on how Bonum triggers this)
    if ((status === 'PAID' || topLevelStatus === 'SUCCESS') && transactionId) {
      // Find the booking first to make sure it exists
      const booking = await prisma.booking.findUnique({
        where: { id: transactionId }
      });

      if (!booking) {
        console.error(`Bonum Webhook: Booking ${transactionId} not found`);
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }

      await prisma.booking.update({
        where: { id: transactionId },
        data: { 
          status: 'PAID',
          paymentId: invoiceId?.toString() 
        }
      });
      
      console.log(`Bonum Webhook: Booking ${transactionId} updated to PAID`);
      
      revalidatePath('/admin/bookings');
      revalidatePath('/admin/scheduler');
      revalidatePath('/');
    } else {
      console.warn(`Bonum Webhook: No action taken. Status: ${status}, TransactionID: ${transactionId}`);
    }

    console.log('--- Bonum Webhook End ---');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bonum Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const c = await cookies();
  const pendingIdFromCookie = c.get('pendingBookingId')?.value;
  
  const transactionId = 
    searchParams.get('bookingId') || 
    searchParams.get('transactionId') || 
    searchParams.get('id') || 
    searchParams.get('order_id') ||
    searchParams.get('orderId') ||
    searchParams.get('invoiceId') ||
    pendingIdFromCookie;
  
  if (transactionId) {
    // If we used the cookie, we can clear it now
    if (!searchParams.get('bookingId') && pendingIdFromCookie === transactionId) {
      c.delete('pendingBookingId');
    }
    return NextResponse.redirect(new URL(`/book/success/${transactionId}`, req.url));
  }

  return NextResponse.json({ 
    message: "Bonum Webhook is active. Use POST for actual payment data.",
    receivedParams: Object.fromEntries(searchParams.entries()),
    hasCookie: !!pendingIdFromCookie
  });
}

