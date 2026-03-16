import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SuccessPendingClient from "@/components/SuccessPendingClient";

export default async function SuccessPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ ps?: string }>;
}) {
  const params = await searchParams;
  const ps = params.ps;

  if (!ps) {
    redirect("/");
  }

  const pending = await prisma.pendingPayment.findUnique({
    where: { id: ps },
  });

  if (!pending) {
    redirect("/");
  }

  // If webhook already created booking, redirect to success page
  if (pending.bookingId) {
    redirect(`/book/success/${pending.bookingId}`);
  }

  return <SuccessPendingClient paymentSessionId={ps} />;
}
