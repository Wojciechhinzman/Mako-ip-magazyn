"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Toast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { Project, ToastState } from "@/lib/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  async function load() {
    const { data } = await supabase.from("projects").select("*").order("name");
    setProjects(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const code = String(form.get("code") || "").trim();
    if (!name || !code) return;
    const { error } = await supabase.from("projects").insert({ name, code, active: true });
    setToast(error ? { type: "error", message: error.message } : { type: "success", message: "Projekt został dodany." });
    if (!error) {
      formElement.reset();
      load();
    }
  }

  async function toggle(project: Project) {
    const { error } = await supabase.from("projects").update({ active: !project.active }).eq("id", project.id);
    setToast(error ? { type: "error", message: error.message } : { type: "success", message: "Status projektu został zmieniony." });
    if (!error) load();
  }

  return (
    <>
      <PageHeader title="Projekty" description="Lista projektów wybieranych przy wydaniu materiału." />
      <Toast toast={toast} />
      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form className="card p-5" onSubmit={submit}>
          <label className="label" htmlFor="name">
            Nazwa projektu
          </label>
          <input className="input mb-4" id="name" name="name" required />
          <label className="label" htmlFor="code">
            Numer / kod projektu
          </label>
          <input className="input mb-4" id="code" name="code" required />
          <button className="btn-primary w-full">
            <Plus className="h-5 w-5" />
            Dodaj projekt
          </button>
        </form>
        <div className="card p-5">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Kod</th>
                  <th>Nazwa</th>
                  <th>Status</th>
                  <th>Akcja</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td className="font-mono text-xs text-slate-400">{project.id.slice(0, 8)}</td>
                    <td className="font-semibold text-white">{project.code}</td>
                    <td>{project.name}</td>
                    <td>
                      <StatusBadge active={project.active} />
                    </td>
                    <td>
                      <button className="btn-secondary min-h-10 px-3 py-2" onClick={() => toggle(project)}>
                        {project.active ? "Dezaktywuj" : "Aktywuj"}
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
