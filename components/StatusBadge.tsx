export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-teal-400/10 text-teal-200" : "bg-slate-500/10 text-slate-300"}`}>
      {active ? "Aktywny" : "Nieaktywny"}
    </span>
  );
}
