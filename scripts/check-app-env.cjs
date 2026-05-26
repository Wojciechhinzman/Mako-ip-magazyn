const fs = require("node:fs");
const path = require("node:path");

const envPath = path.join(process.cwd(), ".env.local");

function parseEnv(contents) {
  return contents.split(/\r?\n/).reduce((values, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return values;

    const index = trimmed.indexOf("=");
    if (index === -1) return values;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    values[key] = value;
    return values;
  }, {});
}

if (!fs.existsSync(envPath)) {
  console.error("Brakuje pliku .env.local. Utworz go na podstawie .env.example i wpisz dane Supabase.");
  process.exit(1);
}

const env = parseEnv(fs.readFileSync(envPath, "utf8"));
const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const missing = required.filter((key) => !env[key] || env[key].includes("twoj-"));

if (missing.length > 0) {
  console.error(`Brakuje poprawnych zmiennych w .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(env.NEXT_PUBLIC_SUPABASE_URL)) {
  console.error("NEXT_PUBLIC_SUPABASE_URL musi wygladac tak: https://xxxxx.supabase.co");
  process.exit(1);
}

if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith("sb_publishable_") && !env.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith("eyJ")) {
  console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY musi byc kluczem publishable albo legacy anon key z Supabase.");
  process.exit(1);
}

console.log("Konfiguracja Supabase OK.");
