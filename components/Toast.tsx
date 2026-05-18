import { ToastState } from "@/lib/types";

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;

  return (
    <div
      className={`mb-5 rounded-md border px-4 py-3 text-sm font-medium ${
        toast.type === "success" ? "border-teal-400/40 bg-teal-400/10 text-teal-100" : "border-rose-400/40 bg-rose-400/10 text-rose-100"
      }`}
    >
      {toast.message}
    </div>
  );
}
