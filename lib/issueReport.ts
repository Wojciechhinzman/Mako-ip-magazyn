import { downloadExcel } from "@/lib/excel";
import { formatDate } from "@/lib/format";
import { StockMovement } from "@/lib/types";

export function downloadIssueReport(rows: StockMovement[]) {
  if (rows.length === 0) return;

  const first = rows[0];
  const documentNumber = first.issue_documents?.document_number || "Wydanie";
  const project = first.projects ? `${first.projects.code} - ${first.projects.name}` : "";

  downloadExcel(
    `raport-${documentNumber.replaceAll("/", "-")}.xls`,
    "Raport wydania",
    rows.map((row, index) => ({
      Lp: index + 1,
      "Numer wydania": documentNumber,
      Data: formatDate(row.created_at),
      Osoba: row.employees?.full_name || "",
      Projekt: project,
      Artykuł: row.item_name,
      Rozmiar: row.size,
      Materiał: row.material,
      Ilość: row.quantity,
      Jednostka: row.unit,
      Komentarz: row.comment || ""
    }))
  );
}
