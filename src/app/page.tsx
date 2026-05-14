"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
      } else {
        setUser(data.user);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500">Cargando...</p>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ContPlus</h1>
          <p className="text-sm text-zinc-400">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/catalogo" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Catálogo →
          </a>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Company Selector */}
      <CompanyList userId={user.id} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Cuentas" value="662" />
        <StatCard label="Partidas" value="120" />
        <StatCard label="Movimientos" value="423" />
        <StatCard label="Meses" value="21" />
      </div>

      {/* Modules */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Módulos
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: "Catálogo de Cuentas", icon: "📋", href: "/catalogo" },
            { name: "Libro Diario", icon: "📖", href: null },
            { name: "Bancos y Cheques", icon: "🏦", href: null },
            { name: "IVA y Retenciones", icon: "🧾", href: null },
            { name: "Mayor General", icon: "📊", href: null },
            { name: "Balances", icon: "⚖️", href: null },
            { name: "Estado de Resultados", icon: "📈", href: null },
            { name: "Reportes", icon: "📑", href: null },
          ].map((mod) =>
            mod.href ? (
              <a
                key={mod.name}
                href={mod.href}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors block"
              >
                <div className="text-lg mb-2">{mod.icon}</div>
                <p className="text-sm text-zinc-300">{mod.name}</p>
              </a>
            ) : (
              <div
                key={mod.name}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 opacity-50"
              >
                <div className="text-lg mb-2">{mod.icon}</div>
                <p className="text-sm text-zinc-300">{mod.name}</p>
              </div>
            )
          )}
        </div>
      </div>
    </main>
  );
}

function CompanyList({ userId }: { userId: string }) {
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    supabase
      .from("company_members")
      .select("company_id, role, cia:company_id(id, nombre)")
      .eq("user_id", userId)
      .then(({ data }) => {
        const comps = data?.map((m: any) => m.cia) ?? [];
        setCompanies(comps);
      });
  }, [userId]);

  if (companies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-500">No tienes empresas asignadas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Empresas</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((c: any) => (
          <div
            key={c.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                {c.nombre?.charAt(0) ?? "C"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {c.nombre?.trim()}
                </p>
                <p className="text-xs text-zinc-500">ID: {c.id}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-2xl font-bold text-white mt-1">{value}</div>
    </div>
  );
}
