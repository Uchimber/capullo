import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PaymentClient from "@/components/PaymentClient";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{
    serviceId?: string;
    name?: string;
    phone?: string;
    startTime?: string;
  }>;
}) {
  const params = await searchParams;
  const { serviceId, name, phone, startTime } = params;

  if (!serviceId || !name || !phone || !startTime) {
    console.error("NewPaymentPage: Missing required params", params);
    return notFound();
  }

  const service = await prisma.service
    .findUnique({
      where: { id: serviceId },
    })
    .catch((err) => {
      console.error("NewPaymentPage DB error:", err);
      return null;
    });

  if (!service) {
    console.error("NewPaymentPage: Service not found or error", serviceId);
    return notFound();
  }

  // Pass all booking info to the client component
  // The booking will ONLY be created when the user clicks "Pay"
  return (
    <PaymentClient
      booking={{
        id: "", // No booking ID yet - will be created on payment
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
}
