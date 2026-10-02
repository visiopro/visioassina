import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { dataHora } from "@/lib/formato";
import { BotaoLink, Cabecalho, Cartao, Vazio, cx } from "@/components/ui";

export const dynamic = "force-dynamic";

const CORES: Record<string, string> = {
  rascunho: "bg-relevo text-nevoa",
  enviado: "bg-alerta/12 text-alerta",
  visualizado: "bg-sol/12 text-sol",
  assinado: "bg-economia/12 text-economia",
  cancelado: "bg-erro/12 text-erro",
};
const ROTULOS: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  visualizado: "Visualizado",
  assinado: "Assinado",
  cancelado: "Cancelado",
};

export default async function Contratos({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const supabase = await supabaseServer();
  const { status = "" } = await searchParams;
  let q = supabase.from("contratos").select("id, titulo, marca, destinatario_nome, status, created_at, assinado_em, enviado_em").order("created_at", { ascending: false }).limit(100);
  if (status) q = q.eq("status", status);
  const { data: contratos } = await q;

  const filtros = ["", "rascunho", "enviado", "visualizado", "assinado"];

  return (
    <>
      <Cabecalho titulo="Contratos" acao={<BotaoLink href="/contratos/novo">Novo contrato</BotaoLink>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {filtros.map((f) => (
          <Link
            key={f || "todos"}
            href={f ? `/?status=${f}` : "/"}
            className={cx("rounded-full border px-3.5 py-1.5 text-sm", status === f ? "border-sol text-sol" : "border-traco text-nevoa hover:text-texto")}
          >
            {f ? ROTULOS[f] : "Todos"}
          </Link>
        ))}
      </div>

      {contratos?.length ? (
        <Cartao className="divide-y divide-traco">
          {contratos.map((c) => (
            <Link key={c.id} href={`/contratos/${c.id}`} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-relevo/50">
              <span className="min-w-0">
                <span className="block truncate">{c.titulo}</span>
                <span className="text-xs text-nevoa">
                  {c.destinatario_nome} · {c.marca} · {c.status === "assinado" ? `assinado ${dataHora(c.assinado_em)}` : `criado ${dataHora(c.created_at)}`}
                </span>
              </span>
              <span className={cx("shrink-0 rounded-md px-2 py-0.5 text-xs font-medium", CORES[c.status])}>{ROTULOS[c.status]}</span>
            </Link>
          ))}
        </Cartao>
      ) : (
        <Vazio
          titulo="Nenhum contrato por aqui"
          texto="Crie um modelo, gere o contrato e mande o link para o cliente assinar pelo celular."
          acao={<BotaoLink href="/contratos/novo">Novo contrato</BotaoLink>}
        />
      )}
    </>
  );
}
