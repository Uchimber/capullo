'use client'

import { useState } from "react";
import { createBonumInvoice } from "@/lib/actions";
import { CreditCard, ShieldCheck, Loader2, ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";

interface Props {
  booking: any;
}

export default function PaymentClient({ booking }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const followUpLink = await createBonumInvoice(booking.id);
      if (followUpLink) {
        window.location.href = followUpLink;
      } else {
        throw new Error('Төлбөрийн холбоос үүсгэж чадсангүй.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Төлбөрийн системтэй холбогдоход алдаа гарлаа.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6 md:p-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-rose-soft/20 border border-border/50 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 transform rotate-12 opacity-5 scale-150 pointer-events-none">
          <Sparkles className="w-32 h-32 text-mauve" />
        </div>

        <div className="p-10 space-y-9 relative z-10">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 bg-rose-soft/30 text-mauve rounded-full flex items-center justify-center shadow-inner">
              <CreditCard className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                Төлбөр <span className="text-mauve">төлөх</span>
              </h2>
              <p className="text-dusty font-medium text-sm">
                <span className="font-bold text-foreground">{booking.service.name}</span> үйлчилгээний захиалгыг баталгаажуулах
              </p>
            </div>
          </div>

          <div className="bg-blush/40 rounded-2xl p-6 space-y-3">
            <p className="text-xs font-bold text-dusty uppercase tracking-wider">
              Нийт төлөх дүн
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-foreground tracking-tight">
                {booking.service.price.toLocaleString()}
              </span>
              <span className="text-lg font-bold text-mauve">₮</span>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-500">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-mauve text-white py-4 rounded-2xl font-bold text-base shadow-xl shadow-mauve/25 hover:bg-accent-dark active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Бонүм-аар төлөх
                  <ExternalLink className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-dusty font-semibold flex items-center justify-center gap-2">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Аюулгүй төлбөрийн систем
            </p>
          </div>

          <Link
            href="/"
            className="block text-center text-xs font-bold text-dusty/60 hover:text-mauve transition-colors"
          >
            Цуцлаад буцах
          </Link>
        </div>
      </div>
    </div>
  );
}
