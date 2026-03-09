import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { mn } from "date-fns/locale";
import { updateBookingStatus } from "@/lib/actions";
import { Check, X, Phone, User, Calendar, Clock, Sparkles } from "lucide-react";

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    orderBy: { startTime: "desc" },
    include: { service: true },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Бүх <span className="text-mauve">захиалгууд</span>
        </h1>
        <p className="text-dusty font-medium text-sm">Нийт захиалгын мэдээлэл болон төлөв удирдах.</p>
      </header>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-rose-soft/10 border border-rose-soft/40 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blush/10 border-b border-rose-soft/30">
                <th className="px-10 py-7 text-[10px] font-bold uppercase tracking-widest text-dusty">Үйлчлүүлэгч</th>
                <th className="px-10 py-7 text-[10px] font-bold uppercase tracking-widest text-dusty">Үйлчилгээ</th>
                <th className="px-10 py-7 text-[10px] font-bold uppercase tracking-widest text-dusty">Цаг</th>
                <th className="px-10 py-7 text-[10px] font-bold uppercase tracking-widest text-dusty">Төлөв</th>
                <th className="px-10 py-7 text-[10px] font-bold uppercase tracking-widest text-dusty text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-soft/20">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-blush/5 transition-colors group">
                  <td className="px-10 py-8">
                    <div className="space-y-2">
                      <p className="font-extrabold text-foreground tracking-tight flex items-center gap-2">
                        <User className="w-4 h-4 text-mauve/40" /> {booking.customerName}
                      </p>
                      <p className="text-xs font-bold text-dusty flex items-center gap-2">
                         <span className="w-7 h-7 bg-blush/30 rounded-lg flex items-center justify-center shrink-0">
                            <Phone className="w-3 h-3 text-mauve" />
                         </span>
                         {booking.customerPhone}
                      </p>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="space-y-2">
                      <p className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
                         <Sparkles className="w-3.5 h-3.5 text-mauve/40" />
                         {booking.service.name}
                      </p>
                      <p className="text-xs font-extrabold text-mauve tracking-tight">
                        {booking.service.price.toLocaleString()} ₮
                      </p>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="space-y-2">
                      <p className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-mauve/40" /> {format(new Date(booking.startTime), "yyyy.MM.dd")}
                      </p>
                      <p className="text-xs font-bold text-dusty flex items-center gap-2 opacity-60">
                        <Clock className="w-3.5 h-3.5" /> {format(new Date(booking.startTime), "HH:mm")} - {format(new Date(booking.endTime), "HH:mm")}
                      </p>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <span className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest border shadow-sm ${
                      booking.status === 'PAID' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : booking.status === 'CANCELLED'
                        ? 'bg-rose-50 text-rose-500 border-rose-100'
                        : booking.status === 'BLOCKED'
                        ? 'bg-foreground text-white border-foreground'
                        : 'bg-peach/30 text-mauve border-mauve/20'
                    }`}>
                      {booking.status === 'PAID' 
                        ? 'Төлөгдсөн' 
                        : booking.status === 'CANCELLED' 
                        ? 'Цуцлагдсан' 
                        : booking.status === 'BLOCKED'
                        ? 'Завгүй'
                        : 'Хүлээгдэж буй'}
                    </span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                      {booking.status !== 'PAID' && booking.status !== 'BLOCKED' && (
                        <form action={updateBookingStatus.bind(null, booking.id, 'PAID')}>
                          <button
                            type="submit"
                            title="Төлөгдсөн гэж тэмдэглэх"
                            className="p-3 bg-white text-emerald-500 hover:text-white hover:bg-emerald-500 rounded-xl transition-all active:scale-90 border border-rose-soft/40 hover:border-emerald-500 shadow-sm"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        </form>
                      )}
                      {(booking.status !== 'CANCELLED') && (
                        <form action={updateBookingStatus.bind(null, booking.id, 'CANCELLED')}>
                          <button
                            type="submit"
                            title={booking.status === 'BLOCKED' ? "Блок гаргах" : "Цуцлах"}
                            className="p-3 bg-white text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all active:scale-90 border border-rose-soft/40 hover:border-rose-500 shadow-sm"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-10 py-32 text-center text-dusty font-bold italic text-sm">
                    Захиалга бүртгэгдээгүй байна.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
