import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Marca } from "@/components/marca";
import { Navegacao } from "@/components/navegacao";
import { sair } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-traco bg-noite/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-5 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Marca />
            <span className="font-semibold">VisioPro Assina</span>
          </Link>
          <Navegacao />
          <form action={sair} className="ml-auto">
            <button className="text-sm text-nevoa hover:text-texto">Sair</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
