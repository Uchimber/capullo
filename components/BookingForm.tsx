'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, Loader2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { format, addDays, startOfDay, startOfWeek, subDays, isSameDay, isBefore } from "date-fns";
import { mn } from "date-fns/locale";
import { getAvailableSlots } from "@/lib/actions";

interface Props {
  serviceId: string;
}

export default function BookingForm({ serviceId }: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [baseDate, setBaseDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [slots, setSlots] = useState<Date[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dates = Array.from({ length: 7 }, (_, i) => addDays(baseDate, i));

  useEffect(() => {
    async function fetchSlots() {
      setLoadingSlots(true);
      const data = await getAvailableSlots(selectedDate, serviceId);
      setSlots(data);
      setLoadingSlots(false);
      setSelectedSlot(null);
    }
    fetchSlots();
  }, [selectedDate, serviceId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get("name") as string;
      const phone = formData.get("phone") as string;
      const startTime = selectedSlot.toISOString();

      // Navigate to payment page with booking details as query params  
      // NO database record is created at this point
      const params = new URLSearchParams({
        serviceId,
        name,
        phone,
        startTime,
      });
      
      router.push(`/book/payment/new?${params.toString()}`);
    } catch (err) {
      const error = err as Error;
      console.error(error);
      setError(error.message || 'Алдаа гарлаа.');
      setIsSubmitting(false);
    }
  };

  const goToToday = () => {
    const today = startOfDay(new Date());
    setSelectedDate(today);
    setBaseDate(startOfWeek(today, { weekStartsOn: 1 }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}
      
      {/* Date Picker */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold uppercase tracking-wider text-dusty">
            Өдөр сонгох
          </label>
          <div className="flex items-center gap-1 bg-blush/50 p-1 rounded-xl">
            <span className="px-3 text-xs font-bold text-dusty border-r border-border/40 capitalize">
              {format(baseDate, "yyyy", { locale: mn })} <span className="text-mauve">{format(baseDate, "MMM", { locale: mn })}</span>
            </span>
            <button 
              type="button"
              onClick={() => setBaseDate(subDays(baseDate, 7))}
              className="p-1.5 hover:bg-white rounded-lg transition-colors text-dusty hover:text-mauve"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={goToToday}
              className="px-3 py-1 text-xs font-bold text-dusty hover:text-mauve transition-colors"
            >
              Өнөөдөр
            </button>
            <button 
              type="button"
              onClick={() => setBaseDate(addDays(baseDate, 7))}
              className="p-1.5 hover:bg-white rounded-lg transition-colors text-dusty hover:text-mauve"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {dates.map((date) => {
            const isSelected = selectedDate.getTime() === date.getTime();
            const isToday = isSameDay(new Date(), date);
            const isPast = isBefore(date, startOfDay(new Date()));

            return (
              <button
                key={date.toISOString()}
                type="button"
                disabled={isPast}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center justify-center py-3.5 rounded-2xl border-2 transition-all relative ${
                  isSelected 
                    ? "bg-mauve border-mauve text-white shadow-lg shadow-mauve/25 scale-105" 
                    : isPast
                    ? "opacity-25 cursor-not-allowed border-transparent"
                    : "bg-blush/30 border-transparent text-dusty hover:bg-white hover:border-rose-soft"
                }`}
              >
                {isToday && !isSelected && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-mauve rounded-full"></div>}
                <span className="text-[9px] uppercase font-bold tracking-wider leading-none mb-1 opacity-70">
                  {format(date, "EEE", { locale: mn })}
                </span>
                <span className="text-lg font-extrabold tracking-tight">
                  {format(date, "dd")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slot Picker */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-dusty flex items-center justify-between">
          Боломжтой цагууд
          {loadingSlots && <Loader2 className="w-3 h-3 animate-spin text-mauve" />}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {slots.map((slot) => {
            const isSelected = selectedSlot?.getTime() === slot.getTime();
            return (
              <button
                key={slot.toISOString()}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  isSelected 
                    ? "bg-mauve border-mauve text-white shadow-lg shadow-mauve/25 scale-95" 
                    : "bg-blush/30 border-transparent text-foreground hover:bg-white hover:border-rose-soft"
                }`}
              >
                {format(slot, "HH:mm")}
              </button>
            );
          })}
          {!loadingSlots && slots.length === 0 && (
            <div className="col-span-3 py-6 bg-peach/40 text-dusty text-xs font-bold text-center rounded-xl">
              Энэ өдөр захиалга авах боломжгүй байна.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5 pt-2">
        <div className="space-y-2 group">
          <label className="text-xs font-bold uppercase tracking-wider text-dusty group-focus-within:text-mauve transition-colors">
            Таны нэр
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
            <input
              name="name"
              required
              className="w-full bg-blush/30 border-0 border-b-2 border-transparent focus:border-mauve focus:bg-white px-10 py-3.5 rounded-xl text-sm font-semibold transition-all outline-none text-foreground placeholder:text-dusty/50"
              placeholder="Нэрээ оруулна уу"
            />
          </div>
        </div>

        <div className="space-y-2 group">
          <label className="text-xs font-bold uppercase tracking-wider text-dusty group-focus-within:text-mauve transition-colors">
            Утасны дугаар
          </label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
            <input
              name="phone"
              required
              type="tel"
              className="w-full bg-blush/30 border-0 border-b-2 border-transparent focus:border-mauve focus:bg-white px-10 py-3.5 rounded-xl text-sm font-semibold transition-all outline-none text-foreground placeholder:text-dusty/50"
              placeholder="Утасны дугаараа оруулна уу"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!selectedSlot || isSubmitting}
          className="w-full bg-mauve text-white py-4 rounded-2xl font-bold text-base shadow-xl shadow-mauve/25 hover:bg-accent-dark active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : (
            <>
              {selectedSlot ? "Үргэлжлүүлэх" : "Цагаа сонгоно уу"}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

const ArrowRight = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);
