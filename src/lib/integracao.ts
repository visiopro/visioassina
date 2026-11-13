import "server-only";
import { createHash, createHmac } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { linkContrato } from "@/lib/formato";

export type Integracao = { id: string; nome: string; webhook_url: string | null; webhook_segredo: string };

/** Identifica o sistema pela chave enviada em "Authorization: Bearer <chave>". */
export async function autenticarIntegracao(req: Request): Promise<Integracao | null> {
  const chave = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (chave.length < 32) return null;
  const hash = createHash("sha256").update(chave).digest("hex");
  const { data } = await supabaseAdmin()
    .from("integracoes")
    .select("id, nome, webhook_url, webhook_segredo")
    .eq("chave_hash", hash)
    .eq("ativo", true)
    .maybeSingle();
  return (data as Integracao | null) ?? null;
}

/** Dados de um contrato que o sistema integrado pode ver. */
export function resumoContrato(c: Record<string, unknown>) {
  return {
    id: c.id,
    referencia: c.referencia_externa,
    status: c.status,
    link: linkContrato(String(c.token)),
    codigo_verificacao: c.codigo_verificacao,
    enviado_em: c.enviado_em,
    visualizado_em: c.visualizado_em,
    assinado_em: c.assinado_em,
    assinatura_nome: c.assinatura_nome,
    assinante_documento: c.assinante_documento,
    pdf_hash: c.pdf_hash,
    valores: c.valores,
  };
}

/**
 * Avisa o sistema que criou o contrato (visualizado, assinado, cancelado).
 * O corpo vai assinado com HMAC-SHA256 no cabeçalho x-assina-assinatura.
 * Falhas ficam registradas em eventos; o sistema também pode consultar o status.
 */
export async function notificarIntegracao(contratoId: string, evento: "visualizado" | "assinado" | "cancelado") {
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("contratos").select("*").eq("id", contratoId).maybeSingle();
  if (!c?.integracao_id) return;
  const { data: integ } = await admin.from("integracoes").select("webhook_url, webhook_segredo, ativo").eq("id", c.integracao_id).maybeSingle();
  if (!integ?.ativo || !integ.webhook_url) return;

  const corpo = JSON.stringify({ evento, enviado_em: new Date().toISOString(), contrato: resumoContrato(c) });
  const assinatura = createHmac("sha256", integ.webhook_segredo).update(corpo).digest("hex");
  let status = 0;
  try {
    const res = await fetch(integ.webhook_url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-assina-evento": evento, "x-assina-assinatura": assinatura },
      body: corpo,
      signal: AbortSignal.timeout(8_000),
    });
    status = res.status;
  } catch {
    status = -1;
  }
  await admin.from("eventos").insert({ contrato_id: contratoId, acao: "webhook", detalhes: { evento, status } });
}
