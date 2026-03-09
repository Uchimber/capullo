import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PaymentClient from "@/components/PaymentClient";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string; name?: string; phone?: string; startTime?: string }>;
}) {
  try {
    const params = await searchParams;
    const { serviceId, name, phone, startTime } = params;

    if (!serviceId || !name || !phone || !startTime) {
      console.error('NewPaymentPage: Missing required params', params);
      return notFound();
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      console.error('NewPaymentPage: Service not found', serviceId);
      return notFound();
    }

    // Pass all booking info to the client component
    // The booking will ONLY be created when the user clicks "Pay"
    return (
      <PaymentClient
        booking={{
          id: '', // No booking ID yet - will be created on payment
          service: {
            name: service.name,
            price: service.price,
          },
        }}
        pendingBookingData={{
          serviceId,
          customerName: name,
          customerPhone: phone,
          startTime,
          serviceDuration: service.duration,
        }}
      />
    );
  } catch (err) {
    console.error('NewPaymentPage error:', err);
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
