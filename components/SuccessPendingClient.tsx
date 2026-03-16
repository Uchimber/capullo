"use client";

import { useEffect } from "react";
import { Loader2, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SuccessPendingClient({
  paymentSessionId,
}: {
  paymentSessionId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const checkInterval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/booking/check?ps=${encodeURIComponent(paymentSessionId)}`,
        );
        const data = await res.json();
        if (data.bookingId) {
          router.replace(`/book/success/${data.bookingId}`);
        }
      } catch {
        // Ignore
      }
    }, 2000);

    return () => clearInterval(checkInterval);
  }, [paymentSessionId, router]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6 md:p-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-rose-soft/20 border border-border/50 p-12 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        </div>
        <h2 className="text-2xl font-extrabold text-foreground mb-3">
          Төлбөр баталгаажуулалт хийгдэж байна
        </h2>
        <p className="text-dusty text-sm font-medium mb-6">
          Захиалгаа баталгаажуулж байна.
          Хэдхэн секунд хүлээнэ үү.
        </p>
        <p className="text-xs text-dusty/60 mb-8">
          Хуудас автоматаар шинэчлэгдэнэ
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-rose-soft/40 bg-blush/20 text-foreground font-bold text-sm hover:bg-blush/40 hover:border-mauve/40 transition-colors"
        >
          <Home className="w-4 h-4" />
          Нүүр хуудас руу буцах
        </Link>
      </div>
    </div>
  );
}
