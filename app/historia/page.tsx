"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { downloadExcel } from "@/lib/excel";
import { formatDate, formatNumber } from "@/lib/format";
import { downloadIssueReport } from "@/lib/issueReport";
import { supabase } from "@/lib/supabase";
import { Employee, Item, Project, StockMovement } from "@/lib/types";

export default function HistoryPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filters, setFilters] = useState({ q: "", item: "", employee: "", project: "", type: "", from: "", to: "" });

  useEffect(() => {
    Promise.all([
      supabase.from("stock_movements").select("*, employees(full_name), projects(name, code), issue_documents(document_number), warehouses(name), to_warehouses:warehouses!stock_movements_to_warehouse_id_fkey(name)").order("created_at", { ascending: false }),
      supabase.from("items").select("*").order("name"),
      supabase.from("employees").select("*").order("full_name"),
      supabase.from("projects").select("*").order("name")
    ]).then(([movementResult, itemResult, employeeResult, projectResult]) => {
      setMovements((movementResult.data as StockMovement[]) || []);
      setItems(itemResult.data || []);
      setEmployees(employeeResult.data || []);
      setProjects(projectResult.data || []);
    });
  }, []);

  const filtered = useMemo(() => {
    const phrase = filters.q.toLowerCase();
    return movements.filter((movement) => {
      const text = `${movement.item_name} ${movement.size} ${movement.material} ${movement.employees?.full_name || ""} ${movement.projects?.name || ""} ${movement.warehouses?.name || ""} ${movement.to_warehouses?.name || ""} ${movement.comment || ""}`.toLowerCase();
      const movementDate = movement.created_at.slice(0, 10);
      return (
        text.includes(phrase) &&
        (!filters.item || movement.item_id === filters.item) &&
        (!filters.employee || movement.employee_id === filters.employee) &&
        (!filters.project || movement.project_id === filters.project) &&
        (!filters.type || movement.type === filters.type) &&
        (!filters.from || movementDate >= filters.from) &&
        (!filters.to || movementDate <= filters.to)
      );
    });
  }, [filters, movements]);

  function update(name: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  return (
    <>
      <PageHeader
        title="Historia operacji"
        description="Pełny rejestr przyjęć i wydań materiałów."
        actions={
          <button
            className="btn-secondary"
            onClick={() =>
              downloadExcel(
                "historia-operacji.xls",
                "Historia operacji",
                filtered.map((movement) => ({
                  Typ: movement.type === "in" ? "Przyjęcie" : movement.type === "out" ? "Wydanie" : "Przesunięcie",
                  Artykuł: movement.item_name,
                  Rozmiar: movement.size,
                  Materiał: movement.material,
                  Ilość: movement.quantity,
                  Jednostka: movement.unit,
                  Osoba: movement.employees?.full_name || "",
                  Projekt: movement.projects ? `${movement.projects.code} - ${movement.projects.name}` : "",
                  Magazyn: movement.warehouses?.name || "",
                  "Do magazynu": movement.to_warehouses?.name || "",
                  "Numer wydania": movement.issue_documents?.document_number || "",
                  Data: formatDate(movement.created_at),
                  Komentarz: movement.comment || ""
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
      <section className="card p-5">
        <div className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <input className="input md:col-span-3 xl:col-span-2" placeholder="Szukaj" value={filters.q} onChange={(event) => update("q", event.target.value)} />
          <Select value={filters.item} onChange={(value) => update("item", value)} label="Wszystkie artykuły">
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select value={filters.employee} onChange={(value) => update("employee", value)} label="Wszystkie osoby">
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </Select>
          <Select value={filters.project} onChange={(value) => update("project", value)} label="Wszystkie projekty">
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code}
              </option>
            ))}
          </Select>
          <Select value={filters.type} onChange={(value) => update("type", value)} label="Każdy typ">
            <option value="in">Przyjęcie</option>
            <option value="out">Wydanie</option>
            <option value="transfer">Przesunięcie</option>
          </Select>
          <input className="input" type="date" value={filters.from} onChange={(event) => update("from", event.target.value)} />
          <input className="input" type="date" value={filters.to} onChange={(event) => update("to", event.target.value)} />
        </div>
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Typ</th>
                  <th>Artykuł</th>
                  <th>Ilość</th>
                  <th>Osoba</th>
                  <th>Projekt</th>
                  <th>Numer wydania</th>
                  <th>Data</th>
                  <th>Komentarz</th>
                  <th>Raport</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((movement) => (
                  <tr key={movement.id}>
                    <td>{movement.type === "in" ? "Przyjęcie" : movement.type === "out" ? "Wydanie" : "Przesunięcie"}</td>
                    <td>
                      <p className="font-semibold text-white">{movement.item_name}</p>
                      <p className="text-xs text-slate-400">
                        {movement.size}, {movement.material}
                      </p>
                    </td>
                    <td>
                      {formatNumber(movement.quantity)} {movement.unit}
                    </td>
                    <td>{movement.employees?.full_name}</td>
                    <td>
                      {movement.projects ? `${movement.projects.code} - ${movement.projects.name}` : "-"}
                      {movement.warehouses ? (
                        <p className="text-xs text-slate-400">
                          Magazyn: {movement.warehouses.name}
                          {movement.to_warehouses ? ` -> ${movement.to_warehouses.name}` : ""}
                        </p>
                      ) : null}
                    </td>
                    <td>{movement.issue_documents?.document_number || "-"}</td>
                    <td>{formatDate(movement.created_at)}</td>
                    <td>{movement.comment || "-"}</td>
                    <td>
                      {movement.issue_document_id ? (
                        <button
                          className="btn-secondary min-h-10 px-3 py-2"
                          onClick={() => downloadIssueReport(filtered.filter((row) => row.issue_document_id === movement.issue_document_id))}
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          Raport
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Select({ value, onChange, label, children }: { value: string; onChange: (value: string) => void; label: string; children: ReactNode }) {
  return (
    <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{label}</option>
      {children}
    </select>
  );
}
