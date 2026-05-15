"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useMemo } from "react";
import { useCompany } from "@/lib/company-context";

// ── helpers ──
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

export default function CatalogoPage() {
  const { selectedId } = useCompany();
  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!), []);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Account | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    supabase.from("catalogo").select("*").eq("cia", selectedId).order("fecha_ini",{ascending:false}).then(({ data }) => {
      const seen = new Set<string>();
      setAccounts((data??[]).filter((a:Account) => { const k = a.cuenta.trim(); if (seen.has(k)) return false; seen.add(k); return true; }));
      setLoading(false);
    });
  }, [selectedId]);

  if (!selectedId) return <main className="flex-1 flex items-center justify-center text-zinc-500">Selecciona una empresa</main>;

  const tree = buildTree(accounts);
  const filtered = search ? accounts.filter(a => a.nombre.toLowerCase().includes(search.toLowerCase()) || a.cuenta.trim().includes(search)) : [];

  return (
    <main className="flex-1 flex flex-col max-h-screen overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800">
        <div>
          <h1 className="text-lg font-bold text-white">Catálogo de Cuentas</h1>
          <p className="text-xs text-zinc-500">{accounts.length} cuentas · {tree.length} raíces</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-zinc-800 overflow-y-auto flex-shrink-0">
          <div className="p-2">
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          {search ? filtered.map(a => (
            <div key={a.cuenta} onClick={() => setSelected(a)}
              className={`px-3 py-1 cursor-pointer text-sm hover:bg-zinc-800/50 border-l-2 ${selected?.cuenta===a.cuenta?"border-blue-500 bg-blue-500/10":"border-transparent"}`}>
              <span className="font-mono text-xs text-zinc-500">{a.cuenta.trim()}</span>
              <span className="ml-2 text-zinc-300">{a.nombre.trim()}</span>
            </div>
          )) : loading ? (
            <div className="p-4 text-center text-zinc-500 text-sm">Cargando...</div>
          ) : (
            tree.map(n => <AccountRow key={n.cuenta} node={n} depth={0} onSelect={setSelected} selected={selected?.cuenta.trim()??null} />)
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {selected ? (
            <div className="max-w-xl space-y-4">
              <div>
                <div className="font-mono text-sm text-zinc-500">{selected.cuenta.trim()}</div>
                <h2 className="text-xl font-bold text-white mt-1">{selected.nombre.trim()}</h2>
                <span className={`inline-block text-xs font-medium mt-1 px-2 py-0.5 rounded-full bg-zinc-800 ${TIPO_COLORS[selected.tipo]||"text-zinc-400"}`}>{TIPO_LABELS[selected.tipo]||selected.tipo}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-zinc-500">Nivel</span><br/>{selected.nivel}</div>
                <div><span className="text-zinc-500">Padre</span><br/>{selected.cuentd?.trim()==="0"?"— Raíz —":selected.cuentd.trim()}</div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-600 text-sm">Selecciona una cuenta</div>
          )}
        </div>
      </div>
    </main>
  );
}
