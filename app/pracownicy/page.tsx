"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Toast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { Employee, ToastState } from "@/lib/types";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  async function load() {
    const { data } = await supabase.from("employees").select("*").order("full_name");
    setEmployees(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("full_name") || "").trim();
    if (!fullName) return;
    const { error } = await supabase.from("employees").insert({ full_name: fullName, active: true });
    setToast(error ? { type: "error", message: error.message } : { type: "success", message: "Pracownik został dodany." });
    if (!error) {
      formElement.reset();
      load();
    }
  }

  async function toggle(employee: Employee) {
    const { error } = await supabase.from("employees").update({ active: !employee.active }).eq("id", employee.id);
    setToast(error ? { type: "error", message: error.message } : { type: "success", message: "Status pracownika został zmieniony." });
    if (!error) load();
  }

  return (
    <>
      <PageHeader title="Pracownicy" description="Lista osób wybieranych przy przyjęciu i wydaniu materiału." />
      <Toast toast={toast} />
      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form className="card p-5" onSubmit={submit}>
          <label className="label" htmlFor="full_name">
            Imię i nazwisko
          </label>
          <input className="input mb-4" id="full_name" name="full_name" required />
          <button className="btn-primary w-full">
            <Plus className="h-5 w-5" />
            Dodaj pracownika
          </button>
        </form>
        <div className="card p-5">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Imię i nazwisko</th>
                  <th>Status</th>
                  <th>Akcja</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="font-mono text-xs text-slate-400">{employee.id.slice(0, 8)}</td>
                    <td className="font-semibold text-white">{employee.full_name}</td>
                    <td>
                      <StatusBadge active={employee.active} />
                    </td>
                    <td>
                      <button className="btn-secondary min-h-10 px-3 py-2" onClick={() => toggle(employee)}>
                        {employee.active ? "Dezaktywuj" : "Aktywuj"}
                      </button>
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
