"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function BookError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Book flow error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-rose-soft/40 p-10 text-center space-y-6">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-xl font-extrabold text-foreground">
          Алдаа гарлаа
        </h2>
        <p className="text-sm text-dusty">
          Цаг сонгох эсвэл төлбөр хийх үед алдаа гарлаа. Та дахин оролдоно уу.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full bg-mauve text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Дахин оролдох
          </button>
          <Link
            href="/"
            className="inline-block w-full bg-blush/30 text-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-rose-soft/40"
          >
            <Home className="w-4 h-4" />
            Нүүр хуудас
          </Link>
        </div>
      </div>
    </div>
  );
}
