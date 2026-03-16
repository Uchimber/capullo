"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { getBookingStatusForSuccess } from "@/lib/actions";

function goToSuccess(router: ReturnType<typeof useRouter>) {
  router.refresh();
}

export default function SuccessWaiting({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("Төлбөр баталгаажуулж байна...");
  const [checking, setChecking] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    setMessage("Шалгаж байна...");
    try {
      const result = await getBookingStatusForSuccess(bookingId);
      if (result?.status === "PAID") {
        setMessage("Амжилттай!");
        goToSuccess(router);
        return;
      }
      setMessage("Төлбөр баталгаажуулж байна...");
    } catch (err) {
      console.error("Check status error:", err);
      setMessage("Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setChecking(false);
    }
  }, [bookingId, router]);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const result = await getBookingStatusForSuccess(bookingId);
      if (cancelled) return;
      if (result?.status === "PAID") {
        setMessage("Амжилттай!");
        goToSuccess(router);
        return;
      }
      timeoutRef.current = setTimeout(poll, 2000);
    };
    timeoutRef.current = setTimeout(poll, 0);
    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [bookingId, router]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6 md:p-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-rose-soft/20 border border-border/50 p-12 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight mb-2">
            {message}
          </h2>
          <p className="text-sm text-dusty font-medium">
            Түр хүлээнэ үү. Төлбөр баталгаажсаны дараа хуудас шинэчлэгдэнэ.
          </p>
        </div>
        <button
          type="button"
          onClick={checkStatus}
          disabled={checking}
          className="w-full py-3 px-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 font-bold text-sm hover:bg-emerald-100 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {checking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Төлбөр төлсөн бол энд дарж шалгана уу
        </button>
      </div>
    </div>
  );
}
