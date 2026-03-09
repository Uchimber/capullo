import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { mn } from "date-fns/locale";
import { CheckCircle2, Calendar, Receipt, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default async function SuccessPage({
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

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6 md:p-8">
      <div className="max-w-2xl w-full grid grid-cols-1 md:grid-cols-5 bg-white rounded-3xl shadow-xl shadow-sage/20 border border-border/50 overflow-hidden relative">

        {/* Success Side */}
        <div className="md:col-span-2 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full"></div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full"></div>
          <div className="space-y-8 relative z-10">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-extrabold leading-tight">
                Захиалга<br /><span className="text-white/70 font-semibold">амжилттай</span>
              </h2>
              <p className="text-white/70 font-medium text-sm leading-relaxed">
                Төлбөр амжилттай төлөгдөж, таны захиалга баталгаажлаа. Баярлалаа!
              </p>
            </div>
          </div>
          <p className="text-xs text-white/40 font-bold uppercase tracking-wider relative z-10">
            #{booking.id.slice(-8).toUpperCase()}
          </p>
        </div>

        {/* Details */}
        <div className="md:col-span-3 p-10 bg-white relative z-10 flex flex-col justify-between">
          <div className="space-y-8">
            <h3 className="text-2xl font-extrabold tracking-tight text-foreground border-b border-border/40 pb-4">
              Таны <span className="text-emerald-600">захиалга</span>
            </h3>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-sage/40 rounded-xl flex items-center justify-center text-emerald-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-dusty uppercase tracking-wider">Өдөр & Цаг</p>
                  <p className="text-base font-bold text-foreground capitalize">
                    {format(new Date(booking.startTime), "yyyy.MM.dd, EEEE", { locale: mn })}
                  </p>
                  <p className="text-sm font-bold text-emerald-600">
                    {format(new Date(booking.startTime), "HH:mm")} - {format(new Date(booking.endTime), "HH:mm")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-peach/40 rounded-xl flex items-center justify-center text-mauve">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-dusty uppercase tracking-wider">Үйлчилгээ</p>
                  <p className="text-base font-bold text-foreground">{booking.service.name}</p>
                  <p className="text-sm font-semibold text-dusty">
                    Төлсөн: <span className="text-foreground">{booking.service.price.toLocaleString()} ₮</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <Link
              href="/"
              className="w-full bg-foreground text-white py-4 rounded-2xl font-bold text-sm shadow-lg hover:bg-foreground/80 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-center"
            >
              Нүүр хуудас руу буцах
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
