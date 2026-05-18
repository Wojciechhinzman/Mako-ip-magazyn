"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, FolderKanban, History, Package, PackageMinus, PackagePlus, Search, Settings, Users } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { formatDate, formatNumber, currentMonthStartIso } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { Item, StockMovement } from "@/lib/types";

const modules = [
  {
    href: "/stany",
    title: "Stany magazynowe",
    description: "Sprawdź aktualne ilości, rozmiary i materiały.",
    icon: Search
  },
  {
    href: "/przyjecie",
    title: "Przyjęcie",
    description: "Dodaj materiał na magazyn albo zwiększ istniejący stan.",
    icon: PackagePlus
  },
  {
    href: "/wydanie",
    title: "Wydanie",
    description: "Zdejmij materiał ze stanu i przypisz go do projektu.",
    icon: PackageMinus
  },
  {
    href: "/historia",
    title: "Historia",
    description: "Przeglądaj operacje, filtruj i eksportuj dane.",
    icon: History
  },
  {
    href: "/pracownicy",
    title: "Pracownicy",
    description: "Dodawaj osoby i zarządzaj ich aktywnością.",
    icon: Users
  },
  {
    href: "/projekty",
    title: "Projekty",
    description: "Utrzymuj listę projektów używaną przy wydaniach.",
    icon: FolderKanban
  },
  {
    href: "/ustawienia",
    title: "Ustawienia",
    description: "Konfiguracja Supabase i informacje techniczne.",
    icon: Settings
  }
];

export default function DashboardPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [recent, setRecent] = useState<StockMovement[]>([]);
  const [monthlyCount, setMonthlyCount] = useState(0);

  useEffect(() => {
    async function load() {
      const [{ data: itemData }, { data: recentData }, { count }] = await Promise.all([
        supabase.from("items").select("*").order("updated_at", { ascending: false }),
        supabase.from("stock_movements").select("*, employees(full_name), projects(name, code)").order("created_at", { ascending: false }).limit(10),
        supabase.from("stock_movements").select("id", { count: "exact", head: true }).gte("created_at", currentMonthStartIso())
      ]);

      setItems(itemData || []);
      setRecent((recentData as StockMovement[]) || []);
      setMonthlyCount(count || 0);
    }

    load();
  }, []);

  const lowStock = [...items].sort((a, b) => a.quantity - b.quantity).slice(0, 6);

  return (
    <>
      <PageHeader title="Panel magazynu MAKO-IP" description="Jedna strona startowa do uruchamiania modułów i szybkiego podglądu magazynu." />

      <section className="grid gap-4 md:grid-cols-3">
        <Stat icon={<Package className="h-6 w-6" />} label="Artykuły w magazynie" value={items.length} />
        <Stat icon={<History className="h-6 w-6" />} label="Operacje w tym miesiącu" value={monthlyCount} />
        <Stat icon={<AlertTriangle className="h-6 w-6" />} label="Pozycje z najniższym stanem" value={lowStock.length} />
      </section>

      <section className="mt-6">
        <h2 className="mb-4 text-lg font-bold text-white">Moduły</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.href} href={module.href} className="group rounded-lg border border-line bg-panel p-5 transition hover:border-brand hover:bg-field">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-slate-950">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-white">{module.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{module.description}</p>
                <p className="mt-4 text-sm font-semibold text-brand">Otwórz moduł</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="card p-5">
          <h2 className="mb-4 text-lg font-bold text-white">Ostatnie operacje</h2>
          {recent.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Typ</th>
                    <th>Artykuł</th>
                    <th>Ilość</th>
                    <th>Osoba</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((movement) => (
                    <tr key={movement.id}>
                      <td>{movement.type === "in" ? "Przyjęcie" : "Wydanie"}</td>
                      <td>{movement.item_name}</td>
                      <td>
                        {formatNumber(movement.quantity)} {movement.unit}
                      </td>
                      <td>{movement.employees?.full_name}</td>
                      <td>{formatDate(movement.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-lg font-bold text-white">Najniższe stany</h2>
          {lowStock.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {lowStock.map((item) => (
                <div key={item.id} className="rounded-md border border-line bg-field p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-sm text-slate-400">
                        {item.size}, {item.material}
                      </p>
                    </div>
                    <p className="text-right font-bold text-brand">
                      {formatNumber(item.quantity)} {item.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-brand/10 text-brand">{icon}</div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
