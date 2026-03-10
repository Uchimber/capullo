import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PaymentClient from "@/components/PaymentClient";
import Link from "next/link";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const resolvedParams = await params;
  const bookingId = resolvedParams.bookingId;

  if (!bookingId) {
    return notFound();
  }

  const booking = await prisma.booking
    .findUnique({
      where: { id: bookingId },
      include: { service: true },
    })
    .catch((err) => {
      console.error("PaymentPage DB error:", err);
      return null;
    });

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-rose-soft/40 text-center space-y-4 max-w-sm">
          <p className="text-mauve font-bold text-lg">Захиалга олдсонгүй</p>
          <p className="text-xs text-dusty">
            Энэ захиалга устгагдсан эсвэл хугацаа нь дууссан байна.
          </p>
          <Link
            href="/"
            className="inline-block bg-mauve text-white px-6 py-2 rounded-xl font-bold text-sm"
          >
            Шинээр захиалах
          </Link>
        </div>
      </div>
    );
  }

  // If already paid, redirect to success
  if (booking.status === "PAID") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-emerald-100 text-center space-y-4 max-w-sm">
          <p className="text-emerald-600 font-bold text-lg">Төлбөр төлөгдсөн</p>
          <p className="text-xs text-dusty">
            Энэ захиалгын төлбөр аль хэдийн төлөгдсөн байна.
          </p>
          <Link
            href={`/book/success/${bookingId}`}
            className="inline-block bg-mauve text-white px-6 py-2 rounded-xl font-bold text-sm"
          >
            Дэлгэрэнгүй харах
          </Link>
        </div>
      </div>
    );
  }

  return <PaymentClient booking={booking} />;
}
