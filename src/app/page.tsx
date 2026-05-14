import { supabase } from "@/lib/supabase";

export default async function Home() {
  // Test Supabase connection: count companies & document types
  const { count: ciaCount } = await supabase
    .from("cia")
    .select("*", { count: "exact", head: true });

  const { count: catalogoCount } = await supabase
    .from("catalogo")
    .select("*", { count: "exact", head: true });

  const { data: tiposDoc } = await supabase
    .from("i_tipos_doc")
    .select("nombre, muestra, porc_iva");

  const dbStatus = ciaCount !== null ? "Conectado" : "Error de conexión";

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            ContPlus
          </h1>
          <p className="text-zinc-400 text-lg">
            Sistema de Contabilidad — El Salvador
          </p>
        </div>

        {/* Database Status */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${
                dbStatus === "Conectado" ? "bg-emerald-500 animate-pulse" : "bg-red-500"
              }`}
            />
            <h2 className="text-lg font-semibold text-white">
              Base de Datos: {dbStatus}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg bg-zinc-800/50 p-3">
              <div className="text-zinc-400">Empresas</div>
              <div className="text-2xl font-bold text-white">{ciaCount ?? "—"}</div>
            </div>
            <div className="rounded-lg bg-zinc-800/50 p-3">
              <div className="text-zinc-400">Cuentas Contables</div>
              <div className="text-2xl font-bold text-white">{catalogoCount ?? "—"}</div>
            </div>
          </div>

          {/* IVA Document Types */}
          {tiposDoc && tiposDoc.length > 0 && (
            <div>
              <div className="text-sm text-zinc-400 mb-2">Tipos de Documento IVA</div>
              <div className="flex flex-wrap gap-2">
                {tiposDoc.map((d) => (
                  <span
                    key={d.muestra}
                    className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs text-blue-300"
                  >
                    {d.nombre} ({d.muestra}) — {d.porc_iva}% IVA
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modules Placeholder */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            "Catálogo de Cuentas",
            "Libro Diario",
            "Bancos y Cheques",
            "IVA y Retenciones",
            "Mayor General",
            "Balances",
            "Estado de Resultados",
            "Reportes",
          ].map((name) => (
            <div
              key={name}
              className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 text-center text-sm text-zinc-500 hover:border-zinc-700 transition-colors cursor-not-allowed"
            >
              {name}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-zinc-600">
          ContPlus v1.0 — Reconstruido desde Visual FoxPro 9.0 + SQL Server
        </p>
      </div>
    </main>
  );
}
