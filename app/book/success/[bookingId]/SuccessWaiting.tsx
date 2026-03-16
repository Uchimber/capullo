"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getBookingStatusForSuccess } from "@/lib/actions";

export default function SuccessWaiting({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("Төлбөр баталгаажуулж байна...");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const result = await getBookingStatusForSuccess(bookingId);
      if (cancelled) return;
      if (result?.status === "PAID") {
        setMessage("Амжилттай!");
        router.refresh();
        return;
      }
      timeoutRef.current = setTimeout(poll, 1500);
    };
    timeoutRef.current = setTimeout(poll, 0);
    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [bookingId, router]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6 md:p-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-rose-soft/20 border border-border/50 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
        <h2 className="text-xl font-extrabold text-foreground tracking-tight mb-2">
          {message}
        </h2>
        <p className="text-sm text-dusty font-medium">
          Түр хүлээнэ үү. Төлбөр баталгаажсаны дараа хуудас шинэчлэгдэнэ.
        </p>
      </div>
    </div>
  );
}
