"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useCallback, useMemo } from "react";

// ── lazy supabase client (prevents build-time env var access) ──
function useSupabase() {
  return useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      ),
    []
  );
}

// ── types ──
type Account = {
  cuenta: string;
  nombre: string;
  tipo: string;
  cuentd: string;
  nivel: number;
  fecha_ini: string;
  cia: number;
};

type AccountNode = Account & { children: AccountNode[] };

// ── helpers ──
const TIPO_LABELS: Record<string, string> = {
  A: "Activo",
  P: "Pasivo",
  C: "Capital",
  E: "Egreso",
  I: "Ingreso",
  R: "Resultado",
  O: "Orden",
};

const TIPO_COLORS: Record<string, string> = {
  A: "text-blue-400",
  P: "text-amber-400",
  C: "text-emerald-400",
  E: "text-red-400",
  I: "text-green-400",
  R: "text-purple-400",
  O: "text-zinc-400",
};

function buildTree(accounts: Account[]): AccountNode[] {
  const map = new Map<string, AccountNode>();
  const roots: AccountNode[] = [];

  for (const a of accounts) {
    map.set(a.cuenta.trim(), { ...a, children: [] });
  }

  for (const a of accounts) {
    const node = map.get(a.cuenta.trim())!;
    const parentKey = a.cuentd?.trim() || "0";
    if (parentKey === "0" || !map.has(parentKey)) {
      roots.push(node);
    } else {
      map.get(parentKey)!.children.push(node);
    }
  }

  return roots;
}

