"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FolderKanban, Package, PackageSearch, Settings, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/lib/supabase";

const actions = [
  {
    href: "/asortyment",
    title: "Asortyment",
    description: "Edycja nazw, rozmiarow, materialow i jednostek.",
    icon: PackageSearch,
    adminOnly: true
  },
  {
    href: "/magazyny",
    title: "Magazyny",
    description: "Dodawanie, zmiana nazw i aktywacja magazynów.",
    icon: Package,
    adminOnly: true
  },
  {
    href: "/pracownicy",
    title: "Pracownicy",
    description: "Dodawanie pracowników i zmiana ich statusu.",
    icon: Users,
    adminOnly: false
  },
  {
    href: "/projekty",
    title: "Projekty",
    description: "Dodawanie projektów i zmiana ich statusu.",
    icon: FolderKanban,
    adminOnly: false
  }
];

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: userData }, { data: adminData }] = await Promise.all([supabase.auth.getUser(), supabase.rpc("current_user_is_admin")]);
      setEmail(userData.user?.email || "");
      setIsAdmin(Boolean(adminData));
    }

    load();
  }, []);

  return (
    <>
      <PageHeader title="Ustawienia" description="Panel skrótów administracyjnych i informacji o koncie." />

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-brand/10 text-brand">
            <Settings className="h-6 w-6" />
          </div>
          <p className="text-sm text-slate-400">Zalogowany użytkownik</p>
          <p className="mt-2 font-semibold text-white">{email || "Brak danych"}</p>
        </div>
        <div className="card p-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-brand/10 text-brand">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="text-sm text-slate-400">Uprawnienia</p>
          <p className="mt-2 font-semibold text-white">{isAdmin ? "Administrator" : "Użytkownik standardowy"}</p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-lg font-bold text-white">Zarządzanie</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            const disabled = action.adminOnly && !isAdmin;

            if (disabled) {
              return (
                <div key={action.href} className="rounded-lg border border-line bg-field p-5 opacity-60">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-slate-500/10 text-slate-400">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-white">{action.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{action.description}</p>
                  <p className="mt-4 text-sm font-semibold text-amber-200">Wymaga administratora</p>
                </div>
              );
            }

            return (
              <Link key={action.href} href={action.href} className="rounded-lg border border-line bg-field p-5 transition hover:border-brand">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-brand/10 text-brand">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-white">{action.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{action.description}</p>
                <p className="mt-4 text-sm font-semibold text-brand">Otwórz</p>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
