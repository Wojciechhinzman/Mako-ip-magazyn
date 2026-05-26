"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRightLeft, BarChart3, ClipboardList, FolderKanban, History, LogOut, Menu, Package, PackageMinus, PackagePlus, Settings, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

const links = [
  { href: "/", label: "Panel", icon: BarChart3 },
  { href: "/stany", label: "Stany magazynowe", icon: Package },
  { href: "/przyjecie", label: "Przyjęcie", icon: PackagePlus },
  { href: "/wydanie", label: "Wydanie", icon: PackageMinus },
  { href: "/przesuniecie", label: "Przesunięcie", icon: ArrowRightLeft },
  { href: "/historia", label: "Historia", icon: History },
  { href: "/magazyny", label: "Magazyny", icon: Package },
  { href: "/pracownicy", label: "Pracownicy", icon: Users },
  { href: "/projekty", label: "Projekty", icon: FolderKanban },
  { href: "/ustawienia", label: "Ustawienia", icon: Settings }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-background min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-[#0b1017]/95 backdrop-blur lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-white">
            <ClipboardList className="h-6 w-6 text-brand" />
            MAKO-IP Magazyn
          </Link>
          <button className="btn-secondary min-h-10 px-3 py-2" onClick={() => setOpen((value) => !value)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <aside className={`${open ? "block" : "hidden"} fixed inset-x-0 top-16 z-20 border-b border-line bg-[#0b1017] p-4 lg:fixed lg:inset-y-0 lg:left-0 lg:top-0 lg:block lg:w-72 lg:border-b-0 lg:border-r lg:p-5`}>
        <Link href="/" className="mb-8 hidden items-center gap-3 lg:flex">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand text-slate-950">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">MAKO-IP</p>
            <p className="font-bold text-white">Magazyn</p>
          </div>
        </Link>
        <nav className="grid gap-2">
          {links.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex min-h-12 items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold transition ${
                  active ? "bg-brand text-slate-950" : "text-slate-300 hover:bg-field hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <button className="mt-6 flex min-h-12 w-full items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-field hover:text-white" onClick={() => supabase.auth.signOut()}>
          <LogOut className="h-5 w-5" />
          Wyloguj
        </button>
      </aside>

      <main className="px-4 py-6 sm:px-6 lg:ml-72 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
