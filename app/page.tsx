import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Clock, ArrowRight, Phone, MapPin, Sparkles } from "lucide-react";
import { PublicMobileNav } from "@/components/PublicMobileNav";

export default async function HomePage() {
  const [services, businessSettingsData] = await Promise.all([
    prisma.service.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.businessSettings.findUnique({
      where: { id: "singleton" },
    }),
  ]);

  const businessSettings = businessSettingsData || {
    phone: "9811-8008",
    address:
      'СБД 1-р хороо, 5-р хороолол 14251, Чингисийн өргөн чөлөө. "Бизнес плаза" төв. 302 тоот өрөө.',
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-rose-soft/50 px-4 sm:px-8 py-4 sm:py-5 flex justify-between items-center gap-3 sticky top-0 z-50">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground min-w-0">
          Capullo
          <span className="text-mauve font-bold text-base sm:text-lg ml-1"></span>
        </h1>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/admin"
            className="hidden sm:inline text-xs font-bold text-dusty hover:text-mauve transition-colors whitespace-nowrap"
          >
            Ажилчдын нэвтрэх
          </Link>
          <PublicMobileNav />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 w-full space-y-20">
        {/* Hero */}
        <section className="text-center space-y-6 pt-8">
          <div className="inline-flex items-center gap-2 bg-rose-soft/40 px-5 py-2 rounded-full text-sm font-bold text-mauve">
            <Sparkles className="w-4 h-4" />
            Ховс, Энерги, Сэтгэлзүй
          </div>
          <h2 className="text-5xl md:text-6xl font-extrabold text-foreground tracking-tight leading-[1.1]">
            Сэтгэл эрүүл бол,
            <br />
            <span className="text-mauve">бие эрүүл</span>
          </h2>
          <p className="text-lg text-dusty font-medium max-w-xl mx-auto leading-relaxed">
            Доорх үйлчилгээнүүдээс сонгон цагаа захиалаарай.
          </p>
        </section>

        {/* Services Grid */}
        <section id="services" className="space-y-8 scroll-mt-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-white p-7 rounded-3xl border border-border/60 transition-all hover:shadow-xl hover:shadow-rose-soft/30 hover:-translate-y-1 group"
              >
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="w-11 h-11 bg-rose-soft/40 rounded-2xl flex items-center justify-center text-mauve group-hover:bg-mauve group-hover:text-white transition-all">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-extrabold text-foreground tracking-tight leading-tight">
                      {service.name}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-dusty bg-blush px-3 py-1 rounded-full">
                        <Clock className="w-3 h-3" /> {service.duration} мин
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-dusty line-clamp-2 min-h-10 leading-relaxed">
                    {service.description || "Тайлбар байхгүй."}
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-2xl font-extrabold text-mauve tracking-tight">
                      {service.price.toLocaleString()}
                      <span className="text-sm font-bold ml-0.5">₮</span>
                    </span>
                    <Link
                      href={`/book/${service.id}`}
                      className="inline-flex items-center gap-2 bg-mauve text-white px-5 py-2.5 rounded-2xl font-bold text-sm transition-all active:scale-95 hover:bg-accent-dark group/btn shadow-lg shadow-mauve/20"
                    >
                      Захиалах
                      <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {services.length === 0 && (
              <div className="col-span-full py-24 text-center space-y-4 bg-white rounded-3xl border border-border/60">
                <Sparkles className="w-12 h-12 mx-auto text-rose-soft" />
                <p className="text-lg font-bold text-dusty">
                  Одоогоор боломжтой үйлчилгээ байхгүй байна.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="scroll-mt-24">
          <div className="bg-white p-10 md:p-14 rounded-3xl border border-border/60 text-center space-y-10">
            <h3 className="text-3xl font-extrabold text-foreground tracking-tight">
              Холбоо <span className="text-mauve">барих</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="flex flex-col items-center gap-3 p-6 bg-blush/40 rounded-2xl">
                <div className="w-12 h-12 bg-rose-soft/50 rounded-2xl flex items-center justify-center text-mauve">
                  <Phone className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-dusty uppercase tracking-wider">
                  Утас
                </p>
                <p className="text-xl font-extrabold text-foreground">
                  {businessSettings.phone}
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 p-6 bg-blush/40 rounded-2xl">
                <div className="w-12 h-12 bg-sage/50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-dusty uppercase tracking-wider">
                  Хаяг
                </p>
                <p className="text-sm font-semibold text-foreground/80 leading-relaxed">
                  {businessSettings.address}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white/50 border-t border-border/40 py-10 px-8">
        <div className="max-w-5xl mx-auto text-center text-xs text-dusty font-semibold">
          © 2026 Capullo. Бүх эрх хуулиар хамгаалагдсан.
        </div>
      </footer>
    </div>
  );
}
