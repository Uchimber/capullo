import { Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 animate-in fade-in duration-1000">
      <div className="relative group mx-auto w-32 h-32 mb-10">
         <div className="absolute inset-0 bg-mauve/40 rounded-[3rem] blur-3xl animate-pulse" />
         <div className="relative w-32 h-32 bg-white rounded-[3rem] border-2 border-rose-soft/40 flex items-center justify-center shadow-2xl shadow-rose-soft/20 overflow-hidden">
           <div className="w-16 h-16 bg-blush/30 rounded-full flex items-center justify-center border border-rose-soft/20 animate-bounce">
             <Sparkles className="w-10 h-10 text-mauve" />
           </div>
         </div>
      </div>
      
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-black text-foreground tracking-tight italic">Capullo</h2>
        <p className="text-dusty font-extrabold text-sm tracking-[0.3em] uppercase opacity-70 flex items-center justify-center gap-4">
           Удахгүй <span className="w-1.5 h-1.5 bg-mauve rounded-full animate-ping" /> нээгдэнэ
        </p>
      </div>
    </div>
  );
}
