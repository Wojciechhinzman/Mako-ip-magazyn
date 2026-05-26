"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { downloadExcel } from "@/lib/excel";
import { formatDate, formatNumber } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { ItemStock, Warehouse } from "@/lib/types";

type StockTotal = {
  itemId: string;
  name: string;
  size: string;
  material: string;
  unit: string;
  quantity: number;
  updatedAt: string;
};

export default function StockPage() {
  const [stocks, setStocks] = useState<ItemStock[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [search, setSearch] = useState("");

  async function loadStocks() {
    const [stockResult, warehouseResult] = await Promise.all([
      supabase.from("item_stocks").select("*, items(*), warehouses(*)").order("warehouse_id"),
      supabase.from("warehouses").select("*").eq("active", true).order("name")
    ]);

    setStocks((stockResult.data as unknown as ItemStock[]) || []);
    setWarehouses(warehouseResult.data || []);
  }

  useEffect(() => {
    loadStocks();
  }, []);

  const filtered = useMemo(() => {
    const phrase = search.toLowerCase();
    return stocks.filter((stock) => {
      const item = stock.items;
      if (!item || stock.quantity <= 0) return false;
      const text = `${item.name} ${item.size} ${item.material} ${stock.warehouses?.name || ""}`.toLowerCase();
      return text.includes(phrase) && (!warehouseFilter || stock.warehouse_id === warehouseFilter);
    });
  }, [stocks, search, warehouseFilter]);

  const totals = useMemo(() => {
    const phrase = search.toLowerCase();
    const grouped = new Map<string, StockTotal>();

    for (const stock of stocks) {
      const item = stock.items;
      if (!item || stock.quantity <= 0) continue;

      const text = `${item.name} ${item.size} ${item.material}`.toLowerCase();
      if (!text.includes(phrase)) continue;

      const current = grouped.get(item.id);
      if (!current) {
        grouped.set(item.id, {
          itemId: item.id,
          name: item.name,
          size: item.size,
          material: item.material,
          unit: item.unit,
          quantity: stock.quantity,
          updatedAt: stock.updated_at
        });
      } else {
        current.quantity += stock.quantity;
        if (new Date(stock.updated_at) > new Date(current.updatedAt)) current.updatedAt = stock.updated_at;
      }
    }

    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [stocks, search]);

  const exportRows = warehouseFilter
    ? filtered.map((stock) => ({
        Magazyn: stock.warehouses?.name || "",
        "Nazwa artykułu": stock.items?.name || "",
        Rozmiar: stock.items?.size || "",
        Materiał: stock.items?.material || "",
        Jednostka: stock.items?.unit || "",
        "Ilość na stanie": stock.quantity,
        "Ostatnia zmiana": formatDate(stock.updated_at)
      }))
    : totals.map((total) => ({
        "Nazwa artykułu": total.name,
        Rozmiar: total.size,
        Materiał: total.material,
        Jednostka: total.unit,
        "Suma we wszystkich magazynach": total.quantity,
        "Ostatnia zmiana": formatDate(total.updatedAt)
      }));

  return (
    <>
      <PageHeader
        title="Stany magazynowe"
        description="Suma stanów ze wszystkich magazynów oraz rozbicie na magazyny."
        actions={
          <button
            className="btn-secondary"
            onClick={() => downloadExcel("stany-magazynowe.xls", warehouseFilter ? "Stany magazynu" : "Suma stanów", exportRows)}
            disabled={exportRows.length === 0}
          >
            <Download className="h-5 w-5" />
            Eksport Excel
          </button>
        }
      />

      <div className="card mb-6 p-5">
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_260px]">
          <input className="input" placeholder="Szukaj po nazwie, rozmiarze, materiale lub magazynie" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="input" value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}>
            <option value="">Wszystkie magazyny</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </div>

        {!warehouseFilter ? (
          <>
            <h2 className="mb-4 text-lg font-bold text-white">Suma stanów ze wszystkich magazynów</h2>
            {totals.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nazwa artykułu</th>
                      <th>Rozmiar</th>
                      <th>Materiał</th>
                      <th>Jednostka</th>
                      <th>Suma</th>
                      <th>Ostatnia zmiana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totals.map((total) => (
                      <tr key={total.itemId}>
                        <td className="font-semibold text-white">{total.name}</td>
                        <td>{total.size}</td>
                        <td>{total.material}</td>
                        <td>{total.unit}</td>
                        <td className="font-bold text-brand">{formatNumber(total.quantity)}</td>
                        <td>{formatDate(total.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-lg font-bold text-white">{warehouseFilter ? "Stany wybranego magazynu" : "Rozbicie na magazyny"}</h2>
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Magazyn</th>
                  <th>Nazwa artykułu</th>
                  <th>Rozmiar</th>
                  <th>Materiał</th>
                  <th>Jednostka</th>
                  <th>Ilość</th>
                  <th>Ostatnia zmiana</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((stock) => (
                  <tr key={`${stock.item_id}-${stock.warehouse_id}`}>
                    <td className="font-semibold text-white">{stock.warehouses?.name}</td>
                    <td>{stock.items?.name}</td>
                    <td>{stock.items?.size}</td>
                    <td>{stock.items?.material}</td>
                    <td>{stock.items?.unit}</td>
                    <td className="font-bold text-brand">{formatNumber(stock.quantity)}</td>
                    <td>{formatDate(stock.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
