"use client";

import { useState } from "react";
import { format } from "date-fns";
import { getBookings, updateBookingStatus } from "@/lib/actions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  X,
  Phone,
  User,
  Calendar,
  Clock,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
} from "lucide-react";

interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  startTime: string;
  endTime: string;
  status: string;
  serviceId: string;
  paymentId: string | null;
  createdAt: string;
  service: { name: string; price: number };
}

const STATUS_TABS = [
  { key: "PAID", label: "Төлөгдсөн", shortLabel: "Төлсөн", color: "emerald" },
  { key: "CONFIRMED", label: "Баталгаажсан", shortLabel: "Баталгаа", color: "mauve" },
  { key: "CANCELLED", label: "Цуцлагдсан", shortLabel: "Цуцалт", color: "rose" },
  { key: "BLOCKED", label: "Завгүй", shortLabel: "Завгүй", color: "gray" },
  { key: "ALL", label: "Бүгд", shortLabel: "Бүгд", color: "mauve" },
];

export default function AdminBookingsClient() {
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState("CONFIRMED");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["bookings", page, activeStatus, search],
    queryFn: () =>
      getBookings({
        page,
        status: activeStatus,
        search,
        limit: 15,
      }),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const bookings = data?.bookings || [];
  const totalPages = data?.pages || 1;
  const total = data?.total || 0;

  const statusMutation = useMutation({
    mutationFn: ({
      bookingId,
      newStatus,
    }: {
      bookingId: string;
      newStatus: string;
    }) => updateBookingStatus(bookingId, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Захиалгын төлөв шинэчлэгдлээ");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Алдаа гарлаа");
    },
  });

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    statusMutation.mutate({ bookingId, newStatus });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      PAID: {
        bg: "bg-emerald-50 border-emerald-100",
        text: "text-emerald-600",
        label: "Төлөгдсөн",
      },
      CONFIRMED: {
        bg: "bg-peach/30 border-mauve/20",
        text: "text-mauve",
        label: "Баталгаажсан",
      },
      CANCELLED: {
        bg: "bg-rose-50 border-rose-100",
        text: "text-rose-500",
        label: "Цуцлагдсан",
      },
      BLOCKED: {
        bg: "bg-foreground border-foreground",
        text: "text-white",
        label: "Завгүй",
      },
    };
    const s = map[status] || map.CONFIRMED;
    return (
      <span
        className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest border shadow-sm ${s.bg} ${s.text}`}
      >
        {s.label}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Бүх <span className="text-mauve">захиалгууд</span>
        </h1>
        <p className="text-dusty font-medium text-xs sm:text-sm">
          Нийт захиалгын мэдээлэл болон төлөв удирдах.
        </p>
      </header>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col gap-4 w-full min-w-0 md:flex-row md:items-center md:justify-between">
        {/* Mobile: full-bleed horizontal scroll; snap for touch */}
        <div className="relative w-full min-w-0 md:max-w-none -mx-1 px-1 sm:mx-0 sm:px-0">
          <div
            role="tablist"
            aria-label="Захиалгын төлөв"
            className="flex w-full min-w-0 touch-pan-x snap-x snap-mandatory gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth bg-white p-1 sm:p-1.5 sm:gap-1.5 rounded-2xl border border-rose-soft/40 shadow-sm [scrollbar-width:thin] pb-1 sm:pb-0 [-webkit-overflow-scrolling:touch] custom-scrollbar"
          >
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeStatus === tab.key}
                onClick={() => {
                  setActiveStatus(tab.key);
                  setPage(1);
                }}
                className={`shrink-0 snap-start rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-all sm:px-5 sm:py-2.5 sm:text-xs sm:tracking-wider ${
                  activeStatus === tab.key
                    ? "bg-mauve text-white shadow-md shadow-mauve/20 sm:shadow-lg"
                    : "text-dusty hover:bg-blush/30 hover:text-mauve active:scale-[0.98]"
                }`}
              >
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSearch}
          className="flex items-center gap-2 w-full md:w-auto"
        >
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dusty" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Нэр, утас хайх..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-rose-soft/40 rounded-xl text-sm font-semibold outline-none focus:border-mauve transition-colors"
            />
          </div>
          <button
            type="submit"
            className="p-3 bg-mauve text-white rounded-xl hover:bg-accent-dark transition-colors shadow-sm"
          >
            <Search className="w-4 h-4" />
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setPage(1);
              }}
              className="p-3 bg-white text-dusty rounded-xl hover:bg-blush/30 transition-colors border border-rose-soft/40"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-dusty min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <Filter className="w-3.5 h-3.5 shrink-0 text-mauve" />
            <span className="truncate">
              Нийт: <span className="text-foreground">{total}</span> захиалга
            </span>
          </span>
        </div>

        <button
          onClick={() => {
            refetch();
          }}
          disabled={isFetching}
          className="flex shrink-0 items-center justify-center gap-2 self-start px-4 py-2.5 bg-white border border-rose-soft/40 rounded-xl text-xs font-bold text-dusty hover:text-mauve hover:border-mauve transition-all disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 shrink-0 ${isFetching ? "animate-spin text-mauve" : ""}`}
          />
          {isFetching ? "Шинэчилж байна..." : "Шинэчлэх"}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-rose-soft/10 border border-rose-soft/40 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blush/10 border-b border-rose-soft/30">
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-dusty">
                  Үйлчлүүлэгч
                </th>
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-dusty">
                  Үйлчилгээ
                </th>
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-dusty">
                  Цаг
                </th>
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-dusty">
                  Төлөв
                </th>
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-dusty text-right">
                  Үйлдэл
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-soft/20">
              {bookings.map((booking: Booking) => (
                <tr
                  key={booking.id}
                  className="hover:bg-blush/5 transition-colors"
                >
                  <td className="px-8 py-6">
                    <div className="space-y-1.5">
                      <p className="font-extrabold text-foreground tracking-tight flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-mauve/40" />{" "}
                        {booking.customerName}
                      </p>
                      <p className="text-xs font-bold text-dusty flex items-center gap-2">
                        <span className="w-6 h-6 bg-blush/30 rounded-lg flex items-center justify-center shrink-0">
                          <Phone className="w-3 h-3 text-mauve" />
                        </span>
                        {booking.customerPhone}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1.5">
                      <p className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-mauve/40" />
                        {booking.service.name}
                      </p>
                      <p className="text-xs font-extrabold text-mauve tracking-tight">
                        {booking.service.price.toLocaleString()} ₮
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1.5">
                      <p className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-mauve/40" />{" "}
                        {format(new Date(booking.startTime), "yyyy.MM.dd")}
                      </p>
                      <p className="text-xs font-bold text-dusty flex items-center gap-2 opacity-60">
                        <Clock className="w-3.5 h-3.5" />{" "}
                        {format(new Date(booking.startTime), "HH:mm")} -{" "}
                        {format(new Date(booking.endTime), "HH:mm")}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-6">{statusBadge(booking.status)}</td>
                  <td className="px-8 py-6">
                    <div className="flex justify-end gap-2 flex-wrap">
                      {booking.status !== "PAID" &&
                        booking.status !== "BLOCKED" && (
                          <button
                            onClick={() =>
                              handleStatusChange(booking.id, "PAID")
                            }
                            title="Төлөгдсөн гэж тэмдэглэх"
                            className="p-3 bg-white text-emerald-500 hover:text-white hover:bg-emerald-500 rounded-xl transition-all active:scale-90 border border-rose-soft/40 hover:border-emerald-500 shadow-sm"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        )}
                      {booking.status !== "CANCELLED" && (
                        <button
                          onClick={() =>
                            handleStatusChange(booking.id, "CANCELLED")
                          }
                          title={
                            booking.status === "BLOCKED"
                              ? "Блок гаргах"
                              : "Цуцлах"
                          }
                          className="p-3 bg-white text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all active:scale-90 border border-rose-soft/40 hover:border-rose-500 shadow-sm"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && bookings.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-10 py-24 text-center text-dusty font-bold italic text-sm"
                  >
                    {search
                      ? `"${search}" хайлтад тохирох захиалга олдсонгүй.`
                      : "Захиалга бүртгэгдээгүй байна."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-8 py-5 border-t border-rose-soft/30 bg-blush/5 flex items-center justify-between">
            <p className="text-xs font-bold text-dusty">
              Хуудас <span className="text-foreground">{page}</span> /{" "}
              {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2.5 bg-white rounded-xl border border-rose-soft/40 text-dusty hover:text-mauve hover:border-mauve transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${
                      p === page
                        ? "bg-mauve text-white shadow-lg shadow-mauve/20"
                        : "bg-white border border-rose-soft/40 text-dusty hover:text-mauve hover:border-mauve"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2.5 bg-white rounded-xl border border-rose-soft/40 text-dusty hover:text-mauve hover:border-mauve transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
