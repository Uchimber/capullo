import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Sparkles, Calendar, Settings, List, Home } from "lucide-react";
import { AdminMobileNav } from "@/components/AdminMobileNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-white/80 backdrop-blur-xl border-b border-rose-soft/50 px-4 sm:px-8 py-4 flex justify-between items-center gap-3 sticky top-0 z-50">
        <div className="flex items-center gap-4 md:gap-12 min-w-0 flex-1">
          <Link href="/admin" className="flex items-center gap-2 group shrink-0 min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">
              Capullo
              <span className="text-mauve font-bold text-sm ml-1 group-hover:text-accent-dark transition-colors">
                admin
              </span>
            </h1>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <NavLink href="/admin/services" icon={<Sparkles className="w-4 h-4" />}>
              Үйлчилгээ
            </NavLink>
            <NavLink href="/admin/scheduler" icon={<Calendar className="w-4 h-4" />}>
              Төлөвлөгч
            </NavLink>
            <NavLink href="/admin/bookings" icon={<List className="w-4 h-4" />}>
              Захиалга
            </NavLink>
            <NavLink href="/admin/settings" icon={<Settings className="w-4 h-4" />}>
              Тохиргоо
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link
            href="/"
            aria-label="Нүүр хуудас"
            title="Нүүр хуудас"
            className="text-xs font-bold text-dusty hover:text-mauve flex items-center gap-1.5 transition-colors px-2 sm:px-3 py-1.5 rounded-full hover:bg-rose-soft/20"
          >
            <Home className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Нүүр хуудас</span>
          </Link>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "w-9 h-9 border-2 border-rose-soft",
              },
            }}
          />
          <AdminMobileNav />
        </div>
      </header>
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-2 text-sm font-bold text-dusty hover:text-mauve transition-all group relative py-1"
    >
      <span className="text-dusty/50 group-hover:text-mauve transition-colors">
        {icon}
      </span>
      {children}
    </Link>
  );
}
