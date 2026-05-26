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
  key: string;
  warehouseName?: string;
  name: string;
  size: string;
  material: string;
  unit: string;
  quantity: number;
  updatedAt: string;
};

function normalize(value: string | undefined) {
  return (value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function stockKey(stock: ItemStock, includeWarehouse: boolean) {
  const item = stock.items;
  return [includeWarehouse ? stock.warehouse_id : "", normalize(item?.name), normalize(item?.size), normalize(item?.material), normalize(item?.unit)].join("|");
}

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

  function groupStocks(source: ItemStock[], includeWarehouse: boolean) {
    const phrase = search.toLowerCase();
    const grouped = new Map<string, StockTotal>();

    for (const stock of source) {
      const item = stock.items;
      if (!item || stock.quantity <= 0) continue;

      const text = `${item.name} ${item.size} ${item.material} ${stock.warehouses?.name || ""}`.toLowerCase();
      if (!text.includes(phrase)) continue;

      const key = stockKey(stock, includeWarehouse);
      const current = grouped.get(key);

      if (!current) {
        grouped.set(key, {
          key,
          warehouseName: stock.warehouses?.name,
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

    return Array.from(grouped.values()).sort((a, b) => `${a.warehouseName || ""} ${a.name}`.localeCompare(`${b.warehouseName || ""} ${b.name}`, "pl"));
  }

  const totals = useMemo(() => groupStocks(stocks, false), [stocks, search]);
  const warehouseRows = useMemo(() => groupStocks(filtered, true), [filtered, search]);

  const exportRows = warehouseFilter
    ? warehouseRows.map((stock) => ({
        Magazyn: stock.warehouseName || "",
        "Nazwa artykułu": stock.name,
        Rozmiar: stock.size,
        Materiał: stock.material,
        Jednostka: stock.unit,
        "Ilość na stanie": stock.quantity,
        "Ostatnia zmiana": formatDate(stock.updatedAt)
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
          <button className="btn-secondary" onClick={() => downloadExcel("stany-magazynowe.xls", warehouseFilter ? "Stany magazynu" : "Suma stanów", exportRows)} disabled={exportRows.length === 0}>
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
                      <tr key={total.key}>
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
        {warehouseRows.length === 0 ? (
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
                {warehouseRows.map((stock) => (
                  <tr key={stock.key}>
                    <td className="font-semibold text-white">{stock.warehouseName}</td>
                    <td>{stock.name}</td>
                    <td>{stock.size}</td>
                    <td>{stock.material}</td>
                    <td>{stock.unit}</td>
                    <td className="font-bold text-brand">{formatNumber(stock.quantity)}</td>
                    <td>{formatDate(stock.updatedAt)}</td>
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
