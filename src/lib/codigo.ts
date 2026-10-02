import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "./supabase/admin";
import { enviarCodigoWhatsapp } from "./whatsapp";

export const VALIDADE_MINUTOS = 15;
export const MAX_TENTATIVAS = 5;

export const gerarCodigo = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export const hashPdf = (pdf: Buffer) => createHash("sha256").update(pdf).digest("hex");

/** Envia o código de confirmação pelo canal escolhido no contrato */
export async function enviarCodigo(contrato: {
  id: string;
  confirmacao: "whatsapp" | "email";
  destinatario_whatsapp: string | null;
  destinatario_email: string | null;
  titulo: string;
}): Promise<{ erro?: string; destino?: string }> {
  const codigo = gerarCodigo();
  const destino = contrato.confirmacao === "whatsapp" ? contrato.destinatario_whatsapp : contrato.destinatario_email;
  if (!destino) return { erro: contrato.confirmacao === "whatsapp" ? "Contrato sem WhatsApp cadastrado." : "Contrato sem e-mail cadastrado." };

  const texto = `Seu código para assinar o contrato "${contrato.titulo}" é ${codigo}. Ele vale por ${VALIDADE_MINUTOS} minutos. Se não foi você, ignore esta mensagem.`;
  try {
    if (contrato.confirmacao === "whatsapp") {
      await enviarCodigoWhatsapp({ numero: destino, codigo, titulo: contrato.titulo, minutos: VALIDADE_MINUTOS });
    } else {
      await enviarEmail(destino, `Código para assinar: ${codigo}`, texto);
    }
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível enviar o código." };
  }

  await supabaseAdmin().from("codigos").upsert({
    contrato_id: contrato.id,
    codigo,
    enviado_para: destino,
    tentativas: 0,
    expira_em: new Date(Date.now() + VALIDADE_MINUTOS * 60_000).toISOString(),
  });
  return { destino };
}

/** Confere o código digitado; conta as tentativas e apaga depois de usar */
export async function conferirCodigo(contratoId: string, digitado: string): Promise<{ erro?: string; destino?: string }> {
  const admin = supabaseAdmin();
  const { data: registro } = await admin.from("codigos").select("*").eq("contrato_id", contratoId).maybeSingle();
  if (!registro) return { erro: "Peça um código novo." };
  if (new Date(registro.expira_em) < new Date()) return { erro: "O código expirou. Peça outro." };
  if (registro.tentativas >= MAX_TENTATIVAS) return { erro: "Muitas tentativas. Peça um código novo." };

  const a = Buffer.from(String(digitado).trim());
  const b = Buffer.from(String(registro.codigo));
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) {
    await admin.from("codigos").update({ tentativas: registro.tentativas + 1 }).eq("contrato_id", contratoId);
    return { erro: "Código incorreto." };
  }
  await admin.from("codigos").delete().eq("contrato_id", contratoId);
  return { destino: registro.enviado_para };
}

/** E-mail pelo Resend (opcional: sem a chave, o envio por e-mail fica indisponível) */
export async function enviarEmail(para: string, assunto: string, texto: string) {
  const chave = process.env.RESEND_API_KEY;
  const de = process.env.EMAIL_REMETENTE;
  if (!chave || !de) throw new Error("Envio por e-mail não configurado no servidor.");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${chave}` },
    body: JSON.stringify({ from: de, to: [para], subject: assunto, text: texto }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`E-mail recusado (${res.status}).`);
}
