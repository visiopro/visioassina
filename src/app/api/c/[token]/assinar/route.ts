import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { conferirCodigo, hashPdf } from "@/lib/codigo";
import { documentoValido, type Campo } from "@/lib/contrato";
import { gerarPdfContrato } from "@/lib/pdf/contrato";
import { ipDaRequisicao } from "@/lib/requisicao";
import { linkVerificacao } from "@/lib/formato";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Confere o código, registra a assinatura e gera o PDF assinado */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });

  const corpo = (await req.json().catch(() => null)) as
    | { codigo?: string; nome?: string; documento?: string; assinatura?: string; aceite?: boolean }
    | null;
  const nome = String(corpo?.nome ?? "").trim().slice(0, 120);
  const documento = String(corpo?.documento ?? "").trim().slice(0, 20);
  const assinatura = String(corpo?.assinatura ?? "");
  if (!corpo?.aceite) return NextResponse.json({ erro: "Marque o aceite para assinar." }, { status: 400 });
  if (nome.length < 3) return NextResponse.json({ erro: "Digite seu nome completo." }, { status: 400 });
  if (documento && !documentoValido(documento.replace(/\D/g, "").length === 11 ? "cpf" : "cnpj", documento)) {
    return NextResponse.json({ erro: "CPF ou CNPJ do signatário inválido." }, { status: 400 });
  }
  if (!assinatura.startsWith("data:image/png;base64,") || assinatura.length > 400_000) {
    return NextResponse.json({ erro: "Desenhe sua assinatura antes de concluir." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: c } = await admin.from("contratos").select("*").eq("token", token).maybeSingle();
  if (!c) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  if (c.status === "assinado") return NextResponse.json({ erro: "Esse contrato já foi assinado." }, { status: 409 });
  if (c.status === "cancelado") return NextResponse.json({ erro: "Esse contrato foi cancelado." }, { status: 409 });

  const conferencia = await conferirCodigo(c.id, String(corpo?.codigo ?? ""));
  if (conferencia.erro) return NextResponse.json({ erro: conferencia.erro }, { status: 400 });

  const agora = new Date().toISOString();
  const ip = ipDaRequisicao(req);
  const agente = req.headers.get("user-agent");

  const pdf = await gerarPdfContrato({
    titulo: c.titulo,
    marca: c.marca,
    corpo: c.corpo,
    campos: c.campos as Campo[],
    valores: c.valores as Record<string, string>,
    codigo_verificacao: c.codigo_verificacao,
    assinatura_imagem: assinatura,
    assinatura_nome: nome,
    destinatario_nome: c.destinatario_nome,
    assinante_documento: documento || null,
    assinante_ip: ip,
    assinante_agente: agente,
    codigo_enviado_para: conferencia.destino ?? null,
    confirmacao: c.confirmacao,
    assinado_em: agora,
    enviado_em: c.enviado_em,
    visualizado_em: c.visualizado_em,
    urlVerificacao: linkVerificacao(),
  });

  const hash = hashPdf(pdf);
  const caminho = `${c.id}/${c.codigo_verificacao}.pdf`;
  const envio = await admin.storage.from("contratos").upload(caminho, pdf, { contentType: "application/pdf", upsert: true });
  if (envio.error) return NextResponse.json({ erro: "Não foi possível guardar o documento assinado." }, { status: 500 });

  await admin
    .from("contratos")
    .update({
      status: "assinado",
      assinado_em: agora,
      assinatura_imagem: assinatura,
      assinatura_nome: nome,
      assinante_documento: documento || null,
      assinante_ip: ip,
      assinante_agente: agente,
      codigo_enviado_para: conferencia.destino ?? null,
      pdf_path: caminho,
      pdf_hash: hash,
    })
    .eq("id", c.id)
    .neq("status", "assinado");

  await admin.from("eventos").insert({ contrato_id: c.id, acao: "assinado", ip, agente, detalhes: { hash, documento: documento || null } });
  return NextResponse.json({ ok: true, codigo_verificacao: c.codigo_verificacao });
}
