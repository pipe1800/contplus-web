"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCompany } from "@/lib/company-context";
import { createBrowserClient } from "@supabase/ssr";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { companies, selectedId } = useCompany();
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace("/login"); return; }
      setUser(data.user);
      setLoading(false);
    });
  }, []);

  if (loading) return <main className="flex-1 flex items-center justify-center"><p className="text-zinc-500">Cargando...</p></main>;
  if (!user) return null;

  const modules = [
    { name: "Catálogo de Cuentas", icon: "📋", href: "/catalogo" },
    { name: "Libro Diario", icon: "📖", href: null },
    { name: "Bancos y Cheques", icon: "🏦", href: null },
    { name: "IVA y Retenciones", icon: "🧾", href: null },
    { name: "Mayor General", icon: "📊", href: null },
    { name: "Balances", icon: "⚖️", href: null },
    { name: "Estado de Resultados", icon: "📈", href: null },
    { name: "Reportes", icon: "📑", href: null },
  ];

  return (
    <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{user.email}</p>
        <button
          onClick={async () => {
            const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >Cerrar sesión</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {modules.map(mod =>
          mod.href ? (
            <a key={mod.name} href={mod.href} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors">
              <div className="text-lg mb-2">{mod.icon}</div>
              <p className="text-sm text-zinc-300">{mod.name}</p>
            </a>
          ) : (
            <div key={mod.name} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 opacity-50">
              <div className="text-lg mb-2">{mod.icon}</div>
              <p className="text-sm text-zinc-300">{mod.name}</p>
            </div>
          )
        )}
      </div>

      <p className="text-center text-xs text-zinc-600">
        {companies.length} empresas · {selectedId ? "Empresa seleccionada" : "Selecciona una empresa"}
      </p>
    </main>
  );
}
