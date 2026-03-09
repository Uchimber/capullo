import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PaymentClient from "@/components/PaymentClient";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  let bookingId: string | undefined = undefined;
  try {
    const resolvedParams = await params;
    bookingId = resolvedParams.bookingId;
    
    if (!bookingId) {
      console.error('PaymentPage: bookingId is missing from params');
      return notFound();
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });

    if (!booking) {
      console.warn(`PaymentPage: Booking ${bookingId} not found`);
      return notFound();
    }

    return <PaymentClient booking={booking} />;
  } catch (err) {
    console.error(`PaymentPage error for ID ${bookingId}:`, err);
    // In production, this might still show a generic error, 
    // but at least we've caught it and logged it on the server.
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-red-100 text-center space-y-4 max-w-sm">
          <p className="text-red-500 font-bold">Уучлаарай, алдаа гарлаа.</p>
          <p className="text-xs text-dusty">Захиалгын мэдээллийг ачаалахад алдаа гарлаа. Та дахин оролдоно уу.</p>
          <a href="/" className="inline-block bg-mauve text-white px-6 py-2 rounded-xl font-bold text-sm">Нүүр хуудас руу буцах</a>
        </div>
      </div>
    );
  }
}

