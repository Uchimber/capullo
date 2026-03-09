import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

const BONUM_SECRET_KEY = "1fc53f9389f489ff6e04617bd6338a710e1e7c579cb572aec421f560f363119c0e0039e4b765e53c5339c1e6c7727985a488ab4ac8141140571256af36c3f410421b2ff278fb499b10e3bdb7d3236212";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    
    // 1. Verify Checksum
    const incomingChecksum = req.headers.get('x-checksum-v2');
    const calculatedChecksum = crypto
      .createHmac('sha256', BONUM_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    if (incomingChecksum !== calculatedChecksum) {
      console.error('Bonum Webhook: Invalid Checksum');
      return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
    }

    const { status, transactionId, invoiceId } = body;

    console.log(`Bonum Webhook received: ${status} for ${transactionId}`);

    // status: PAID, EXPIRED, CANCELLED
    if (status === 'PAID') {
      await prisma.booking.update({
        where: { id: transactionId },
        data: { 
          status: 'PAID',
          paymentId: invoiceId 
        }
      });
      
      revalidatePath('/admin/bookings');
      revalidatePath('/admin/scheduler');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bonum Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
