"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Download, Pencil, X } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Toast } from "@/components/Toast";
import { downloadExcel } from "@/lib/excel";
import { formatDate, formatNumber } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { Item, ToastState } from "@/lib/types";

export default function StockPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  async function loadItems() {
    const { data } = await supabase.from("items").select("*").order("name");
    setItems(data || []);
  }

  useEffect(() => {
    loadItems();
  }, []);

  const filtered = useMemo(() => {
    const phrase = search.toLowerCase();
    return items.filter((item) => `${item.name} ${item.size} ${item.material}`.toLowerCase().includes(phrase));
  }, [items, search]);

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const quantity = Number(form.get("quantity"));
    const payload = {
      name: String(form.get("name") || "").trim(),
      size: String(form.get("size") || "").trim(),
      material: String(form.get("material") || "").trim(),
      unit: String(form.get("unit") || "").trim(),
      quantity
    };

    if (!payload.name || !payload.size || !payload.material || !payload.unit || quantity < 0) {
      setToast({ type: "error", message: "Uzupełnij nazwę, rozmiar, materiał, jednostkę i podaj ilość nie mniejszą niż zero." });
      return;
    }

    const { error } = await supabase.from("items").update(payload).eq("id", editing.id);
    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setToast({ type: "success", message: "Pozycja magazynowa została zaktualizowana." });
    setEditing(null);
    await loadItems();
  }

  return (
    <>
      <PageHeader
        title="Stany magazynowe"
        description="Aktualna ilość materiałów na magazynie."
        actions={
          <button
            className="btn-secondary"
            onClick={() =>
              downloadExcel(
                "stany-magazynowe.xls",
                "Stany magazynowe",
                filtered.map((item) => ({
                  "Nazwa artykułu": item.name,
                  Rozmiar: item.size,
                  Materiał: item.material,
                  Jednostka: item.unit,
                  "Ilość na stanie": item.quantity,
                  "Data utworzenia": formatDate(item.created_at),
                  "Ostatnia zmiana": formatDate(item.updated_at)
                }))
              )
            }
            disabled={filtered.length === 0}
          >
            <Download className="h-5 w-5" />
            Eksport Excel
          </button>
        }
      />
      <Toast toast={toast} />
      <div className="card p-5">
        <input className="input mb-5" placeholder="Szukaj po nazwie, rozmiarze lub materiale" value={search} onChange={(event) => setSearch(event.target.value)} />
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nazwa artykułu</th>
                  <th>Rozmiar</th>
                  <th>Materiał</th>
                  <th>Jednostka</th>
                  <th>Ilość</th>
                  <th>Utworzono</th>
                  <th>Ostatnia zmiana</th>
                  <th>Akcja</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono text-xs text-slate-400">{item.id.slice(0, 8)}</td>
                    <td className="font-semibold text-white">{item.name}</td>
                    <td>{item.size}</td>
                    <td>{item.material}</td>
                    <td>{item.unit}</td>
                    <td className="font-bold text-brand">{formatNumber(item.quantity)}</td>
                    <td>{formatDate(item.created_at)}</td>
                    <td>{formatDate(item.updated_at)}</td>
                    <td>
                      <button className="btn-secondary min-h-10 px-3 py-2" onClick={() => setEditing(item)}>
                        <Pencil className="h-4 w-4" />
                        Edytuj
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-40 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center">
          <section className="w-full max-w-2xl rounded-lg border border-line bg-panel p-5 shadow-soft">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Edytuj pozycję</h2>
                <p className="mt-1 text-sm text-slate-400">Zmień dane artykułu magazynowego.</p>
              </div>
              <button className="btn-secondary min-h-10 px-3 py-2" onClick={() => setEditing(null)} aria-label="Zamknij">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={saveEdit}>
              <EditField label="Nazwa artykułu" name="name" defaultValue={editing.name} required />
              <EditField label="Rozmiar" name="size" defaultValue={editing.size} required />
              <EditField label="Materiał" name="material" defaultValue={editing.material} required />
              <EditField label="Jednostka" name="unit" defaultValue={editing.unit} required />
              <EditField label="Aktualna ilość" name="quantity" type="number" min="0" step="0.001" defaultValue={String(editing.quantity)} required />
              <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
                <button className="btn-primary flex-1" type="submit">
                  Zapisz zmiany
                </button>
                <button className="btn-secondary flex-1" type="button" onClick={() => setEditing(null)}>
                  Anuluj
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function EditField(props: { label: string; name: string; type?: string; min?: string; step?: string; defaultValue: string; required?: boolean }) {
  const { label, ...inputProps } = props;
  return (
    <div>
      <label className="label" htmlFor={inputProps.name}>
        {label}
      </label>
      <input className="input" id={inputProps.name} {...inputProps} />
    </div>
  );
}
