"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { Loader2, LogIn, PackageCheck } from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { ToastState } from "@/lib/types";
import { Toast } from "@/components/Toast";

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setToast(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) setToast({ type: "error", message: `Nie udało się zalogować: ${error.message}` });
    if (data.session) setSession(data.session);
    setBusy(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1017]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!session) {
    return (
      <main className="app-background flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-soft">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-brand text-slate-950">
              <PackageCheck className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">MAKO-IP</p>
              <h1 className="text-2xl font-bold text-white">Magazyn</h1>
            </div>
          </div>
          {!supabaseConfigured ? (
            <div className="mb-5 rounded-md border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Ustaw NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY w pliku .env.local.
            </div>
          ) : null}
          <Toast toast={toast} />
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="label" htmlFor="email">
                E-mail
              </label>
              <input className="input" id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Hasło
              </label>
              <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <button className="btn-primary w-full" type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              Zaloguj
            </button>
          </form>
        </section>
      </main>
    );
  }

  return children;
}
