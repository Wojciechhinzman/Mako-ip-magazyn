"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Loader2, PackageMinus, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Toast } from "@/components/Toast";
import { formatNumber } from "@/lib/format";
import { downloadIssueReport } from "@/lib/issueReport";
import { supabase } from "@/lib/supabase";
import { Employee, Item, Project, StockMovement, ToastState } from "@/lib/types";

type IssueLine = {
  id: string;
  itemId: string;
  quantity: string;
};

const newLine = (): IssueLine => ({
  id: crypto.randomUUID(),
  itemId: "",
  quantity: ""
});

export default function IssuePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [lines, setLines] = useState<IssueLine[]>([newLine()]);
  const [lastReportRows, setLastReportRows] = useState<StockMovement[]>([]);
  const [toast, setToast] = useState<ToastState>(null);
  const [busy, setBusy] = useState(false);

  async function loadData() {
    const [itemResult, employeeResult, projectResult] = await Promise.all([
      supabase.from("items").select("*").gt("quantity", 0).order("name"),
      supabase.from("employees").select("*").eq("active", true).order("full_name"),
      supabase.from("projects").select("*").eq("active", true).order("name")
    ]);

    setItems(itemResult.data || []);
    setEmployees(employeeResult.data || []);
    setProjects(projectResult.data || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  function updateLine(id: string, patch: Partial<IssueLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
    setLastReportRows([]);
  }

  function addLine() {
    setLines((current) => [...current, newLine()]);
  }

  function removeLine(id: string) {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== id)));
    setLastReportRows([]);
  }

  function validateLines() {
    const totals = new Map<string, number>();

    for (const line of lines) {
      const item = itemById.get(line.itemId);
      const quantity = Number(line.quantity);

      if (!item || quantity <= 0) {
        return "Każdy wiersz musi mieć wybrany artykuł i ilość większą od zera.";
      }

      totals.set(item.id, (totals.get(item.id) || 0) + quantity);
    }

    for (const [itemId, quantity] of Array.from(totals.entries())) {
      const item = itemById.get(itemId);
      if (item && quantity > item.quantity) {
        return `Nie można wydać więcej niż aktualny stan magazynowy dla: ${item.name}.`;
      }
    }

    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);
    setLastReportRows([]);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const employeeId = String(form.get("employee_id") || "");
    const projectId = String(form.get("project_id") || "");
    const comment = String(form.get("comment") || "");

    if (!employeeId || !projectId) {
      setToast({ type: "error", message: "Wybierz pracownika i projekt." });
      return;
    }

    const validationError = validateLines();
    if (validationError) {
      setToast({ type: "error", message: validationError });
      return;
    }

    const summary = lines
      .map((line) => {
        const item = itemById.get(line.itemId);
        return `${formatNumber(Number(line.quantity))} ${item?.unit} - ${item?.name}`;
      })
      .join("\n");

    const ok = window.confirm(`Potwierdź wydanie ${lines.length} pozycji:\n\n${summary}`);
    if (!ok) return;

    setBusy(true);
    const { data: documentId, error } = await supabase.rpc("issue_stock_batch", {
      p_lines: lines.map((line) => ({ item_id: line.itemId, quantity: Number(line.quantity) })),
      p_employee_id: employeeId,
      p_project_id: projectId,
      p_comment: comment
    });

    if (error) {
      setBusy(false);
      setToast({ type: "error", message: error.message });
      return;
    }

    const { data: reportRows } = await supabase
      .from("stock_movements")
      .select("*, employees(full_name), projects(name, code), issue_documents(document_number)")
      .eq("issue_document_id", documentId)
      .order("created_at", { ascending: true });

    setBusy(false);
    setLastReportRows((reportRows as StockMovement[]) || []);
    formElement.reset();
    setLines([newLine()]);
    await loadData();
    setToast({ type: "success", message: "Wydanie zostało zapisane. Możesz pobrać raport tego wydania." });
  }

  function downloadLastReport() {
    if (lastReportRows.length === 0) return;
    downloadIssueReport(lastReportRows);
  }

  return (
    <>
      <PageHeader title="Wydanie z magazynu" description="Zdejmij wiele artykułów ze stanu i przypisz je do jednego projektu." />
      <section className="card p-5">
        <Toast toast={toast} />
        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-5 sm:grid-cols-2">
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
            <div>
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
          </div>

          <div>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-bold text-white">Artykuły do wydania</h2>
              <button className="btn-secondary w-full sm:w-auto" type="button" onClick={addLine}>
                <Plus className="h-5 w-5" />
                Dodaj kolejny artykuł
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => {
                const selectedItem = itemById.get(line.itemId);
                return (
                  <div key={line.id} className="grid gap-3 rounded-lg border border-line bg-field p-3 lg:grid-cols-[48px_1fr_180px_140px_52px] lg:items-end">
                    <div className="hidden pb-3 text-center text-sm font-bold text-slate-400 lg:block">{index + 1}</div>
                    <div>
                      <label className="label" htmlFor={`item-${line.id}`}>
                        Artykuł
                      </label>
                      <select className="input" id={`item-${line.id}`} value={line.itemId} onChange={(event) => updateLine(line.id, { itemId: event.target.value })} required>
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
                      <label className="label" htmlFor={`quantity-${line.id}`}>
                        Ilość
                      </label>
                      <input
                        className="input"
                        id={`quantity-${line.id}`}
                        type="number"
                        step="0.001"
                        min="0.001"
                        max={selectedItem?.quantity}
                        value={line.quantity}
                        onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                        required
                      />
                    </div>
                    <div className="rounded-md border border-line bg-panel px-4 py-3 text-sm text-slate-300">
                      {selectedItem ? (
                        <>
                          <p>Dostępne</p>
                          <p className="font-bold text-brand">
                            {formatNumber(selectedItem.quantity)} {selectedItem.unit}
                          </p>
                        </>
                      ) : (
                        <p>Wybierz artykuł</p>
                      )}
                    </div>
                    <button className="btn-secondary min-h-12 px-3" type="button" onClick={() => removeLine(line.id)} disabled={lines.length === 1} aria-label="Usuń wiersz">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="comment">
              Komentarz
            </label>
            <textarea className="input min-h-28" id="comment" name="comment" />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="btn-primary w-full sm:w-auto" disabled={busy}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <PackageMinus className="h-5 w-5" />}
              Wydaj materiały
            </button>
            <button className="btn-secondary w-full sm:w-auto" type="button" disabled={lastReportRows.length === 0} onClick={downloadLastReport}>
              <FileSpreadsheet className="h-5 w-5" />
              Raport ostatniego wydania
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
