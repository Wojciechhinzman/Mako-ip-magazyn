import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "MAKO-IP Magazyn",
  description: "Prosta aplikacja magazynowa dla firmy instalacyjnej MAKO-IP",
  manifest: "/manifest.json",
  applicationName: "MAKO-IP Magazyn",
  appleWebApp: {
    capable: true,
    title: "MAKO-IP Magazyn",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  themeColor: "#0b1017"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <ServiceWorkerRegister />
        <AuthGate>
          <AppShell>{children}</AppShell>
        </AuthGate>
      </body>
    </html>
  );
}
