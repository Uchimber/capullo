import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { mn } from "date-fns/locale";
import { Briefcase as ServiceIcon, Calendar, DollarSign, ArrowRight, Sparkles, User, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [servicesCount, bookingsCount, bookings] = await Promise.all([
    prisma.service.count(),
    prisma.booking.count({
      where: { status: { in: ["CONFIRMED", "PAID", "BLOCKED"] } },
    }),
    prisma.booking.findMany({
      where: { status: { in: ["CONFIRMED", "PAID"] } },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { service: true },
    }),
  ]);

  // Calculate some simple stats for the revenue part (just examples for UI)
  const stats = [
    { label: "Үйлчилгээ", value: servicesCount, icon: ServiceIcon, color: "text-mauve bg-blush/30 border-mauve/10", href: "/admin/services" },
    { label: "Захиалга", value: bookingsCount, icon: Calendar, color: "text-mauve bg-blush/30 border-mauve/10", href: "/admin/bookings" },
    { label: "Сүүлчийн орлого", value: `${bookings.reduce((sum, b) => sum + (b.status === 'PAID' ? b.service.price : 0), 0).toLocaleString()} ₮`, icon: DollarSign, color: "text-mauve bg-blush/30 border-mauve/10", href: "/admin/bookings" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-16 py-10 pb-20">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-rose-soft/10 border border-rose-soft/40">
             <Sparkles className="w-6 h-6 text-mauve" />
           </div>
           <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
             Сайн байна уу, <span className="text-mauve">Админ</span>
           </h1>
        </div>
        <p className="text-dusty font-medium text-lg leading-relaxed max-w-2xl px-1">
          Өнөөдрийн байдлаарх захиалгын ерөнхий мэдээллийг эндээс харна уу.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group bg-white p-10 rounded-[2.5rem] shadow-xl shadow-rose-soft/10 border border-rose-soft/40 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-10 transform rotate-12 opacity-5 scale-150 transition-transform group-hover:scale-125">
              <stat.icon className="w-24 h-24 text-mauve" />
            </div>
            <div className="space-y-8 relative z-10">
              <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-110`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-dusty group-hover:text-mauve transition-colors">
                  {stat.label}
                </p>
                <p className="text-3xl font-extrabold text-foreground tracking-tight">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-rose-soft/10 border border-rose-soft/40 overflow-hidden">
        <div className="px-10 py-8 border-b border-rose-soft/30 flex justify-between items-center bg-blush/10">
          <h2 className="text-xl font-extrabold tracking-tight text-foreground">
            Сүүлийн <span className="text-mauve">захиалгууд</span>
          </h2>
          <Link
            href="/admin/bookings"
            className="text-xs font-bold uppercase tracking-widest text-dusty hover:text-mauve flex items-center gap-2 transition-colors border-b-2 border-transparent hover:border-mauve pb-1"
          >
            Бүгдийг харах
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-rose-soft/20">
          {bookings.map((booking) => (
            <div key={booking.id} className="px-10 py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-blush/5 transition-colors group">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-white rounded-2xl flex flex-col items-center justify-center border border-rose-soft/40 shadow-sm shrink-0 group-hover:border-mauve/20 group-hover:shadow-md transition-all">
                  <p className="text-[9px] font-bold uppercase text-dusty/60 leading-none mb-1">{format(new Date(booking.startTime), "MMM", { locale: mn })}</p>
                  <p className="text-xl font-extrabold text-foreground leading-none tracking-tight">{format(new Date(booking.startTime), "dd")}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-foreground tracking-tight flex items-center gap-2">
                    <User className="w-4 h-4 text-mauve/40" />
                    {booking.customerName}
                  </h3>
                  <p className="text-[10px] font-bold text-dusty/60 tracking-widest uppercase flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-mauve/40" />
                    {booking.service.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right space-y-1">
                  <p className="text-xs font-extrabold text-foreground flex items-center gap-2 justify-end">
                    <Clock className="w-3.5 h-3.5 text-mauve" />
                    {format(new Date(booking.startTime), "HH:mm")} - {format(new Date(booking.endTime), "HH:mm")}
                  </p>
                  <p className="text-[10px] font-bold text-dusty tracking-widest uppercase opacity-40"># {booking.id.slice(-6).toUpperCase()}</p>
                </div>
                <span className={`px-5 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest border shadow-sm ${
                  booking.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-peach/30 text-mauve border-mauve/20'
                }`}>
                  {booking.status === 'PAID' ? 'Төлөгдсөн' : 'Баталгаажсан'}
                </span>
              </div>
            </div>
          ))}
          {bookings.length === 0 && (
            <div className="px-10 py-24 text-center space-y-4">
              <div className="w-20 h-20 bg-blush/20 rounded-4xl flex items-center justify-center mx-auto border border-rose-soft/40 opacity-40">
                <Calendar className="w-8 h-8 text-mauve" />
              </div>
              <p className="text-dusty font-bold italic text-sm">Одоогоор захиалга байхгүй байна.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
