"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CompanyProvider, useCompany } from "@/lib/company-context";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

function CompanySelect() {
  const { companies, selectedId, setSelectedId } = useCompany();
  if (companies.length === 0) return null;
  return (
    <select
      value={selectedId ?? ""}
      onChange={e => setSelectedId(parseInt(e.target.value))}
      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 max-w-[220px] truncate"
    >
      {companies.map(c => (
        <option key={c.id} value={c.id}>{c.nombre?.trim()}</option>
      ))}
    </select>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <CompanyProvider>
          {/* Global header with company selector */}
          <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 flex-shrink-0">
            <a href="/" className="text-white font-bold text-sm tracking-wide">ContPlus</a>
            <CompanySelect />
          </header>
          {children}
        </CompanyProvider>
      </body>
    </html>
  );
}
