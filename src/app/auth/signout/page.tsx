"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SignoutPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    supabase.auth.signOut().then(() => router.push("/login"));
  }, []);

  return (
    <main className="flex-1 flex items-center justify-center">
      <p className="text-zinc-500">Cerrando sesión...</p>
    </main>
  );
}
