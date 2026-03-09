import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Clock, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import BookingForm from "@/components/BookingForm";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) notFound();

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-white/80 backdrop-blur-xl border-b border-border/40 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link
          href="/"
          className="flex items-center gap-2 text-dusty hover:text-mauve transition-colors group font-semibold text-sm"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Буцах
        </Link>
        <span className="text-xs font-bold text-mauve bg-rose-soft/30 px-4 py-1.5 rounded-full">
          Алхам 1/2
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 md:p-8">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-5 bg-white rounded-3xl shadow-xl shadow-rose-soft/20 border border-border/50 overflow-hidden">
          {/* Summary */}
          <div className="md:col-span-2 bg-linear-to-br from-mauve to-accent-dark text-white p-10 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full"></div>
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full"></div>
            <div className="space-y-8 relative z-10">
              <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl font-extrabold leading-tight">
                Захиалгын
                <br />
                <span className="text-white/70 font-semibold">мэдээлэл</span>
              </h2>
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-white/50 uppercase tracking-wider">
                    Үйлчилгээ
                  </p>
                  <p className="text-lg font-bold text-white border-l-3 border-white/30 pl-4">
                    {service.name}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-white/50 uppercase tracking-wider">
                    Хугацаа
                  </p>
                  <p className="text-base font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-white/50" />{" "}
                    {service.duration} минут
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-white/50 uppercase tracking-wider">
                    Төлөх дүн
                  </p>
                  <p className="text-3xl font-extrabold text-white tracking-tight">
                    {service.price.toLocaleString()}
                    <span className="text-lg ml-1 font-bold text-white/60">
                      ₮
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-white/50 font-medium leading-relaxed border-t border-white/10 pt-5 relative z-10 space-y-2">
              <p>• Цаг баталгаажуулахын тулд урьдчилж төлбөр хийх шаардлагатай.</p>
              <p>• Төлбөр хийгдсэний дараа таны цаг баталгаажна.</p>
              <p>• Цагийг 1 удаа өөрчлөх боломжтой (дор хаяж 3 цагийн өмнө).</p>
              <p>• Хугацаандаа ирээгүй тохиолдолд төлбөр буцаагдахгүй.</p>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-3 p-8 md:p-10 bg-white">
            <h3 className="text-2xl font-extrabold tracking-tight text-foreground mb-8 border-b border-border/40 pb-4">
              Таны <span className="text-mauve">мэдээлэл</span>
            </h3>

            <BookingForm serviceId={serviceId} />
          </div>
        </div>
      </main>
    </div>
  );
}
