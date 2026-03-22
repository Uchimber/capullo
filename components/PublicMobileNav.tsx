"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Menu, Phone, Sparkles, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function PublicMobileNav() {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="md:hidden shrink-0 border-rose-soft/60 bg-white/90 text-foreground shadow-sm"
        aria-label="Цэс нээх"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className={cn(
            "fixed inset-y-0 right-0 left-auto top-0 h-full max-h-[100dvh] w-[min(100vw-1rem,20rem)] max-w-none translate-x-0 translate-y-0 rounded-none border-l border-rose-soft/50 p-0 shadow-xl",
            "gap-0 sm:max-w-none"
          )}
        >
          <DialogHeader className="border-b border-rose-soft/40 px-5 py-4 text-left">
            <DialogTitle className="text-lg font-extrabold tracking-tight">
              Capullo
            </DialogTitle>
            <p className="text-xs font-medium text-dusty">Цэс — гар утас</p>
          </DialogHeader>
          <nav className="flex flex-col gap-1 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Link
              href="/#services"
              onClick={close}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold text-dusty transition-colors hover:bg-rose-soft/30 hover:text-mauve"
            >
              <Sparkles className="size-5 shrink-0 opacity-80" />
              Үйлчилгээ
            </Link>
            <Link
              href="/#contact"
              onClick={close}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold text-dusty transition-colors hover:bg-rose-soft/30 hover:text-mauve"
            >
              <Phone className="size-5 shrink-0 opacity-80" />
              Холбоо барих
            </Link>
            <div className="my-2 h-px bg-rose-soft/40" />
            <Link
              href="/admin"
              onClick={close}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold text-dusty transition-colors hover:bg-rose-soft/30 hover:text-mauve"
            >
              <UserCircle className="size-5 shrink-0 opacity-80" />
              Ажилчдын нэвтрэх
            </Link>
          </nav>
        </DialogContent>
      </Dialog>
    </>
  );
}
