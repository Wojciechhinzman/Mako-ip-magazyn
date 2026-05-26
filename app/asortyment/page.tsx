"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Search, X } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Toast } from "@/components/Toast";
import { formatDate, formatNumber } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { Item, ToastState } from "@/lib/types";

type EditState = {
  id: string;
  name: string;
  size: string;
  material: string;
  unit: string;
};

export default function AssortmentPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [{ data: itemData }, { data: adminData }] = await Promise.all([
      supabase.from("items").select("*").order("name"),
      supabase.rpc("current_user_is_admin")
    ]);

    setItems(itemData || []);
    setIsAdmin(Boolean(adminData));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const phrase = search.trim().toLowerCase();
    if (!phrase) return items;

    return items.filter((item) => `${item.name} ${item.size} ${item.material} ${item.unit}`.toLowerCase().includes(phrase));
  }, [items, search]);

  function startEdit(item: Item) {
    setToast(null);
    setEditing({
      id: item.id,
      name: item.name,
      size: item.size,
      material: item.material,
      unit: item.unit
    });
  }

  function updateEditing(patch: Partial<EditState>) {
    setEditing((current) => (current ? { ...current, ...patch } : current));
  }

  async function save() {
    if (!editing) return;

    if (!editing.name.trim() || !editing.size.trim() || !editing.material.trim() || !editing.unit.trim()) {
      setToast({ type: "error", message: "Nazwa, rozmiar, material i jednostka sa wymagane." });
      return;
    }

    setBusy(true);
    const { error } = await supabase.rpc("update_item_details", {
      p_item_id: editing.id,
      p_name: editing.name,
      p_size: editing.size,
      p_material: editing.material,
      p_unit: editing.unit
    });
    setBusy(false);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setEditing(null);
    setToast({ type: "success", message: "Asortyment zostal zaktualizowany." });
    await load();
  }

  return (
    <>
      <PageHeader title="Asortyment" description="Edycja nazw, rozmiarow, materialow i jednostek. Dostepna tylko dla administratora." />
      <Toast toast={toast} />

      {!isAdmin ? (
        <div className="mb-5 rounded-md border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Masz podglad asortymentu. Edycja jest dostepna tylko dla administratora.
        </div>
      ) : null}

      <section className="card p-5">
        <div className="mb-5 flex items-center gap-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input className="input" placeholder="Szukaj po nazwie, rozmiarze, materiale lub jednostce" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nazwa artykulu</th>
                  <th>Rozmiar</th>
                  <th>Material</th>
                  <th>Jednostka</th>
                  <th>Stan laczny</th>
                  <th>Ostatnia zmiana</th>
                  <th>Akcja</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const active = editing?.id === item.id;

                  return (
                    <tr key={item.id}>
                      <td className="min-w-56 font-semibold text-white">
                        {active ? <input className="input" value={editing.name} onChange={(event) => updateEditing({ name: event.target.value })} /> : item.name}
                      </td>
                      <td className="min-w-36">
                        {active ? <input className="input" value={editing.size} onChange={(event) => updateEditing({ size: event.target.value })} /> : item.size}
                      </td>
                      <td className="min-w-36">
                        {active ? <input className="input" value={editing.material} onChange={(event) => updateEditing({ material: event.target.value })} /> : item.material}
                      </td>
                      <td className="min-w-28">
                        {active ? <input className="input" value={editing.unit} onChange={(event) => updateEditing({ unit: event.target.value })} /> : item.unit}
                      </td>
                      <td className="font-bold text-brand">{formatNumber(item.quantity)}</td>
                      <td>{formatDate(item.updated_at)}</td>
                      <td>
                        {active ? (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button className="btn-primary min-h-10 px-3 py-2" type="button" onClick={save} disabled={busy}>
                              <Check className="h-4 w-4" />
                              Zapisz
                            </button>
                            <button className="btn-secondary min-h-10 px-3 py-2" type="button" onClick={() => setEditing(null)} disabled={busy}>
                              <X className="h-4 w-4" />
                              Anuluj
                            </button>
                          </div>
                        ) : (
                          <button className="btn-secondary min-h-10 px-3 py-2" type="button" onClick={() => startEdit(item)} disabled={!isAdmin}>
                            <Pencil className="h-4 w-4" />
                            Edytuj
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
