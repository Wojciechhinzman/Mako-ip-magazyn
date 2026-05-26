"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Toast } from "@/components/Toast";
import { formatNumber } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { Employee, Item, ItemStock, ToastState, Warehouse } from "@/lib/types";

type TransferLine = {
  id: string;
  itemId: string;
  quantity: string;
};

const newLine = (): TransferLine => ({ id: crypto.randomUUID(), itemId: "", quantity: "" });

export default function TransferPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [lines, setLines] = useState<TransferLine[]>([newLine()]);
  const [toast, setToast] = useState<ToastState>(null);
  const [busy, setBusy] = useState(false);

  async function loadBase() {
    const [warehouseResult, employeeResult] = await Promise.all([
      supabase.from("warehouses").select("*").eq("active", true).order("name"),
      supabase.from("employees").select("*").eq("active", true).order("full_name")
    ]);

    setWarehouses(warehouseResult.data || []);
    setEmployees(employeeResult.data || []);
  }

  async function loadItems(warehouseId: string) {
    if (!warehouseId) {
      setItems([]);
      return;
    }

    const { data } = await supabase.from("item_stocks").select("quantity, items(*)").eq("warehouse_id", warehouseId).gt("quantity", 0);
    const rows = ((data || []) as unknown as ItemStock[])
      .map((row) => (row.items ? { ...row.items, quantity: row.quantity } : null))
      .filter(Boolean) as Item[];
    setItems(rows);
  }

  useEffect(() => {
    loadBase();
  }, []);

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  function updateLine(id: string, patch: Partial<TransferLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function validateLines() {
    if (!fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId) return "Wybierz dwa różne magazyny.";

    const totals = new Map<string, number>();
    for (const line of lines) {
      const item = itemById.get(line.itemId);
      const quantity = Number(line.quantity);
      if (!item || quantity <= 0) return "Każdy wiersz musi mieć artykuł i ilość większą od zera.";
      totals.set(item.id, (totals.get(item.id) || 0) + quantity);
    }

    for (const [itemId, quantity] of Array.from(totals.entries())) {
      const item = itemById.get(itemId);
      if (item && quantity > item.quantity) return `Brak wystarczającego stanu dla: ${item.name}.`;
    }

    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const employeeId = String(form.get("employee_id") || "");
    const comment = String(form.get("comment") || "");

    if (!employeeId) {
      setToast({ type: "error", message: "Wybierz pracownika." });
      return;
    }

    const validationError = validateLines();
    if (validationError) {
      setToast({ type: "error", message: validationError });
      return;
    }

    setBusy(true);
    const { error } = await supabase.rpc("transfer_stock_batch", {
      p_lines: lines.map((line) => ({ item_id: line.itemId, quantity: Number(line.quantity) })),
      p_from_warehouse_id: fromWarehouseId,
      p_to_warehouse_id: toWarehouseId,
      p_employee_id: employeeId,
      p_comment: comment
    });
    setBusy(false);

    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    formElement.reset();
    setLines([newLine()]);
    await loadItems(fromWarehouseId);
    setToast({ type: "success", message: "Przesunięcie między magazynami zostało zapisane." });
  }

  return (
    <>
      <PageHeader title="Przesunięcie między magazynami" description="Przenieś wiele artykułów z jednego magazynu do drugiego." />
      <section className="card p-5">
        <Toast toast={toast} />
        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-5 md:grid-cols-3">
            <WarehouseSelect
              label="Z magazynu"
              value={fromWarehouseId}
              warehouses={warehouses}
              onChange={(value) => {
                setFromWarehouseId(value);
                setLines([newLine()]);
                loadItems(value);
              }}
            />
            <WarehouseSelect label="Do magazynu" value={toWarehouseId} warehouses={warehouses} onChange={setToWarehouseId} />
            <div>
              <label className="label" htmlFor="employee_id">
                Osoba wykonująca
              </label>
              <select className="input" id="employee_id" name="employee_id" required defaultValue="">
                <option value="" disabled>
                  Wybierz pracownika
                </option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-white">Artykuły do przesunięcia</h2>
            <button className="btn-secondary w-full sm:w-auto" type="button" onClick={() => setLines((current) => [...current, newLine()])}>
              <Plus className="h-5 w-5" />
              Dodaj kolejny artykuł
            </button>
          </div>

          <div className="space-y-3">
            {lines.map((line) => {
              const selectedItem = itemById.get(line.itemId);
              return (
                <div key={line.id} className="grid gap-3 rounded-lg border border-line bg-field p-3 lg:grid-cols-[1fr_180px_140px_52px] lg:items-end">
                  <div>
                    <label className="label">Artykuł</label>
                    <select className="input" value={line.itemId} onChange={(event) => updateLine(line.id, { itemId: event.target.value })} required>
                      <option value="" disabled>
                        Wybierz artykuł
                      </option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} | {item.size} | {item.material} | stan: {formatNumber(item.quantity)} {item.unit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Ilość</label>
                    <input className="input" type="number" min="0.001" step="0.001" max={selectedItem?.quantity} value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} required />
                  </div>
                  <div className="rounded-md border border-line bg-panel px-4 py-3 text-sm text-slate-300">
                    {selectedItem ? `${formatNumber(selectedItem.quantity)} ${selectedItem.unit}` : "Dostępne"}
                  </div>
                  <button className="btn-secondary min-h-12 px-3" type="button" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((row) => row.id !== line.id))}>
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div>
            <label className="label" htmlFor="comment">
              Komentarz
            </label>
            <textarea className="input min-h-28" id="comment" name="comment" />
          </div>

          <button className="btn-primary w-full sm:w-auto" disabled={busy}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRightLeft className="h-5 w-5" />}
            Zapisz przesunięcie
          </button>
        </form>
      </section>
    </>
  );
}

function WarehouseSelect({ label, value, warehouses, onChange }: { label: string; value: string; warehouses: Warehouse[]; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="" disabled>
          Wybierz magazyn
        </option>
        {warehouses.map((warehouse) => (
          <option key={warehouse.id} value={warehouse.id}>
            {warehouse.name}
          </option>
        ))}
      </select>
    </div>
  );
}
