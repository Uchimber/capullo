import { Sparkles, RefreshCw } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700">
      <div className="relative group mx-auto w-24 h-24">
         <div className="absolute inset-0 bg-mauve/30 rounded-4xl blur-2xl animate-pulse" />
         <div className="relative w-24 h-24 bg-white rounded-4xl border border-rose-soft/40 flex items-center justify-center shadow-xl shadow-rose-soft/10">
           <RefreshCw className="w-10 h-10 text-mauve animate-spin" />
         </div>
      </div>
      
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-mauve animate-bounce" />
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight italic">Уншиж <span className="text-mauve tracking-tighter">байна</span>...</h2>
        </div>
        <p className="text-dusty font-bold text-sm tracking-widest uppercase opacity-60">
           Мэдээллийг шинэчилж байна. Түр хүлээнэ үү.
        </p>
      </div>
    </div>
  );
}
