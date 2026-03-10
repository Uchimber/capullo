'use client'

import { AlertCircle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="mn">
      <body>
        <div className="min-h-screen bg-cream flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-8 border border-rose-soft/40">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-rose-500" />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                Системд ноцтой алдаа гарлаа
              </h1>
              <p className="text-dusty font-medium text-sm leading-relaxed">
                Апп-ын ерөнхий бүтэц (Layout) ажиллахад алдаа гарлаа. Та доорх товчийг дарж системийг дахин ачаална уу.
              </p>
            </div>

            <Button
              onClick={() => reset()}
              size="lg"
              className="w-full h-14 bg-mauve text-white rounded-2xl font-bold shadow-xl shadow-mauve/20"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Системийг дахин ачаалах
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
