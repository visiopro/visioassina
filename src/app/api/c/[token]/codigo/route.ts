import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { enviarCodigo } from "@/lib/codigo";
import { ipDaRequisicao } from "@/lib/requisicao";

export const runtime = "nodejs";

/** Envia o código de confirmação para quem vai assinar */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });

  const admin = supabaseAdmin();
  const { data: c } = await admin
    .from("contratos")
    .select("id, titulo, status, confirmacao, destinatario_whatsapp, destinatario_email")
    .eq("token", token)
    .maybeSingle();
  if (!c) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  if (c.status === "assinado") return NextResponse.json({ erro: "Esse contrato já foi assinado." }, { status: 409 });
  if (c.status === "cancelado") return NextResponse.json({ erro: "Esse contrato foi cancelado." }, { status: 409 });

  const r = await enviarCodigo(c);
  if (r.erro) return NextResponse.json({ erro: r.erro }, { status: 400 });
  await admin.from("eventos").insert({ contrato_id: c.id, acao: "codigo_enviado", ip: ipDaRequisicao(req), detalhes: { destino: r.destino } });

  const mascara = (c.confirmacao === "whatsapp" ? r.destino! : r.destino!).replace(/.(?=.{4})/g, "•");
  return NextResponse.json({ ok: true, destino: mascara, canal: c.confirmacao });
}
