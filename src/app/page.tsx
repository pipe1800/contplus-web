import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user's companies via company_members
  const { data: memberships } = await supabase
    .from("company_members")
    .select("company_id, role, cia:company_id(id, nombre)")
    .eq("user_id", user.id);

  const companies = memberships?.map((m: any) => m.cia) ?? [];

  // If no companies yet, fetch all companies (admin mode for initial setup)
  const { data: allCompanies } = companies.length === 0
    ? await supabase.from("cia").select("id, nombre")
    : { data: null };

  const displayCompanies = companies.length > 0 ? companies : (allCompanies ?? []);

  return (
    <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ContPlus</h1>
          <p className="text-sm text-zinc-400">{user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Cerrar sesión
          </button>
        </form>
      </div>

      {/* Company Selector */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Empresas
        </h2>
        {displayCompanies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-8 text-center">
            <p className="text-zinc-500">No tienes empresas asignadas</p>
            <p className="text-xs text-zinc-600 mt-1">
              Un administrador debe agregarte a una empresa
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {displayCompanies.map((c: any) => (
              <div
                key={c.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors cursor-pointer"
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
        )}
      </div>

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
            { name: "Catálogo de Cuentas", icon: "📋" },
            { name: "Libro Diario", icon: "📖" },
            { name: "Bancos y Cheques", icon: "🏦" },
            { name: "IVA y Retenciones", icon: "🧾" },
            { name: "Mayor General", icon: "📊" },
            { name: "Balances", icon: "⚖️" },
            { name: "Estado de Resultados", icon: "📈" },
            { name: "Reportes", icon: "📑" },
          ].map((mod) => (
            <div
              key={mod.name}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors cursor-pointer"
            >
              <div className="text-lg mb-2">{mod.icon}</div>
              <p className="text-sm text-zinc-300">{mod.name}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
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
