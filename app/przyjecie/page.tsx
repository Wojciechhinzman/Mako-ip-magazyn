"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, PackagePlus, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Toast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { Employee, ToastState, Warehouse } from "@/lib/types";

type ReceiveLine = {
  id: string;
  name: string;
  size: string;
  material: string;
  quantity: string;
  unit: string;
};

const newLine = (): ReceiveLine => ({
  id: crypto.randomUUID(),
  name: "",
  size: "",
  material: "",
  quantity: "",
  unit: "szt."
});

export default function ReceivePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lines, setLines] = useState<ReceiveLine[]>([newLine()]);
  const [toast, setToast] = useState<ToastState>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("employees").select("*").eq("active", true).order("full_name"),
      supabase.from("warehouses").select("*").eq("active", true).order("name")
    ]).then(([employeeResult, warehouseResult]) => {
      setEmployees(employeeResult.data || []);
      setWarehouses(warehouseResult.data || []);
    });
  }, []);

  function updateLine(id: string, patch: Partial<ReceiveLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((current) => [...current, newLine()]);
  }

  function removeLine(id: string) {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== id)));
  }

  function validateLines() {
    for (const line of lines) {
      if (!line.name.trim() || !line.size.trim() || !line.material.trim() || !line.unit.trim() || Number(line.quantity) <= 0) {
        return "Każdy wiersz musi mieć nazwę, rozmiar, materiał, jednostkę i ilość większą od zera.";
      }
    }

    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const employeeId = String(form.get("employee_id") || "");
    const warehouseId = String(form.get("warehouse_id") || "");
    const comment = String(form.get("comment") || "");

    if (!employeeId || !warehouseId) {
      setToast({ type: "error", message: "Wybierz pracownika i magazyn." });
      return;
    }

    const validationError = validateLines();
    if (validationError) {
      setToast({ type: "error", message: validationError });
      return;
    }

    setBusy(true);
    const { error } = await supabase.rpc("receive_stock_batch", {
      p_lines: lines.map((line) => ({
        name: line.name,
        size: line.size,
        material: line.material,
        quantity: Number(line.quantity),
        unit: line.unit
      })),
      p_warehouse_id: warehouseId,
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
    setToast({ type: "success", message: "Przyjęcie wielu pozycji zostało zapisane." });
  }

  return (
    <>
      <PageHeader title="Przyjęcie na magazyn" description="Dodaj wiele materiałów jednym przyjęciem do wybranego magazynu." />
      <section className="card p-5">
        <Toast toast={toast} />
        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Select label="Osoba wprowadzająca" name="employee_id">
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                </option>
              ))}
            </Select>
            <Select label="Magazyn docelowy" name="warehouse_id">
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-bold text-white">Artykuły do przyjęcia</h2>
              <button className="btn-secondary w-full sm:w-auto" type="button" onClick={addLine}>
                <Plus className="h-5 w-5" />
                Dodaj kolejny artykuł
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={line.id} className="grid gap-3 rounded-lg border border-line bg-field p-3 xl:grid-cols-[48px_1.4fr_1fr_1fr_140px_120px_52px] xl:items-end">
                  <div className="hidden pb-3 text-center text-sm font-bold text-slate-400 xl:block">{index + 1}</div>
                  <Input label="Nazwa artykułu" value={line.name} onChange={(value) => updateLine(line.id, { name: value })} required />
                  <Input label="Rozmiar" value={line.size} onChange={(value) => updateLine(line.id, { size: value })} required />
                  <Input label="Materiał" value={line.material} onChange={(value) => updateLine(line.id, { material: value })} required />
                  <Input label="Ilość" type="number" min="0.001" step="0.001" value={line.quantity} onChange={(value) => updateLine(line.id, { quantity: value })} required />
                  <Input label="Jednostka" value={line.unit} onChange={(value) => updateLine(line.id, { unit: value })} required />
                  <button className="btn-secondary min-h-12 px-3" type="button" onClick={() => removeLine(line.id)} disabled={lines.length === 1} aria-label="Usuń wiersz">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="comment">
              Komentarz
            </label>
            <textarea className="input min-h-28" id="comment" name="comment" />
          </div>

          <button className="btn-primary w-full sm:w-auto" disabled={busy}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <PackagePlus className="h-5 w-5" />}
            Zapisz przyjęcie
          </button>
        </form>
      </section>
    </>
  );
}

function Select({ label, name, children }: { label: string; name: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <select className="input" id={name} name={name} required defaultValue="">
        <option value="" disabled>
          Wybierz
        </option>
        {children}
      </select>
    </div>
  );
}

function Input(props: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; step?: string; required?: boolean }) {
  const { label, value, onChange, ...inputProps } = props;
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value} onChange={(event) => onChange(event.target.value)} {...inputProps} />
    </div>
  );
}
