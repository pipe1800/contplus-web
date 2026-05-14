"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ── helpers ──
function useSupabase() {
  return useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),
    []
  );
}

type Account = { cuenta: string; nombre: string; tipo: string; cuentd: string; nivel: number; fecha_ini: string; cia: number };
type AccountNode = Account & { children: AccountNode[] };

const TIPO_LABELS: Record<string, string> = { A:"Activo",P:"Pasivo",C:"Capital",E:"Egreso",I:"Ingreso",R:"Resultado",O:"Orden" };
const TIPO_COLORS: Record<string, string> = { A:"text-blue-400",P:"text-amber-400",C:"text-emerald-400",E:"text-red-400",I:"text-green-400",R:"text-purple-400",O:"text-zinc-400" };

function buildTree(accounts: Account[]): AccountNode[] {
  const map = new Map<string, AccountNode>();
  const roots: AccountNode[] = [];
  for (const a of accounts) map.set(a.cuenta.trim(), { ...a, children: [] });
  for (const a of accounts) {
    const node = map.get(a.cuenta.trim())!;
    const pk = a.cuentd?.trim() || "0";
    if (pk === "0" || !map.has(pk)) roots.push(node);
    else map.get(pk)!.children.push(node);
  }
  return roots;
}

// ── company selector ──
function CompanySelector({ companyId, onSelect }: { companyId: string; onSelect: (id: string) => void }) {
  const [companies, setCompanies] = useState<any[]>([]);
  const supabase = useSupabase();
  useEffect(() => {
    supabase.from("cia").select("id, nombre").order("id").then(({ data }) => setCompanies(data ?? []));
  }, [supabase]);
  return (
    <select value={companyId} onChange={e => onSelect(e.target.value)}
      className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
      {companies.map(c => <option key={c.id} value={c.id}>{c.nombre?.trim()}</option>)}
    </select>
  );
}

