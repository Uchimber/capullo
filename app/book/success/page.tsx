import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SuccessPendingClient from "@/components/SuccessPendingClient";

export const dynamic = "force-dynamic";

export default async function SuccessPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ ps?: string }>;
}) {
  try {
    const params = await searchParams;
    const ps = params?.ps;

    if (!ps || typeof ps !== "string") {
      redirect("/");
    }

    const pending = await prisma.pendingPayment
      .findUnique({
        where: { id: ps },
      })
      .catch((err) => {
        console.error("SuccessPendingPage DB error:", err);
        return null;
      });

    if (!pending) {
      redirect("/");
    }

    if (pending.bookingId) {
      redirect(`/book/success/${pending.bookingId}`);
    }

    return <SuccessPendingClient paymentSessionId={ps} />;
  } catch (err) {
    const e = err as { digest?: string };
    if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    console.error("SuccessPendingPage error:", err);
    redirect("/");
  }
}
