"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Save,
  Clock,
  Tag,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  createService,
  updateService,
  deleteService,
  getServices,
} from "@/lib/actions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string | null;
}

interface Props {
  initialServices: Service[];
}

export default function AdminServicesClient({ initialServices }: Props) {
  const queryClient = useQueryClient();
  const [editingService, setEditingService] = useState<Service | null>(null);

  const {
    data: services = initialServices,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["services"],
    queryFn: () => getServices(),
    initialData: initialServices,
  });

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Үйлчилгээ амжилттай нэмэгдлээ");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Алдаа гарлаа");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      updateService(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setEditingService(null);
      toast.success("Үйлчилгээ амжилттай шинэчлэгдлээ");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Алдаа гарлаа");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Үйлчилгээ устгагдлаа");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Алдаа гарлаа");
    },
  });

  async function handleSubmit(formData: FormData) {
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Үйлчилгээний <span className="text-mauve">бүртгэл</span>
        </h1>
        <p className="text-dusty font-medium text-sm">
          Шинээр үйлчилгээ нэмэх эсвэл засах.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-10">
        {/* Form Section */}
        <div className="lg:col-span-4">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-rose-soft/10 border border-rose-soft/40 space-y-8 sticky top-24">
            {editingService && (
              <div className="absolute top-6 right-6">
                <button
                  onClick={() => setEditingService(null)}
                  className="p-2 bg-blush/30 text-mauve rounded-full hover:bg-blush/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <h2 className="text-xl font-extrabold flex items-center gap-3 text-foreground tracking-tight">
              {editingService ? (
                <>
                  <Edit2 className="w-5 h-5 text-mauve" /> Засах
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-mauve" /> Шинэ үйлчилгээ
                </>
              )}
            </h2>

            <form
              action={handleSubmit}
              key={editingService?.id || "new"}
              className="space-y-6"
            >
              <div className="space-y-2 group">
                <label className="text-[10px] font-bold uppercase tracking-widest text-dusty ml-1 group-focus-within:text-mauve transition-colors">
                  Нэр
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingService?.name || ""}
                  className="w-full bg-blush/20 border-2 border-transparent focus:border-mauve focus:bg-white px-5 py-4 rounded-2xl text-sm font-bold transition-all outline-none text-foreground placeholder:text-dusty/40"
                  placeholder="Жишээ: Үс засалт"
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-bold uppercase tracking-widest text-dusty ml-1 group-focus-within:text-mauve transition-colors">
                  Хугацаа (минут)
                </label>
                <input
                  name="duration"
                  type="number"
                  required
                  defaultValue={editingService?.duration || ""}
                  className="w-full bg-blush/20 border-2 border-transparent focus:border-mauve focus:bg-white px-5 py-4 rounded-2xl text-sm font-bold transition-all outline-none text-foreground placeholder:text-dusty/40"
                  placeholder="30"
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-bold uppercase tracking-widest text-dusty ml-1 group-focus-within:text-mauve transition-colors">
                  Үнэ (₮)
                </label>
                <input
                  name="price"
                  type="number"
                  required
                  defaultValue={editingService?.price || ""}
                  className="w-full bg-blush/20 border-2 border-transparent focus:border-mauve focus:bg-white px-5 py-4 rounded-2xl text-sm font-bold transition-all outline-none text-foreground placeholder:text-dusty/40"
                  placeholder="20,000"
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-bold uppercase tracking-widest text-dusty ml-1 group-focus-within:text-mauve transition-colors">
                  Тайлбар
                </label>
                <textarea
                  name="description"
                  defaultValue={editingService?.description || ""}
                  rows={3}
                  className="w-full bg-blush/20 border-2 border-transparent focus:border-mauve focus:bg-white px-5 py-4 rounded-2xl text-sm font-bold transition-all outline-none text-foreground placeholder:text-dusty/40 resize-none"
                  placeholder="Товч тайлбар..."
                />
              </div>

              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className={`w-full h-auto py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] shadow-xl flex items-center justify-center gap-2 ${
                  editingService
                    ? "bg-foreground text-white shadow-foreground/20 hover:bg-foreground/90"
                    : "bg-mauve text-white shadow-mauve/20 hover:bg-mauve/90"
                }`}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : editingService ? (
                  <>
                    <Save className="w-5 h-5" /> Хадгалах
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" /> Нэмэх
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-rose-soft/10 border border-rose-soft/40 overflow-hidden">
            <h2 className="px-10 py-7 border-b border-rose-soft/30 font-extrabold text-foreground bg-blush/10 flex items-center justify-between tracking-tight">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-mauve" /> Идэвхтэй
                үйлчилгээнүүд
              </div>
              <button
                onClick={() => refetch()}
                className="p-2 bg-white border border-rose-soft/40 rounded-xl text-dusty hover:text-mauve hover:border-mauve transition-all"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
                />
              </button>
            </h2>
            <div className="divide-y divide-rose-soft/30">
              {services.map((service: Service) => (
                <div
                  key={service.id}
                  className="px-10 py-8 flex justify-between items-center group hover:bg-blush/5 transition-colors"
                >
                  <div className="space-y-2">
                    <h3 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
                      {service.name}
                      {editingService?.id === service.id && (
                        <span className="text-[9px] bg-peach/30 text-mauve px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-mauve/10">
                          Засаж байна
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-6">
                      <p className="text-xs font-bold text-dusty flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-mauve" />{" "}
                        {service.duration} мин
                      </p>
                      <p className="text-lg font-extrabold text-mauve tracking-tight">
                        {service.price.toLocaleString()} ₮
                      </p>
                    </div>
                    {service.description && (
                      <p className="text-sm font-medium text-dusty mt-1 leading-relaxed max-w-md">
                        {service.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                    <button
                      onClick={() => {
                        setEditingService(service);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="p-3 bg-white text-dusty hover:text-mauve hover:shadow-lg rounded-xl border border-rose-soft/40 transition-all active:scale-90"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm("Энэ үйлчилгээг устгахдаа итгэлтэй байна уу?")
                        ) {
                          deleteMutation.mutate(service.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="p-3 bg-white text-dusty hover:text-rose-500 hover:shadow-lg rounded-xl border border-rose-soft/40 transition-all active:scale-90 disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {services.length === 0 && (
                <div className="px-10 py-24 text-center space-y-4">
                  <div className="w-20 h-20 bg-blush/20 rounded-3xl flex items-center justify-center mx-auto border border-rose-soft/40 opacity-40">
                    <Tag className="w-8 h-8 text-mauve" />
                  </div>
                  <p className="text-dusty font-bold italic text-sm">
                    Бүртгэлтэй үйлчилгээ байхгүй байна.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