// ── tree row ──
function AccountRow({ node, depth, onSelect, selected }: { node: AccountNode; depth: number; onSelect: (a: Account) => void; selected: string | null }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const pad = depth * 20;
  return (
    <>
      <div onClick={() => onSelect(node)}
        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm group border-l-2 ${selected === node.cuenta.trim() ? "bg-blue-500/10 border-blue-500" : "border-transparent hover:bg-zinc-800/50"}`}
        style={{ paddingLeft: pad + 12 }}>
        {node.children.length > 0
          ? <button onClick={e => { e.stopPropagation(); setExpanded(!expanded) }} className="text-zinc-500 hover:text-zinc-300 w-4 flex-shrink-0 text-xs">{expanded ? "▾" : "▸"}</button>
          : <span className="w-4 flex-shrink-0" />}
        <span className="font-mono text-xs text-zinc-500 w-24 flex-shrink-0 truncate">{node.cuenta.trim()}</span>
        <span className="flex-1 truncate text-zinc-200">{node.nombre.trim()}</span>
        <span className={`text-[10px] font-medium flex-shrink-0 ${TIPO_COLORS[node.tipo]||"text-zinc-500"}`}>{TIPO_LABELS[node.tipo]||node.tipo}</span>
      </div>
      {expanded && node.children.map(c => <AccountRow key={c.cuenta} node={c} depth={depth+1} onSelect={onSelect} selected={selected} />)}
    </>
  );
}

// ── balance panel ──
function BalanceInfo({ cuenta, companyId }: { cuenta: string; companyId: string }) {
  const [balance, setBalance] = useState<any>(null);
  const supabase = useSupabase();
  useEffect(() => {
    supabase.from("saldos").select("cargo,abono,sald_mes,fecha").eq("cia", parseInt(companyId))
      .eq("cuenta", cuenta.padEnd(21," ")).order("fecha",{ascending:false}).limit(12)
      .then(({ data }) => setBalance(data));
  }, [cuenta, companyId, supabase]);
  if (!balance?.length) return null;
  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-400 mb-3">Saldos</h3>
      <div className="space-y-1">
        {balance.slice(0,6).map((s:any) => (
          <div key={s.fecha} className="flex items-center justify-between text-sm py-1 border-b border-zinc-800/50">
            <span className="text-zinc-500">{new Date(s.fecha).toLocaleDateString("es-SV",{year:"numeric",month:"short"})}</span>
            <span className="font-mono text-xs text-zinc-400">DR {Number(s.cargo).toFixed(2)} / CR {Number(s.abono).toFixed(2)}</span>
            <span className={`font-mono text-sm font-medium ${Number(s.sald_mes)>=0?"text-zinc-200":"text-red-400"}`}>{Number(s.sald_mes).toLocaleString("es-SV",{minimumFractionDigits:2})}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── main ──
// ── wrapper with Suspense for useSearchParams ──
export default function CatalogoPageWrapper() {
  return (
    <Suspense fallback={<main className="flex-1 flex items-center justify-center"><p className="text-zinc-500">Cargando...</p></main>}>
      <CatalogoPage />
    </Suspense>
  );
}

function CatalogoPage() {
  const supabase = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company") || "1";

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Account | null>(null);
  const [search, setSearch] = useState("");

  const loadAccounts = useCallback(async () => {
    const { data } = await supabase.from("catalogo").select("*").eq("cia", parseInt(companyId)).order("fecha_ini",{ascending:false});
    const seen = new Set<string>();
    setAccounts((data??[]).filter((a:Account) => { const k = a.cuenta.trim(); if (seen.has(k)) return false; seen.add(k); return true; }));
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const tree = buildTree(accounts);
  const filtered = search ? accounts.filter(a => a.nombre.toLowerCase().includes(search.toLowerCase()) || a.cuenta.trim().includes(search)) : [];

  return (
    <main className="flex-1 flex flex-col max-h-screen overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-4">
          <a href="/" className="text-zinc-500 hover:text-zinc-300 text-sm">← Volver</a>
          <div>
            <h1 className="text-xl font-bold text-white">Catálogo de Cuentas</h1>
            <p className="text-sm text-zinc-500">{accounts.length} cuentas · {tree.length} raíces</p>
          </div>
        </div>
        <CompanySelector companyId={companyId} onSelect={id => router.push(`/catalogo?company=${id}`)} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-zinc-800 overflow-y-auto flex-shrink-0">
          <div className="p-3">
            <input type="text" placeholder="Buscar cuenta..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          {search ? (
            filtered.map(a => (
              <div key={a.cuenta} onClick={() => setSelected(a)}
                className={`px-3 py-1.5 cursor-pointer text-sm hover:bg-zinc-800/50 border-l-2 ${selected?.cuenta===a.cuenta?"border-blue-500 bg-blue-500/10":"border-transparent"}`}>
                <span className="font-mono text-xs text-zinc-500">{a.cuenta.trim()}</span>
                <span className="ml-2 text-zinc-300">{a.nombre.trim()}</span>
              </div>
            ))
          ) : loading ? (
            <div className="p-6 text-center text-zinc-500 text-sm">Cargando...</div>
          ) : (
            tree.map(n => <AccountRow key={n.cuenta} node={n} depth={0} onSelect={setSelected} selected={selected?.cuenta.trim()??null} />)
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {selected ? (
            <div className="max-w-xl space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-sm text-zinc-500">{selected.cuenta.trim()}</div>
                  <h2 className="text-xl font-bold text-white mt-1">{selected.nombre.trim()}</h2>
                  <span className={`inline-block text-xs font-medium mt-2 px-2 py-0.5 rounded-full bg-zinc-800 ${TIPO_COLORS[selected.tipo]||"text-zinc-400"}`}>{TIPO_LABELS[selected.tipo]||selected.tipo}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-xs text-zinc-500">Nivel</div><div className="text-sm text-zinc-200">{selected.nivel}</div></div>
                <div><div className="text-xs text-zinc-500">Cuenta padre</div><div className="text-sm text-zinc-200">{selected.cuentd?.trim()==="0"?"— Raíz —":selected.cuentd.trim()}</div></div>
                <div><div className="text-xs text-zinc-500">Año fiscal</div><div className="text-sm text-zinc-200">{new Date(selected.fecha_ini).getFullYear()}</div></div>
                <div><div className="text-xs text-zinc-500">Empresa</div><div className="text-sm text-zinc-200">{selected.cia}</div></div>
              </div>
              <BalanceInfo cuenta={selected.cuenta.trim()} companyId={companyId} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-600"><p>Selecciona una cuenta</p></div>
          )}
        </div>
      </div>
    </main>
  );
}
