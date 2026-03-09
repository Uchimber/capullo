import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PaymentClient from "@/components/PaymentClient";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true },
  });

  if (!booking) notFound();

  return <PaymentClient booking={booking} />;
}
