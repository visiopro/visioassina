import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { dataHora, linkContrato } from "@/lib/formato";
import { preencher, type Campo } from "@/lib/contrato";
import { Cartao } from "@/components/ui";
import { AcoesContrato } from "@/components/acoes-contrato";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ROTULOS: Record<string, string> = {
  enviado: "Link enviado",
  dados_preenchidos: "Cliente preencheu os dados",
  codigo_enviado: "Código de confirmação enviado",
  visualizado: "Cliente abriu o contrato",
  assinado: "Assinado",
  cancelado: "Cancelado",
};

export default async function Contrato({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const [{ data: c }, { data: eventos }] = await Promise.all([
    supabase.from("contratos").select("*").eq("id", id).maybeSingle(),
    supabase.from("eventos").select("acao, created_at, ip").eq("contrato_id", id).order("created_at"),
  ]);
  if (!c) notFound();

  const campos = c.campos as Campo[];
  const valores = c.valores as Record<string, string>;
  const faltando = campos.filter((x) => x.quem === "cliente" && !valores[x.chave]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <p className="text-sm text-nevoa">
          {c.marca} · documento {c.codigo_verificacao}
        </p>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight">{c.titulo}</h1>
        <p className="mt-1 text-sm text-nevoa">
          Para {c.destinatario_nome}
          {c.destinatario_whatsapp ? ` · ${c.destinatario_whatsapp.replace(/^55/, "")}` : ""}
          {c.destinatario_email ? ` · ${c.destinatario_email}` : ""}
        </p>

        {c.status === "assinado" ? (
          <Cartao className="mt-5 border-economia/40 bg-economia/5 p-5">
            <p className="font-medium text-economia">Assinado em {dataHora(c.assinado_em)}</p>
            <p className="mt-1 text-sm text-nevoa">
              Por {c.assinatura_nome}
              {c.assinante_documento ? ` (${c.assinante_documento})` : ""} · IP {c.assinante_ip ?? "não registrado"}
            </p>
            <p className="mt-2 break-all text-xs text-nevoa">Impressão digital do arquivo: {c.pdf_hash}</p>
          </Cartao>
        ) : faltando.length ? (
          <p className="mt-5 text-sm text-alerta">O cliente ainda precisa preencher: {faltando.map((f) => f.rotulo).join(", ")}.</p>
        ) : null}

        <Cartao className="mt-5 p-6">
          <h2 className="mb-3 font-semibold">Texto do contrato</h2>
          <div className="space-y-3 whitespace-pre-wrap text-sm leading-relaxed text-texto/90">{preencher(c.corpo, campos, valores)}</div>
        </Cartao>
      </div>

      <aside className="space-y-6">
        <AcoesContrato
          id={c.id}
          status={c.status}
          link={linkContrato(c.token)}
          whatsapp={c.destinatario_whatsapp}
          canal={c.confirmacao}
          temPdf={!!c.pdf_path}
        />

        <section>
          <h2 className="mb-3 text-sm font-semibold">Histórico</h2>
          <ol className="space-y-2.5 border-l border-traco pl-4 text-sm">
            {(eventos ?? []).map((e, i) => (
              <li key={i}>
                <span className="block">{ROTULOS[e.acao] ?? e.acao}</span>
                <span className="text-xs text-nevoa">
                  {dataHora(e.created_at)}
                  {e.ip ? ` · ${e.ip}` : ""}
                </span>
              </li>
            ))}
            {!eventos?.length ? <li className="text-nevoa">Nada ainda.</li> : null}
          </ol>
        </section>
      </aside>
    </div>
  );
}
