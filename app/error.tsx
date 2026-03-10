'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Application Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-rose-soft/20 border border-rose-soft/40 p-10 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto border border-rose-100 shadow-inner">
          <AlertCircle className="w-10 h-10 text-rose-500" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Уучлаарай, алдаа гарлаа
          </h1>
          <p className="text-dusty font-medium leading-relaxed">
            Систем ажиллахад гэнэтийн алдаа гарлаа. Та доорх товчийг дарж хуудсыг дахин ачаална уу.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-rose-50/50 rounded-xl border border-rose-100 text-left overflow-auto max-h-32">
              <code className="text-xs text-rose-600 font-mono">{error.message}</code>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={() => reset()}
            className="w-full h-12 bg-mauve hover:bg-mauve/90 text-white rounded-2xl font-bold shadow-lg shadow-mauve/20 transition-all active:scale-95"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Дахин оролдох
          </Button>
          <Link href="/" className="w-full">
            <Button
              variant="outline"
              className="w-full h-12 border-rose-soft/60 hover:bg-blush/30 text-dusty rounded-2xl font-bold transition-all active:scale-95"
            >
              <Home className="w-4 h-4 mr-2" />
              Нүүр хуудас
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
