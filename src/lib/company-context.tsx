"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Company = { id: number; nombre: string };

type CompanyContextType = {
  companies: Company[];
  selectedId: number | null;
  setSelectedId: (id: number) => void;
};

const CompanyContext = createContext<CompanyContextType>({
  companies: [],
  selectedId: null,
  setSelectedId: () => {},
});

export function useCompany() {
  return useContext(CompanyContext);
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedIdState] = useState<number | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  // Load companies
  useEffect(() => {
    supabase.from("cia").select("id, nombre").order("id").then(({ data }) => {
      setCompanies(data ?? []);
    });
  }, []);

  // Restore selection from localStorage
  useEffect(() => {
    if (companies.length === 0) return;
    const saved = localStorage.getItem("contplus_company");
    const savedId = saved ? parseInt(saved) : null;
    const valid = companies.find(c => c.id === savedId);
    setSelectedIdState(valid ? savedId! : companies[0].id);
  }, [companies]);

  const setSelectedId = useCallback((id: number) => {
    localStorage.setItem("contplus_company", String(id));
    setSelectedIdState(id);
  }, []);

  return (
    <CompanyContext.Provider value={{ companies, selectedId, setSelectedId }}>
      {children}
    </CompanyContext.Provider>
  );
}
