"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Toast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { Employee, ToastState } from "@/lib/types";

export default function ReceivePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [toast, setToast] = useState<ToastState>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("employees").select("*").eq("active", true).order("full_name").then(({ data }) => setEmployees(data || []));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const quantity = Number(form.get("quantity"));

    if (!form.get("name") || !form.get("size") || !form.get("material") || !form.get("employee_id") || quantity <= 0) {
      setToast({ type: "error", message: "Uzupełnij wymagane pola. Ilość musi być większa od zera." });
      return;
    }

    setBusy(true);
    const { error } = await supabase.rpc("receive_stock", {
      p_name: String(form.get("name")),
      p_size: String(form.get("size")),
      p_material: String(form.get("material")),
      p_quantity: quantity,
      p_unit: String(form.get("unit")),
      p_employee_id: String(form.get("employee_id")),
      p_comment: String(form.get("comment") || "")
    });

    setBusy(false);
    if (error) {
      setToast({ type: "error", message: error.message });
      return;
    }

    formElement.reset();
    setToast({ type: "success", message: "Przyjęcie zostało zapisane, a stan magazynowy zaktualizowany." });
  }

  return (
    <>
      <PageHeader title="Przyjęcie na magazyn" description="Dodaj nowy materiał albo zwiększ stan istniejącego artykułu." />
      <section className="card max-w-3xl p-5">
        <Toast toast={toast} />
        <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
          <Field label="Nazwa artykułu" name="name" required />
          <Field label="Rozmiar" name="size" required />
          <Field label="Materiał" name="material" required />
          <Field label="Ilość" name="quantity" type="number" step="0.001" min="0.001" required />
          <Field label="Jednostka miary" name="unit" defaultValue="szt." required />
          <div>
            <label className="label" htmlFor="employee_id">
              Osoba wprowadzająca
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
            <label className="label" htmlFor="comment">
              Komentarz
            </label>
            <textarea className="input min-h-28" id="comment" name="comment" />
          </div>
          <div className="sm:col-span-2">
            <button className="btn-primary w-full sm:w-auto" disabled={busy}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <PackagePlus className="h-5 w-5" />}
              Zapisz przyjęcie
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

function Field({ label, ...props }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string; step?: string; min?: string }) {
  return (
    <div>
      <label className="label" htmlFor={props.name}>
        {label}
      </label>
      <input className="input" id={props.name} {...props} />
    </div>
  );
}
