import { notFound } from "next/navigation";
import { after } from "next/server";
import { notificarIntegracao } from "@/lib/integracao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hojeBR } from "@/lib/formato";
import type { Campo } from "@/lib/contrato";
import { Assinatura } from "@/components/assinatura";
import { Marca } from "@/components/marca";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: c } = await supabaseAdmin().from("contratos").select("titulo, marca").eq("token", token).maybeSingle();
  return { title: c ? `${c.titulo} · ${c.marca}` : "Contrato", robots: { index: false, follow: false } };
}

/** Página pública: o cliente completa os dados, lê e assina */
export default async function Assinar({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("contratos").select("*").eq("token", token).maybeSingle();
  if (!c) notFound();

  // primeira abertura marca a visualização
  if (c.status === "enviado") {
    await admin.from("contratos").update({ status: "visualizado", visualizado_em: new Date().toISOString() }).eq("id", c.id);
    await admin.from("eventos").insert({ contrato_id: c.id, acao: "visualizado" });
    if (c.integracao_id) after(() => notificarIntegracao(c.id, "visualizado"));
  }

  const expirado = !!c.expira_em && c.expira_em < hojeBR() && c.status !== "assinado";
  const indisponivel =
    c.status === "cancelado" ? "Este contrato foi cancelado." : expirado ? "O prazo para assinar este contrato terminou." : null;

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 pb-16 pt-[calc(env(safe-area-inset-top)+28px)]">
      <header className="mb-6 flex items-center gap-3">
        <Marca className="h-9 w-9" />
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{c.marca}</p>
          <p className="truncate text-sm text-nevoa">{c.titulo}</p>
        </div>
      </header>

      {indisponivel ? (
        <div className="rounded-[var(--radius-cartao)] border border-traco bg-painel p-6 text-center">
          <p className="font-medium">{indisponivel}</p>
          <p className="mt-1 text-sm text-nevoa">Fale com quem enviou o link para receber um novo contrato.</p>
        </div>
      ) : (
        <Assinatura
          token={token}
          titulo={c.titulo}
          marca={c.marca}
          corpo={c.corpo}
          campos={c.campos as Campo[]}
          valores={c.valores as Record<string, string>}
          destinatario={c.destinatario_nome}
          canal={c.confirmacao}
          jaAssinado={c.status === "assinado"}
          codigoVerificacao={c.codigo_verificacao}
        />
      )}
    </main>
  );
}
