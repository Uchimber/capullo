import { prisma } from "@/lib/prisma";
import { updateAllWorkingHours, updateBusinessSettings } from "@/lib/actions";
import { Clock, Check, X, Save, Phone, MapPin } from "lucide-react";

export default async function AdminSettingsPage() {
  const days = [
    "Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"
  ];

  const workingHours = await prisma.workingHours.findMany();
  const hoursMap = Object.fromEntries(workingHours.map(h => [h.dayOfWeek, h]));

  const businessSettingsData = await prisma.businessSettings.findUnique({
    where: { id: 'singleton' }
  });

  const businessSettings = businessSettingsData || {
    phone: "98118008",
    address: "СБД 1-р хороо, 5-р хороолол 14251, Чингисийн өргөн чөлөө. \"Бизнес плаза\" төв. 302 тоот өрөө."
  };

  return (
    <div className="max-w-4xl mx-auto space-y-16 pb-24">
      {/* Business Info Section */}
      <section className="space-y-8">
        <header className="space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            Байгууллагын <span className="text-mauve">мэдээлэл</span>
          </h2>
          <p className="text-dusty font-medium text-sm leading-relaxed">Холбоо барих дугаар болон хаяг тохируулна уу.</p>
        </header>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-rose-soft/10 border border-rose-soft/40 p-10">
          <form action={updateBusinessSettings} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2 group">
                <label className="text-[10px] font-bold uppercase tracking-widest text-dusty ml-1 group-focus-within:text-mauve transition-colors">Утасны дугаар</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-mauve opacity-40" />
                  <input
                    name="phone"
                    defaultValue={businessSettings.phone}
                    className="w-full bg-blush/20 border-2 border-transparent focus:border-mauve focus:bg-white pl-11 pr-5 py-4 rounded-2xl text-sm font-bold transition-all outline-none text-foreground placeholder:text-dusty/40"
                  />
                </div>
              </div>
              <div className="space-y-2 group md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-dusty ml-1 group-focus-within:text-mauve transition-colors">Хаяг</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-5 w-4 h-4 text-mauve opacity-40" />
                  <textarea
                    name="address"
                    defaultValue={businessSettings.address}
                    rows={3}
                    className="w-full bg-blush/20 border-2 border-transparent focus:border-mauve focus:bg-white pl-11 pr-5 py-4 rounded-2xl text-sm font-bold transition-all outline-none text-foreground placeholder:text-dusty/40 resize-none"
                  />
                </div>
              </div>
            </div>
            <button 
              type="submit"
              className="bg-mauve text-white px-10 py-4 rounded-2xl font-bold text-sm hover:bg-accent-dark transition-all active:scale-[0.98] shadow-xl shadow-mauve/20"
            >
              Мэдээлэл хадгалах
            </button>
          </form>
        </div>
      </section>

      {/* Working Hours Section */}
      <section className="space-y-8">
        <form action={updateAllWorkingHours} className="space-y-8">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                Ажлын <span className="text-mauve">цаг</span>
              </h2>
              <p className="text-dusty font-medium text-sm leading-relaxed">Долоо хоногийн ажлын цагийн хуваарийг тохируулна уу.</p>
            </div>
            <button 
              type="submit"
              className="flex items-center gap-2 bg-foreground text-white px-10 py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all active:scale-[0.98] shadow-xl shadow-black/10"
            >
              <Save className="w-5 h-5" />
              Хуваарь хадгалах
            </button>
          </header>

          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-rose-soft/10 border border-rose-soft/40 divide-y divide-rose-soft/30 overflow-hidden">
            {days.map((day, index) => {
              const hours = hoursMap[index] || { startTime: "09:00", endTime: "18:00", isActive: false };
              return (
                <div key={day} className="p-8 hover:bg-blush/5 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-5 min-w-[180px]">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 ${hours.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                        {hours.isActive ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      </div>
                      <span className="font-extrabold text-foreground tracking-tight">{day}</span>
                    </div>

                    <div className="flex flex-1 items-center gap-4">
                      <div className="flex-1 flex items-center gap-2 relative">
                        <Clock className="absolute left-3 w-4 h-4 text-mauve opacity-40" />
                        <input 
                          type="time" 
                          name={`startTime_${index}`}
                          defaultValue={hours.startTime}
                          className="bg-blush/20 border-none rounded-xl pl-9 pr-3 py-3 text-sm font-bold focus:ring-2 focus:ring-mauve outline-none w-full text-foreground"
                        />
                      </div>
                      <span className="text-dusty/30 font-bold px-1">—</span>
                      <div className="flex-1 flex items-center gap-2 relative">
                        <Clock className="absolute left-3 w-4 h-4 text-mauve opacity-40" />
                        <input 
                          type="time" 
                          name={`endTime_${index}`}
                          defaultValue={hours.endTime}
                          className="bg-blush/20 border-none rounded-xl pl-9 pr-3 py-3 text-sm font-bold focus:ring-2 focus:ring-mauve outline-none w-full text-foreground"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input 
                          type="checkbox" 
                          name={`isActive_${index}`}
                          className="sr-only peer" 
                          defaultChecked={hours.isActive}
                        />
                        <div className="w-14 h-8 bg-rose-soft/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-rose-soft/80 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-mauve"></div>
                        <span className="ml-4 text-[10px] font-bold uppercase tracking-widest text-dusty peer-checked:text-mauve transition-colors">
                          {hours.isActive ? 'Нээлттэй' : 'Амарна'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </form>
      </section>
    </div>
  );
}
