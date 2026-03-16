"use client";

import { useState } from "react";
import {
  format,
  addDays,
  startOfDay,
  isSameDay,
  subDays,
  startOfWeek,
} from "date-fns";
import { mn } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAvailableSlots,
  createBooking,
  rescheduleBooking,
  updateBookingStatus,
  blockSlot,
  getAdminBookings,
} from "@/lib/actions";
import type { BookingStatusValue } from "@/lib/booking-status";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  X,
  RefreshCw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface Service {
  id: string;
  name: string;
  duration: number;
}

interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  startTime: Date | string;
  endTime: Date | string;
  serviceId: string;
  status: BookingStatusValue;
  service: { name: string };
}

interface Props {
  services: Service[];
  initialBookings: Booking[];
}

export default function AdminSchedulerClient({
  services,
  initialBookings,
}: Props) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(
    startOfDay(new Date()),
  );
  const [baseDate, setBaseDate] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockTargetSlot, setBlockTargetSlot] = useState<Date | null>(null);
  const [blockDuration, setBlockDuration] = useState("60");

  const [formData, setFormData] = useState({
    serviceId: services[0]?.id || "",
    customerName: "",
    customerPhone: "",
    startTime: "",
  });

  // Queries
  const {
    data: allBookings = initialBookings,
    isFetching: isBookingsFetching,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: getAdminBookings,
    initialData: initialBookings,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: availableSlots = [], isLoading: isSlotsLoading } = useQuery({
    queryKey: [
      "available-slots",
      selectedDate.toISOString(),
      formData.serviceId,
    ],
    queryFn: () => getAvailableSlots(selectedDate, formData.serviceId, true),
    enabled: !!formData.serviceId,
    staleTime: 0,
  });

  // Mutations
  const bookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (newBooking) => {
      // Optimistic: add new booking to cache immediately
      queryClient.setQueryData(
        ["admin-bookings"],
        (old: Booking[] | undefined) => {
          if (!old) return old;
          const merged = [...old, newBooking].sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
          );
          return merged;
        },
      );
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["available-slots"] });
      setFormData({
        ...formData,
        customerName: "",
        customerPhone: "",
        startTime: "",
      });
      toast.success("Захиалга амжилттай үүслээ");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Алдаа гарлаа");
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, newStartTime }: { id: string; newStartTime: Date }) =>
      rescheduleBooking(id, newStartTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["available-slots"] });
      setReschedulingId(null);
      toast.success("Цаг амжилттай шилжүүллээ");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Алдаа гарлаа");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatusValue }) =>
      updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["available-slots"] });
      toast.success("Төлөв шинэчлэгдлээ");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Алдаа гарлаа");
    },
  });

  const blockMutation = useMutation({
    mutationFn: blockSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["available-slots"] });
      setBlockDialogOpen(false);
      setBlockTargetSlot(null);
      setBlockDuration("60");
      toast.success("Цаг амжилттай блоклолоо");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Алдаа гарлаа");
    },
  });

  const dates = Array.from({ length: 7 }, (_, i) => addDays(baseDate, i));

  const currentDayBookings = allBookings.filter((b: Booking) =>
    isSameDay(new Date(b.startTime), selectedDate),
  );

  const handleManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startTime) return;

    bookingMutation.mutate({
      serviceId: formData.serviceId,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      startTime: new Date(formData.startTime),
    });
  };

  const handleReschedule = async (bookingId: string, newTime: Date) => {
    rescheduleMutation.mutate({ id: bookingId, newStartTime: newTime });
  };

  const handleBlockSlot = (slot: Date) => {
    if (!formData.serviceId) return;
    setBlockTargetSlot(slot);
    setBlockDuration("60");
    setBlockDialogOpen(true);
  };

  const handleConfirmBlockSlot = () => {
    if (!blockTargetSlot || !formData.serviceId) return;

    const duration = parseInt(blockDuration, 10);
    if (isNaN(duration) || duration <= 0) {
      toast.error("Зөв хугацаа оруулна уу.");
      return;
    }

    blockMutation.mutate({
      serviceId: formData.serviceId,
      startTime: blockTargetSlot,
      duration,
    });
  };

  const goToToday = () => {
    const today = startOfDay(new Date());
    setSelectedDate(today);
    setBaseDate(startOfWeek(today, { weekStartsOn: 1 }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <header className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Цаг <span className="text-mauve font-extrabold">төлөвлөгч</span>
            </h1>
            <p className="text-dusty font-medium text-sm">
              Сул цаг харах болон захиалга удирдах.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white p-1.5 rounded-2xl border border-rose-soft/40 shadow-sm shadow-rose-soft/10">
            <span className="px-4 text-xs font-bold uppercase tracking-wider text-dusty border-r border-rose-soft/40">
              {format(baseDate, "yyyy", { locale: mn })}{" "}
              <span className="text-mauve">
                {format(baseDate, "MMM", { locale: mn })}
              </span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setBaseDate(subDays(baseDate, 7))}
                className="p-2 hover:bg-blush/30 rounded-xl transition-colors text-dusty hover:text-mauve outline-none"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-dusty hover:text-mauve transition-colors"
              >
                Өнөөдөр
              </button>
              <button
                onClick={() => setBaseDate(addDays(baseDate, 7))}
                className="p-2 hover:bg-blush/30 rounded-xl transition-colors text-dusty hover:text-mauve outline-none"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="border-l border-rose-soft/40 pl-2">
              <button
                onClick={() => {
                  refetchBookings();
                  queryClient.invalidateQueries({ queryKey: ["available-slots"] });
                }}
                disabled={isBookingsFetching}
                title="Мэдээллийг шинэчлэх"
                className="p-2 mr-1 bg-mauve/10 hover:bg-mauve/20 rounded-xl transition-colors text-mauve hover:text-accent-dark outline-none disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-5 h-5 ${isBookingsFetching ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Date Selection Grid */}
        <div className="grid grid-cols-7 gap-3">
          {dates.map((date) => {
            const isSelected = isSameDay(selectedDate, date);
            const isToday = isSameDay(new Date(), date);
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center justify-center py-5 rounded-3xl border-2 transition-all relative overflow-hidden ${
                  isSelected
                    ? "bg-mauve border-mauve text-white shadow-xl shadow-mauve/20 scale-105 z-10"
                    : "bg-white border-rose-soft/40 text-dusty hover:border-mauve hover:bg-blush/10"
                }`}
              >
                {isToday && !isSelected && (
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-mauve rounded-full"></div>
                )}
                <span className="text-[10px] uppercase font-bold tracking-widest leading-none mb-1 opacity-70">
                  {format(date, "EEE", { locale: mn })}
                </span>
                <span className="text-2xl font-extrabold tracking-tight leading-none">
                  {format(date, "dd")}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Left: Occupied Slots (Timeline) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-rose-soft/40 shadow-xl shadow-rose-soft/10 overflow-hidden">
            <div className="px-10 py-7 border-b border-rose-soft/30 flex justify-between items-center bg-blush/10">
              <h2 className="font-extrabold text-foreground flex items-center gap-3 tracking-tight">
                <CalendarIcon className="w-5 h-5 text-mauve" />
                {format(selectedDate, "yyyy.MM.dd", { locale: mn })}
              </h2>
              <span className="text-[10px] font-bold uppercase text-mauve bg-white px-4 py-1.5 rounded-full border border-mauve/20 tracking-wider">
                {currentDayBookings.length} захиалга
              </span>
            </div>

            <div className="p-8 md:p-10 space-y-5">
              {currentDayBookings.length === 0 ? (
                <div className="py-24 text-center space-y-4">
                  <div className="w-20 h-20 bg-blush/20 rounded-3xl flex items-center justify-center mx-auto border border-rose-soft/40">
                    <Sparkles className="w-8 h-8 text-mauve opacity-40" />
                  </div>
                  <p className="text-dusty font-bold italic text-sm">
                    Энэ өдөр захиалга байхгүй байна.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentDayBookings.map((booking: Booking) => (
                    <div
                      key={booking.id}
                      className={`group relative bg-white rounded-4xl border p-7 hover:shadow-xl hover:-translate-y-0.5 transition-all border-l-8 ${
                        booking.status === "BLOCKED"
                          ? "border-foreground border-l-foreground"
                          : "border-rose-soft/40 border-l-mauve"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-mauve" />
                              {format(
                                new Date(booking.startTime),
                                "HH:mm",
                              )} - {format(new Date(booking.endTime), "HH:mm")}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                booking.status === "PAID"
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                  : booking.status === "CONFIRMED"
                                    ? "bg-blue-50 text-blue-600 border-blue-100"
                                  : booking.status === "BLOCKED"
                                    ? "bg-foreground text-white border-foreground"
                                    : "bg-peach/30 text-mauve border-mauve/20"
                              }`}
                            >
                              {booking.status === "PAID"
                                ? "Төлөгдсөн"
                                : booking.status === "CONFIRMED"
                                  ? "Баталгаажсан"
                                : booking.status === "BLOCKED"
                                  ? "Завгүй"
                                  : "Баталгаажсан"}
                            </span>
                          </div>

                          <h3 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                            <User className="w-4 h-4 text-mauve/40" />
                            {booking.customerName}
                          </h3>

                          <div className="flex items-center gap-4 text-xs font-medium text-dusty">
                            <div className="flex items-center gap-1.5 bg-blush/30 px-3 py-1.5 rounded-xl border border-rose-soft/30">
                              <Phone className="w-3.5 h-3.5 text-mauve" />{" "}
                              {booking.customerPhone}
                            </div>
                            <span className="opacity-60 font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                              {booking.service.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                          <button
                            onClick={() => {
                              setReschedulingId(booking.id);
                              setFormData({
                                ...formData,
                                serviceId: booking.serviceId,
                              });
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="p-3 bg-white text-dusty hover:text-mauve hover:bg-blush/30 rounded-xl border border-rose-soft/40 hover:border-mauve hover:shadow-lg shadow-sm transition-all"
                            title="Цаг шилжүүлэх"
                          >
                            <RefreshCw className="w-5 h-5" />
                          </button>

                          {booking.status !== "PAID" &&
                            booking.status !== "BLOCKED" && (
                              <button
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: booking.id,
                                    status: "PAID",
                                  })
                                }
                                className="p-3 bg-white text-dusty hover:text-white hover:bg-emerald-500 rounded-xl border border-rose-soft/40 hover:border-emerald-500 hover:shadow-lg shadow-sm transition-all"
                                title="Төлөгдсөн"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </button>
                            )}

                          {booking.status === "BLOCKED" && (
                            <button
                              onClick={() =>
                                statusMutation.mutate({
                                  id: booking.id,
                                  status: "CANCELLED",
                                })
                              }
                              className="p-3 bg-white text-dusty hover:text-white hover:bg-rose-500 rounded-xl border border-rose-soft/40 hover:border-rose-500 hover:shadow-lg shadow-sm transition-all"
                              title="Блок гаргах"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions & Stats */}
        <div className="space-y-8">
          {/* Quick Stats (Top) */}
          <div className="grid grid-cols-2 gap-4 relative z-0">
            <div className="p-6 bg-white rounded-4xl border border-rose-soft/40 shadow-lg shadow-rose-soft/5 group overflow-hidden relative">
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <Clock className="w-16 h-16 text-mauve" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-dusty/60 mb-2">
                Сул цагууд
              </p>
              <p className="text-3xl font-extrabold text-mauve tracking-tight leading-none">
                {availableSlots.length}
              </p>
            </div>

            <div className="p-6 bg-foreground rounded-4xl border border-foreground shadow-lg shadow-foreground/10 group overflow-hidden relative">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <CalendarIcon className="w-16 h-16 text-white" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
                Захиалга
              </p>
              <p className="text-3xl font-extrabold text-white tracking-tight leading-none">
                {currentDayBookings.length}
              </p>
            </div>
          </div>

          {/* Reschedule View */}
          {reschedulingId && (
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-mauve shadow-2xl shadow-mauve/10 space-y-7 animate-in zoom-in-95 sticky top-24 z-10">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-foreground tracking-tight">
                  Цаг <span className="text-mauve">шилжүүлэх</span>
                </h3>
                <button
                  onClick={() => setReschedulingId(null)}
                  className="p-2 bg-blush/30 rounded-full hover:bg-blush/50 transition-colors"
                >
                  <X className="w-4 h-4 text-mauve" />
                </button>
              </div>
              <p className="text-xs font-bold text-dusty italic leading-relaxed">
                Сонгосон өдрийн сул цагуудаас сонгоно уу.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {isSlotsLoading ? (
                  <div className="col-span-2 py-10 flex justify-center">
                    <RefreshCw className="animate-spin text-mauve" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="col-span-2 p-6 text-center text-[10px] font-bold text-mauve bg-blush/20 rounded-3xl border border-mauve/20">
                    Сул цаг байхгүй
                  </div>
                ) : (
                  availableSlots.map((slot) => (
                    <button
                      key={slot.toISOString()}
                      onClick={() => handleReschedule(reschedulingId, slot)}
                      className="py-3.5 bg-white text-foreground rounded-2xl text-xs font-bold hover:bg-mauve hover:text-white transition-all shadow-sm border border-rose-soft/40 hover:border-mauve"
                    >
                      {format(slot, "HH:mm")}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Manual Booking Form */}
          {!reschedulingId && (
            <div className="bg-white p-10 rounded-[2.5rem] border border-rose-soft/40 shadow-xl shadow-rose-soft/10 space-y-8 sticky top-24 z-10">
              <h3 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
                <Plus className="w-5 h-5 text-mauve" /> Шууд{" "}
                <span className="text-mauve">захиалах</span>
              </h3>

              <form onSubmit={handleManualBooking} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-dusty ml-1">
                    Үйлчилгээ
                  </label>
                  <select
                    value={formData.serviceId}
                    onChange={(e) =>
                      setFormData({ ...formData, serviceId: e.target.value })
                    }
                    className="w-full bg-blush/20 border-2 border-transparent focus:border-mauve focus:bg-white px-5 py-4 rounded-2xl text-sm font-bold transition-all outline-none text-foreground cursor-pointer appearance-none"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.duration} мин)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-dusty ml-1 transition-colors group-focus-within:text-mauve">
                    Үйлчлүүлэгч
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-mauve opacity-40" />
                    <input
                      required
                      placeholder="Нэр"
                      value={formData.customerName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customerName: e.target.value,
                        })
                      }
                      className="w-full bg-blush/20 border-2 border-transparent focus:border-mauve focus:bg-white pl-11 pr-5 py-4 rounded-2xl text-sm font-bold transition-all outline-none text-foreground placeholder:text-dusty/40"
                    />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-dusty ml-1 transition-colors group-focus-within:text-mauve">
                    Холбоо барих
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-mauve opacity-40" />
                    <input
                      required
                      placeholder="Утас"
                      value={formData.customerPhone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customerPhone: e.target.value,
                        })
                      }
                      className="w-full bg-blush/20 border-2 border-transparent focus:border-mauve focus:bg-white pl-11 pr-5 py-4 rounded-2xl text-sm font-bold transition-all outline-none text-foreground placeholder:text-dusty/40"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-dusty ml-1 flex justify-between items-center">
                    <span>Сул цагууд</span>
                    <span className="text-mauve/60">
                      {format(selectedDate, "dd", { locale: mn })}-нд
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                    {isSlotsLoading ? (
                      <div className="col-span-2 py-6 flex justify-center">
                        <RefreshCw className="animate-spin text-mauve/30 w-5 h-5" />
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="col-span-2 p-6 text-center text-[10px] font-bold text-mauve bg-blush/20 rounded-2xl border border-mauve/20">
                        Сул цаг байхгүй
                      </div>
                    ) : (
                      availableSlots.map((slot) => (
                        <div
                          key={slot.toISOString()}
                          className="flex flex-col gap-1.5"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                startTime: slot.toISOString(),
                              })
                            }
                            className={`py-3 rounded-xl text-xs font-bold transition-all border-2 ${
                              formData.startTime === slot.toISOString()
                                ? "bg-mauve border-mauve text-white shadow-lg shadow-mauve/20"
                                : "bg-white border-rose-soft/40 text-foreground hover:border-mauve hover:bg-blush/20"
                            }`}
                          >
                            {format(slot, "HH:mm")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBlockSlot(slot)}
                            className="text-[9px] font-bold text-dusty/50 hover:text-rose-500 uppercase tracking-widest flex items-center justify-center gap-1 transition-colors"
                          >
                            <span className="w-1 h-1 bg-current rounded-full"></span>
                            Блоклох
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!formData.startTime || !formData.customerName}
                  className="w-full bg-mauve text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-mauve/20 hover:bg-accent-dark active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale disabled:scale-100 disabled:shadow-none"
                >
                  Захиалга үүсгэх
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Цаг блоклох</DialogTitle>
            <DialogDescription>
              {blockTargetSlot
                ? `${format(blockTargetSlot, "yyyy.MM.dd HH:mm", { locale: mn })} цагийг хэдэн минутаар блоклох вэ?`
                : "Блоклох хугацаагаа оруулна уу."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-dusty">
              Хугацаа сонгох
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "30 мин", minutes: 30 },
                { label: "1 цаг", minutes: 60 },
                { label: "2 цаг", minutes: 120 },
                { label: "3 цаг", minutes: 180 },
                { label: "1 өдөр", minutes: 1440 },
              ].map(({ label, minutes }) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setBlockDuration(String(minutes))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                    blockDuration === String(minutes)
                      ? "bg-mauve border-mauve text-white shadow-lg shadow-mauve/20"
                      : "bg-white border-rose-soft/40 text-dusty hover:border-mauve hover:bg-blush/20"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-dusty/80">
                Эсвэл минутаар оруулах
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={blockDuration}
                onChange={(e) => setBlockDuration(e.target.value)}
                className="w-full rounded-xl border border-rose-soft/50 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-mauve"
                placeholder="60"
              />
            </div>
          </div>

          <DialogFooter className="bg-transparent border-t-0 p-0 -mx-0 -mb-0">
            <button
              type="button"
              onClick={() => setBlockDialogOpen(false)}
              className="h-10 rounded-lg border border-rose-soft/60 px-4 text-sm font-bold text-dusty hover:bg-blush/20 transition-colors"
            >
              Болих
            </button>
            <button
              type="button"
              onClick={handleConfirmBlockSlot}
              disabled={blockMutation.isPending}
              className="h-10 rounded-lg bg-mauve px-4 text-sm font-bold text-white hover:bg-accent-dark transition-colors disabled:opacity-50"
            >
              {blockMutation.isPending ? "Блоклож байна..." : "Блоклох"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
