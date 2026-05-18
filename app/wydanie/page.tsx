"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, PackageMinus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Toast } from "@/components/Toast";
import { formatNumber } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { Employee, Item, Project, ToastState } from "@/lib/types";

export default function IssuePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("items").select("*").gt("quantity", 0).order("name"),
      supabase.from("employees").select("*").eq("active", true).order("full_name"),
      supabase.from("projects").select("*").eq("active", true).order("name")
    ]).then(([itemResult, employeeResult, projectResult]) => {
      setItems(itemResult.data || []);
      setEmployees(employeeResult.data || []);
      setProjects(projectResult.data || []);
    });
  }, []);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId), [items, selectedItemId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const quantity = Number(form.get("quantity"));

    if (!selectedItem || !form.get("employee_id") || !form.get("project_id") || quantity <= 0) {
      setToast({ type: "error", message: "Wybierz artykuł, pracownika i projekt. Ilość musi być większa od zera." });
      return;
    }

    if (quantity > selectedItem.quantity) {
      setToast({ type: "error", message: "Nie można wydać więcej niż aktualny stan magazynowy." });
      return;
    }

    const ok = window.confirm(`Potwierdź wydanie: ${formatNumber(quantity)} ${selectedItem.unit} - ${selectedItem.name}.`);
    if (!ok) return;

    setBusy(true);
    const { error } = await supabase.rpc("issue_stock", {
      p_item_id: selectedItem.id,
      p_quantity: quantity,
      p_employee_id: String(form.get("employee_id")),
      p_project_id: String(form.get("project_id")),
      p_comment: String(form.get("comment") || "")
    });

    setBusy(false);
    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    setItems((current) => current.map((item) => (item.id === selectedItem.id ? { ...item, quantity: item.quantity - quantity } : item)).filter((item) => item.quantity > 0));
    formElement.reset();
    setSelectedItemId("");
    setToast({ type: "success", message: "Wydanie zostało zapisane, a stan magazynowy zmniejszony." });
  }

  return (
    <>
      <PageHeader title="Wydanie z magazynu" description="Zdejmij materiał ze stanu i przypisz go do projektu." />
      <section className="card max-w-3xl p-5">
        <Toast toast={toast} />
        <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="item_id">
              Artykuł
            </label>
            <select className="input" id="item_id" name="item_id" required value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)}>
              <option value="" disabled>
                Wybierz artykuł
              </option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} | {item.size} | {item.material} | stan: {formatNumber(item.quantity)} {item.unit}
                </option>
              ))}
            </select>
            {selectedItem ? (
              <p className="mt-2 text-sm text-slate-400">
                Dostępne: {formatNumber(selectedItem.quantity)} {selectedItem.unit}
              </p>
            ) : null}
          </div>
          <div>
            <label className="label" htmlFor="quantity">
              Ilość do pobrania
            </label>
            <input className="input" id="quantity" name="quantity" type="number" step="0.001" min="0.001" max={selectedItem?.quantity} required />
          </div>
          <div>
            <label className="label" htmlFor="employee_id">
              Osoba pobierająca
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
          <div className="sm:col-span-2">
            <label className="label" htmlFor="project_id">
              Projekt
            </label>
            <select className="input" id="project_id" name="project_id" required defaultValue="">
              <option value="" disabled>
                Wybierz projekt
              </option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="comment">
              Komentarz
            </label>
            <textarea className="input min-h-28" id="comment" name="comment" />
          </div>
          <div className="sm:col-span-2">
            <button className="btn-primary w-full sm:w-auto" disabled={busy}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <PackageMinus className="h-5 w-5" />}
              Wydaj materiał
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
