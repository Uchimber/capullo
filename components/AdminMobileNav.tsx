"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Home,
  List,
  Menu,
  Settings,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/admin/services",
    label: "Үйлчилгээ",
    icon: Sparkles,
  },
  {
    href: "/admin/scheduler",
    label: "Төлөвлөгч",
    icon: Calendar,
  },
  {
    href: "/admin/bookings",
    label: "Захиалга",
    icon: List,
  },
  {
    href: "/admin/settings",
    label: "Тохиргоо",
    icon: Settings,
  },
] as const;

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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
          "gap-0 sm:max-w-none",
          "data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right"
        )}
      >
        <DialogHeader className="border-b border-rose-soft/40 px-5 py-4 text-left">
          <DialogTitle className="text-lg font-extrabold tracking-tight">
            Capullo{" "}
            <span className="text-mauve font-bold text-sm">admin</span>
          </DialogTitle>
          <p className="text-xs font-medium text-dusty">Цэс — гар утас</p>
        </DialogHeader>
        <nav className="flex flex-col gap-1 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold transition-colors",
                  active
                    ? "bg-rose-soft/50 text-mauve"
                    : "text-dusty hover:bg-rose-soft/30 hover:text-mauve"
                )}
              >
                <Icon className="size-5 shrink-0 opacity-80" />
                {label}
              </Link>
            );
          })}
          <div className="my-2 h-px bg-rose-soft/40" />
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold text-dusty transition-colors hover:bg-rose-soft/30 hover:text-mauve"
          >
            <Home className="size-5 shrink-0 opacity-80" />
            Нүүр хуудас
          </Link>
        </nav>
      </DialogContent>
      </Dialog>
    </>
  );
}
