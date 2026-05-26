# MAKO-IP Magazyn

Prosta aplikacja webowa do obsługi magazynu materiałów dla firmy instalacyjnej MAKO-IP. Interfejs jest po polsku, responsywny i działa w ciemnym motywie.

## Technologie

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL

## Instalacja

```bash
npm install
```

## Konfiguracja Supabase

1. Utwórz projekt w Supabase.
2. Wejdź w `SQL Editor`.
3. Wklej całą zawartość pliku `supabase/schema.sql`.
4. Uruchom skrypt.
5. Wejdź w `Authentication > Users` i dodaj użytkownika z e-mailem oraz hasłem.

## Zmienne środowiskowe

Skopiuj plik `.env.example` do `.env.local`:

```bash
cp .env.example .env.local
```

Uzupełnij wartości z ustawień projektu Supabase:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=twoj-anon-key
```

## Uruchomienie lokalne

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem:

```bash
http://localhost:3000
```

## Wdrożenie na Vercel

1. Wypchnij projekt do repozytorium GitHub.
2. W Vercel wybierz `Add New Project`.
3. Podłącz repozytorium.
4. Dodaj zmienne środowiskowe:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Uruchom deployment.

## Instalacja jako aplikacja na komputerze

Po wdrożeniu na Vercel aplikacja działa jako PWA, czyli można ją zainstalować na komputerze z poziomu przeglądarki.

W Google Chrome lub Microsoft Edge:

1. Otwórz adres wdrożonej aplikacji.
2. Zaloguj się.
3. Kliknij ikonę instalacji w pasku adresu albo menu przeglądarki.
4. Wybierz `Zainstaluj MAKO-IP Magazyn`.

Po instalacji aplikacja uruchamia się z menu Start jak zwykły program. Do działania nadal potrzebuje internetu, bo dane i logowanie są w Supabase.

## Instalator Windows

Aplikację można też zbudować jako klasyczny instalator Windows przez Electron.

Najpierw doinstaluj zależności desktopowe:

```bash
npm install
```

Jeśli Electron nie został jeszcze pobrany, uruchom:

```bash
npm install --save-dev electron electron-builder
```

Przed budową instalatora upewnij się, że plik `.env.local` ma poprawne dane Supabase, bo zostaną wpisane do zbudowanej aplikacji:

```env
NEXT_PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=twoj-publishable-key
```

Budowa instalatora:

```bash
npm run dist:win
```

Gotowy instalator znajdziesz w folderze:

```text
dist
```

Plik będzie miał nazwę podobną do:

```text
MAKO-IP Magazyn Setup 1.0.0.exe
```

Ten plik można uruchomić na innym komputerze z Windows i zainstalować aplikację. Program nadal wymaga internetu, ponieważ baza danych i logowanie działają przez Supabase.

## Aplikacja Android APK

Aplikację można przygotować jako plik `.apk` przez Capacitor. APK działa jako aplikacja Android z wbudowanym WebView i łączy się z Supabase przez internet.

Wymagania:

- Node.js z npm
- Android Studio
- Android SDK
- Java/JDK, najlepiej przez Android Studio

Pierwsza konfiguracja:

```bash
npm install
npm run android:add
```

Jeśli folder `android` już istnieje, nie uruchamiaj ponownie `android:add`; użyj synchronizacji:

```bash
npm run android:sync
```

Budowa pliku APK debug:

```bash
npm run android:apk
```

Gotowy plik znajdziesz tutaj:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

Ten plik można przenieść na telefon z Androidem i zainstalować. Telefon może poprosić o zgodę na instalowanie aplikacji z nieznanych źródeł.

Wersja debug jest dobra do testów wewnętrznych. Do normalnej dystrybucji potrzebny jest podpisany APK albo AAB z własnym kluczem release.

## Moduły aplikacji

- Panel startowy z kaflami modułów
- Stany magazynowe
- Przyjęcie na magazyn
- Wydanie z magazynu
- Przesunięcie między magazynami
- Historia operacji
- Magazyny
- Pracownicy
- Projekty
- Ustawienia

## Eksport Excel

Eksport do pliku `.xls` jest dostępny w widoku stanów magazynowych i historii operacji.