// ── components ──
function AccountRow({
  node,
  depth,
  onSelect,
  selected,
}: {
  node: AccountNode;
  depth: number;
  onSelect: (a: Account) => void;
  selected: string | null;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const pad = depth * 20;

  return (
    <>
      <div
        onClick={() => onSelect(node)}
        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors text-sm group ${
          selected === node.cuenta.trim()
            ? "bg-blue-500/10 border-l-2 border-blue-500"
            : "border-l-2 border-transparent hover:bg-zinc-800/50"
        }`}
        style={{ paddingLeft: pad + 12 }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-zinc-500 hover:text-zinc-300 w-4 flex-shrink-0 text-xs"
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <span className="font-mono text-xs text-zinc-500 w-24 flex-shrink-0 truncate">
          {node.cuenta.trim()}
        </span>
        <span className="flex-1 truncate text-zinc-200">{node.nombre.trim()}</span>
        <span className={`text-[10px] font-medium flex-shrink-0 ${TIPO_COLORS[node.tipo] || "text-zinc-500"}`}>
          {TIPO_LABELS[node.tipo] || node.tipo}
        </span>
      </div>
      {expanded &&
        node.children.map((child) => (
          <AccountRow
            key={child.cuenta}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            selected={selected}
          />
        ))}
    </>
  );
}

// ── main page component ──
export default function CatalogoPage() {
  const supabase = useSupabase();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Account | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [search, setSearch] = useState("");

  const loadAccounts = useCallback(async () => {
    const { data } = await supabase
      .from("catalogo")
      .select("*")
      .eq("cia", 1)
      .order("cuenta");
    setAccounts(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const tree = buildTree(accounts);
  const filteredAccounts = search
    ? accounts.filter(
        (a) =>
          a.nombre.toLowerCase().includes(search.toLowerCase()) ||
          a.cuenta.trim().includes(search)
      )
    : [];

  return (
    <main className="flex-1 flex flex-col max-h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Catálogo de Cuentas</h1>
          <p className="text-sm text-zinc-500">
            {accounts.length} cuentas · {tree.length} raíces
          </p>
        </div>
        <button
          onClick={() => {
            setEditAccount(null);
            setShowForm(true);
          }}
          className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors"
        >
          + Nueva cuenta
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Tree Panel */}
        <div className="w-80 border-r border-zinc-800 overflow-y-auto flex-shrink-0">
          <div className="p-3">
            <input
              type="text"
              placeholder="Buscar cuenta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {search ? (
            <div>
              {filteredAccounts.map((a) => (
                <div
                  key={a.cuenta}
                  onClick={() => setSelected(a)}
                  className={`px-3 py-1.5 cursor-pointer text-sm hover:bg-zinc-800/50 border-l-2 ${
                    selected?.cuenta === a.cuenta
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-transparent"
                  }`}
                >
                  <span className="font-mono text-xs text-zinc-500">{a.cuenta.trim()}</span>
                  <span className="ml-2 text-zinc-300">{a.nombre.trim()}</span>
                </div>
              ))}
            </div>
          ) : loading ? (
            <div className="p-6 text-center text-zinc-500 text-sm">Cargando...</div>
          ) : (
            tree.map((node) => (
              <AccountRow
                key={node.cuenta}
                node={node}
                depth={0}
                onSelect={setSelected}
                selected={selected?.cuenta.trim() ?? null}
              />
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {selected ? (
            <AccountDetail account={selected} supabase={supabase} />
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-600">
              <p>Selecciona una cuenta para ver sus detalles</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      {showForm && (
        <AccountFormDialog
          account={editAccount}
          companyId={1}
          accounts={accounts}
          supabase={supabase}
          onClose={() => {
            setShowForm(false);
            setEditAccount(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditAccount(null);
            loadAccounts();
          }}
        />
      )}
    </main>
  );
}

// ── detail panel ──
function AccountDetail({ account, supabase }: { account: Account; supabase: any }) {
  const [balance, setBalance] = useState<any>(null);

  useEffect(() => {
    supabase
      .from("saldos")
      .select("cargo, abono, sald_mes, fecha")
      .eq("cia", 1)
      .eq("cuenta", account.cuenta.trim().padEnd(21, " "))
      .order("fecha", { ascending: false })
      .limit(12)
      .then(({ data }: any) => setBalance(data));
  }, [account.cuenta, supabase]);

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-sm text-zinc-500">{account.cuenta.trim()}</div>
          <h2 className="text-xl font-bold text-white mt-1">{account.nombre.trim()}</h2>
          <span
            className={`inline-block text-xs font-medium mt-2 px-2 py-0.5 rounded-full bg-zinc-800 ${
              TIPO_COLORS[account.tipo] || "text-zinc-400"
            }`}
          >
            {TIPO_LABELS[account.tipo] || account.tipo}
          </span>
        </div>
        <button
          onClick={() => {
            const event = new CustomEvent("edit-account", { detail: account });
            window.dispatchEvent(event);
          }}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Editar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DetailItem label="Nivel" value={String(account.nivel)} />
        <DetailItem
          label="Cuenta padre"
          value={account.cuentd?.trim() === "0" ? "— Raíz —" : account.cuentd.trim()}
        />
        <DetailItem label="Año fiscal" value={new Date(account.fecha_ini).getFullYear().toString()} />
        <DetailItem label="Empresa ID" value={String(account.cia)} />
      </div>

      {balance && balance.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Saldos recientes</h3>
          <div className="space-y-1">
            {balance.slice(0, 6).map((s: any) => (
              <div
                key={s.fecha}
                className="flex items-center justify-between text-sm py-1 border-b border-zinc-800/50"
              >
                <span className="text-zinc-500">
                  {new Date(s.fecha).toLocaleDateString("es-SV", { year: "numeric", month: "short" })}
                </span>
                <span className="font-mono text-xs text-zinc-400">
                  DR {Number(s.cargo).toFixed(2)} / CR {Number(s.abono).toFixed(2)}
                </span>
                <span
                  className={`font-mono text-sm font-medium ${
                    Number(s.sald_mes) >= 0 ? "text-zinc-200" : "text-red-400"
                  }`}
                >
                  {Number(s.sald_mes).toLocaleString("es-SV", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-sm text-zinc-200 mt-0.5">{value}</div>
    </div>
  );
}

// ── form dialog ──
function AccountFormDialog({
  account,
  companyId,
  accounts,
  supabase,
  onClose,
  onSaved,
}: {
  account: Account | null;
  companyId: number;
  accounts: Account[];
  supabase: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [cuenta, setCuenta] = useState(account?.cuenta.trim() ?? "");
  const [nombre, setNombre] = useState(account?.nombre.trim() ?? "");
  const [tipo, setTipo] = useState(account?.tipo ?? "A");
  const [cuentd, setCuentd] = useState(account?.cuentd?.trim() ?? "0");
  const [nivel, setNivel] = useState(account?.nivel ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (account) {
      window.addEventListener("edit-account", ((e: CustomEvent) => {
        // handled by parent
      }) as EventListener);
    }
  }, [account]);

  const handleParentChange = (parentCuenta: string) => {
    setCuentd(parentCuenta);
    if (parentCuenta === "0") {
      setNivel(0);
    } else {
      const parent = accounts.find((a) => a.cuenta.trim() === parentCuenta);
      setNivel((parent?.nivel ?? 0) + 1);
    }
  };

  async function handleSave() {
    setError("");
    setSaving(true);
    const padded = cuenta.padEnd(21, " ");
    const paddedParent = cuentd.padEnd(21, " ");

    if (account) {
      const { error: err } = await supabase.from("catalogo").upsert({
        cuenta: padded,
        nombre,
        tipo,
        cuentd: paddedParent,
        nivel,
        fecha_ini: account.fecha_ini,
        cia: companyId,
      });
      if (err) setError(err.message);
      else onSaved();
    } else {
      const { error: err } = await supabase.from("catalogo").insert({
        cuenta: padded,
        nombre,
        tipo,
        cuentd: paddedParent,
        nivel,
        fecha_ini: "2024-04-01T06:00:00",
        cia: companyId,
      });
      if (err) setError(err.message);
      else onSaved();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {account ? "Editar cuenta" : "Nueva cuenta"}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500">Código</label>
            <input
              value={cuenta}
              onChange={(e) => setCuenta(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="11010101"
              disabled={!!account}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Caja General"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {Object.entries(TIPO_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500">Nivel</label>
              <input
                value={nivel}
                disabled
                className="w-full rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-400 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500">Cuenta padre</label>
            <select
              value={cuentd}
              onChange={(e) => handleParentChange(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="0">— Raíz (sin padre) —</option>
              {accounts.filter((a) => a.nivel < 4).map((a) => (
                <option key={a.cuenta} value={a.cuenta.trim()}>
                  {a.cuenta.trim()} — {a.nombre.trim()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !cuenta || !nombre}
            className="flex-1 rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
