# MAKO-IP Magazyn

Aplikacja magazynowa dla MAKO-IP w wersji instalowanej na Windows i Android.

Dane i logowanie działają przez Supabase, a sama aplikacja nie musi być hostowana na Netlify/Vercel. Instalator Windows i plik APK zawierają zbudowany frontend aplikacji.

## Jak działa ta wersja

- Windows: aplikacja działa jako program desktopowy przez Electron.
- Android: aplikacja działa jako APK przez Capacitor.
- Baza danych: Supabase PostgreSQL.
- Logowanie: Supabase Auth.
- Dane są wspólne dla wszystkich urządzeń, jeśli używają tego samego projektu Supabase.
- Do pracy z bazą i logowaniem wymagany jest internet.

## Wymagania

- Node.js z npm.
- Konto i projekt Supabase.
- Android Studio, jeśli budujesz APK.
- Git, jeśli chcesz wysyłać zmiany do GitHub.

## Instalacja zależności

W folderze projektu uruchom:

```powershell
npm install
```

Jeżeli PowerShell blokuje npm, użyj:

```powershell
npm.cmd install
```

## Konfiguracja Supabase

1. Wejdź do projektu Supabase.
2. Otwórz `SQL Editor`.
3. Wklej i uruchom SQL z pliku:

```text
supabase/schema.sql
```

4. Jeżeli korzystasz z nowych funkcji magazynów i wydań wielopozycyjnych, uruchom też po kolei:

```text
supabase/migration_issue_documents.sql
supabase/migration_warehouses.sql
supabase/migration_receive_normalize.sql
supabase/migration_item_admin_edit.sql
```

5. Wejdź w `Authentication > Users`.
6. Dodaj użytkownika z e-mailem i hasłem.

## Plik .env.local

W głównym folderze projektu musi istnieć plik:

```text
.env.local
```

Przykład:

```env
NEXT_PUBLIC_SUPABASE_URL=https://fidacmwpxnjmvnrjjwgw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxx
```

Adres Supabase znajdziesz w panelu projektu Supabase.

Klucz znajdziesz tutaj:

```text
Project Settings > API Keys > Publishable key
```

Nie używaj `secret key` w aplikacji instalowanej.

## Sprawdzenie konfiguracji

Przed budową aplikacji możesz sprawdzić konfigurację:

```powershell
npm run check:env
```

Poprawny wynik:

```text
Konfiguracja Supabase OK.
```

## Uruchomienie lokalne w przeglądarce

Do testów na komputerze:

```powershell
npm run dev
```

Otwórz:

```text
http://localhost:3000
```

## Budowa aplikacji Windows

Zbuduj instalator:

```powershell
npm run dist:win
```

Jeżeli PowerShell blokuje npm:

```powershell
npm.cmd run dist:win
```

Gotowy instalator będzie w folderze:

```text
dist
```

Plik będzie miał nazwę podobną do:

```text
MAKO-IP Magazyn Setup 1.0.0.exe
```

Ten plik można przenieść na inny komputer z Windows i zainstalować.

## Budowa APK na Android

Jeżeli folder `android` już istnieje, użyj:

```powershell
npm run android:apk
```

Jeżeli PowerShell blokuje npm:

```powershell
npm.cmd run android:apk
```

Gotowy plik APK:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

Ten plik można przenieść na telefon i zainstalować.

Wersja `debug` jest dobra do testów wewnętrznych. Do normalnej dystrybucji potrzebny jest podpisany build release.

## Aktualizacje aplikacji

Po zmianach w kodzie:

1. Zbuduj nowy instalator Windows albo APK.
2. Zainstaluj nową wersję na urządzeniu.

Zmiany w bazie Supabase, takie jak dane magazynowe, pracownicy, projekty i historia, są widoczne od razu na wszystkich urządzeniach.

Zmiany w interfejsie wymagają nowej wersji aplikacji.

## Moduły aplikacji

- Panel
- Stany magazynowe
- Przyjęcie na magazyn
- Wydanie z magazynu
- Przesunięcie między magazynami
- Historia
- Asortyment
- Magazyny
- Pracownicy
- Projekty
- Ustawienia

## Eksport

Aplikacja eksportuje:

- stany magazynowe do Excela,
- historię operacji do Excela,
- raport konkretnego wydania do Excela.

## Ważne

Ta wersja nie wymaga Netlify ani Vercel.

Supabase nadal jest potrzebny, bo przechowuje dane i obsługuje logowanie.
