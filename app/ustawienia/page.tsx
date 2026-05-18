import { PageHeader } from "@/components/PageHeader";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Ustawienia" description="Podstawowe informacje konfiguracyjne aplikacji." />
      <section className="card max-w-3xl p-5">
        <div className="space-y-5 text-sm text-slate-300">
          <div>
            <h2 className="mb-2 text-lg font-bold text-white">Supabase</h2>
            <p>Adres projektu i klucz publiczny ustaw w pliku .env.local na podstawie .env.example.</p>
          </div>
          <div>
            <h2 className="mb-2 text-lg font-bold text-white">Logowanie</h2>
            <p>Użytkowników aplikacji dodaj w Supabase Auth. Po zalogowaniu widoczne są wszystkie moduły magazynu.</p>
          </div>
          <div>
            <h2 className="mb-2 text-lg font-bold text-white">Baza danych</h2>
            <p>Pełny schemat SQL znajduje się w pliku supabase/schema.sql.</p>
          </div>
        </div>
      </section>
    </>
  );
}
