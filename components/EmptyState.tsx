export function EmptyState({ text = "Brak danych do wyświetlenia." }: { text?: string }) {
  return <div className="rounded-lg border border-dashed border-line px-5 py-8 text-center text-sm text-slate-400">{text}</div>;
}
