"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Marca } from "@/components/marca";
import { Aviso, Botao, Campo } from "@/components/ui";

export default function Login() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setCarregando(true);
    setErro(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({
      email: String(f.get("email")).trim(),
      password: String(f.get("senha")),
    });
    setCarregando(false);
    if (error) setErro("E-mail ou senha incorretos.");
    else router.replace("/");
  }

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <form onSubmit={entrar} className="w-full max-w-sm space-y-4">
        <div className="mb-6 flex items-center gap-3">
          <Marca className="h-10 w-10" />
          <div>
            <p className="text-lg font-semibold leading-tight">VisioPro Assina</p>
            <p className="text-sm text-nevoa">Contratos com assinatura eletrônica</p>
          </div>
        </div>
        <Campo rotulo="E-mail">
          <input name="email" type="email" required autoComplete="email" className="campo" />
        </Campo>
        <Campo rotulo="Senha">
          <input name="senha" type="password" required autoComplete="current-password" className="campo" />
        </Campo>
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        <Botao className="w-full" disabled={carregando}>
          {carregando ? "Entrando…" : "Entrar"}
        </Botao>
      </form>
    </main>
  );
}
