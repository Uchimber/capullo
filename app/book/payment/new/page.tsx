import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PaymentClient from "@/components/PaymentClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
  try {
    const params = await searchParams;
    const serviceId = params?.serviceId ?? "";
    const name = params?.name ?? "";
    const phone = params?.phone ?? "";
    const startTime = params?.startTime ?? "";

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

    return (
      <PaymentClient
        booking={{
          id: "",
          service: {
            name: service.name,
            price: Number(service.price),
          },
        }}
        pendingBookingData={{
          serviceId,
          customerName: name,
          customerPhone: phone,
          startTime,
          serviceDuration: Number(service.duration),
        }}
      />
    );
  } catch (err) {
    console.error("NewPaymentPage error:", err);
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-rose-soft/40 p-10 text-center space-y-6">
          <h2 className="text-xl font-extrabold text-foreground">
            Алдаа гарлаа
          </h2>
          <p className="text-sm text-dusty">
            Төлбөрийн хуудас ачаалахад алдаа гарлаа. Цаг, нэр, утасны дугаараа
            дахин оруулаад оролдоно уу.
          </p>
          <Link
            href="/"
            className="inline-block w-full bg-mauve text-white py-3 rounded-xl font-bold text-sm"
          >
            Нүүр хуудас руу буцах
          </Link>
        </div>
      </div>
    );
  }
}
