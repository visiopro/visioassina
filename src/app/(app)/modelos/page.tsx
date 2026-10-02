import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { BotaoLink, Cabecalho, Cartao, Vazio } from "@/components/ui";
import type { Campo } from "@/lib/contrato";

export const dynamic = "force-dynamic";

export default async function Modelos() {
  const supabase = await supabaseServer();
  const { data: modelos } = await supabase.from("modelos").select("id, nome, marca, campos, ativo").order("nome");

  return (
    <>
      <Cabecalho titulo="Modelos" sub="O texto do contrato com os campos variáveis." acao={<BotaoLink href="/modelos/novo">Novo modelo</BotaoLink>} />
      {modelos?.length ? (
        <Cartao className="divide-y divide-traco">
          {modelos.map((m) => {
            const campos = m.campos as Campo[];
            return (
              <Link key={m.id} href={`/modelos/${m.id}`} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-relevo/50">
                <span className="min-w-0">
                  <span className={m.ativo ? "block truncate" : "block truncate text-nevoa line-through"}>{m.nome}</span>
                  <span className="text-xs text-nevoa">
                    {m.marca} · {campos.length} campo{campos.length === 1 ? "" : "s"} · {campos.filter((c) => c.quem === "cliente").length} com o cliente
                  </span>
                </span>
                <span className="shrink-0 text-sm text-sol">Editar</span>
              </Link>
            );
          })}
        </Cartao>
      ) : (
        <Vazio titulo="Nenhum modelo ainda" texto="Comece com o contrato que você mais usa e marque os campos variáveis." acao={<BotaoLink href="/modelos/novo">Criar modelo</BotaoLink>} />
      )}
    </>
  );
}
