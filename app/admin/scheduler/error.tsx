"use client";

import Link from "next/link";

export default function AdminSchedulerError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-xl text-center space-y-4">
        <h1 className="text-2xl font-extrabold text-foreground">Алдаа гарав</h1>
        <p className="text-sm text-dusty">Админ цаг блоклох үйлдэл явуулах үед алдаа гарлаа. Та хуудсыг шинэчилнэ үү.</p>
        <pre className="overflow-x-auto text-xs bg-slate-50 p-3 rounded border border-slate-200 text-left">{error?.message}</pre>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => reset()}
            className="bg-mauve text-white px-4 py-2 rounded-lg font-bold">
            Дахиад оролдоно
          </button>
          <Link href="/admin" className="bg-foreground text-white px-4 py-2 rounded-lg font-bold">
            Админ руу буцах
          </Link>
        </div>
      </div>
    </div>
  );
}
