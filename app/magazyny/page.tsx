"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Toast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { ToastState, Warehouse } from "@/lib/types";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  async function load() {
    const [{ data: warehouseData }, { data: adminData }] = await Promise.all([
      supabase.from("warehouses").select("*").order("name"),
      supabase.rpc("current_user_is_admin")
    ]);

    setWarehouses(warehouseData || []);
    setIsAdmin(Boolean(adminData));
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") || "").trim();
    if (!name) return;

    const { error } = await supabase.from("warehouses").insert({ name, active: true });
    setToast(error ? { type: "error", message: error.message } : { type: "success", message: "Magazyn został dodany." });
    if (!error) {
      formElement.reset();
      load();
    }
  }

  async function toggle(warehouse: Warehouse) {
    const { error } = await supabase.from("warehouses").update({ active: !warehouse.active }).eq("id", warehouse.id);
    setToast(error ? { type: "error", message: error.message } : { type: "success", message: "Status magazynu został zmieniony." });
    if (!error) load();
  }

  async function saveName(warehouse: Warehouse) {
    const name = editingName.trim();
    if (!name) {
      setToast({ type: "error", message: "Nazwa magazynu jest wymagana." });
      return;
    }

    const { error } = await supabase.from("warehouses").update({ name }).eq("id", warehouse.id);
    setToast(error ? { type: "error", message: error.message } : { type: "success", message: "Nazwa magazynu została zmieniona." });
    if (!error) {
      setEditingId("");
      setEditingName("");
      load();
    }
  }

  function startEdit(warehouse: Warehouse) {
    setEditingId(warehouse.id);
    setEditingName(warehouse.name);
  }

  return (
    <>
      <PageHeader title="Magazyny" description="Lista magazynów. Tworzenie i zmiana statusu są dostępne tylko dla administratora." />
      <Toast toast={toast} />
      {!isAdmin ? <div className="mb-5 rounded-md border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">Nie masz uprawnień administratora do tworzenia magazynów.</div> : null}
      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form className="card p-5" onSubmit={submit}>
          <label className="label" htmlFor="name">
            Nazwa magazynu
          </label>
          <input className="input mb-4" id="name" name="name" required disabled={!isAdmin} />
          <button className="btn-primary w-full" disabled={!isAdmin}>
            <Plus className="h-5 w-5" />
            Dodaj magazyn
          </button>
        </form>
        <div className="card p-5">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Status</th>
                  <th>Akcja</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id}>
                    <td className="font-semibold text-white">
                      {editingId === warehouse.id ? (
                        <input className="input min-w-64" value={editingName} onChange={(event) => setEditingName(event.target.value)} autoFocus />
                      ) : (
                        warehouse.name
                      )}
                    </td>
                    <td>
                      <StatusBadge active={warehouse.active} />
                    </td>
                    <td className="space-x-2">
                      {editingId === warehouse.id ? (
                        <>
                          <button className="btn-primary min-h-10 px-3 py-2" onClick={() => saveName(warehouse)}>
                            <Check className="h-4 w-4" />
                            Zapisz
                          </button>
                          <button className="btn-secondary min-h-10 px-3 py-2" onClick={() => setEditingId("")}>
                            <X className="h-4 w-4" />
                            Anuluj
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="btn-secondary min-h-10 px-3 py-2" disabled={!isAdmin} onClick={() => startEdit(warehouse)}>
                            <Pencil className="h-4 w-4" />
                            Zmień nazwę
                          </button>
                          <button className="btn-secondary min-h-10 px-3 py-2" disabled={!isAdmin} onClick={() => toggle(warehouse)}>
                            {warehouse.active ? "Dezaktywuj" : "Aktywuj"}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
