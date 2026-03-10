'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error for admin tracking
    console.error('Admin Panel Crash:', error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-cream/30 min-h-[60vh]">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl shadow-rose-soft/10 border border-rose-soft/40 p-12 text-center space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
        <div className="relative group mx-auto w-24 h-24">
           <div className="absolute inset-0 bg-mauve/20 rounded-4xl blur-2xl group-hover:bg-mauve/30 transition-colors opacity-60 animate-pulse" />
           <div className="relative w-24 h-24 bg-white rounded-4xl border-2 border-mauve/20 flex items-center justify-center shadow-lg shadow-mauve/5 overflow-hidden">
             <AlertTriangle className="w-12 h-12 text-mauve" />
           </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight leading-none">
            Админ <span className="text-mauve tracking-tighter italic">цонх</span> гацлаа
          </h2>
          <p className="text-dusty font-bold text-sm leading-relaxed max-w-[280px] mx-auto opacity-70">
            Захиалга болон үйлчилгээний дата уншихад алдаа гарлаа. Шалгаад дахин оролдоно уу.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 p-4 bg-blush/30 rounded-2xl border border-rose-soft/40 text-left overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-widest text-mauve/60 mb-2">Техникийн мэдээлэл:</p>
              <code className="text-xs text-foreground font-extrabold block truncate">{error.message}</code>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full h-14 bg-mauve hover:bg-accent-dark text-white rounded-2xl font-extrabold text-sm shadow-xl shadow-mauve/20 transition-all hover:-translate-y-0.5 active:scale-95 group overflow-hidden relative"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              Шинэчлэх
            </span>
          </Button>
          
          <Link href="/admin">
            <Button
              variant="outline"
              className="w-full h-14 border-rose-soft/60 hover:bg-blush/20 text-dusty hover:text-mauve rounded-2xl font-extrabold text-sm transition-all active:scale-95"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Админ нүүр хуудас
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
