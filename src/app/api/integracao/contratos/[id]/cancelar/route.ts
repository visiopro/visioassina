import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { autenticarIntegracao, resumoContrato } from "@/lib/integracao";

export const runtime = "nodejs";

/** Cancela um contrato ainda não assinado, criado pela própria integração. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const integ = await autenticarIntegracao(req);
  if (!integ) return NextResponse.json({ erro: "Chave de integração inválida." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  const admin = supabaseAdmin();
  const { data: c } = await admin
    .from("contratos")
    .update({ status: "cancelado" })
    .eq("id", id)
    .eq("integracao_id", integ.id)
    .neq("status", "assinado")
    .select("*")
    .maybeSingle();
  if (!c) return NextResponse.json({ erro: "Contrato não encontrado ou já assinado." }, { status: 409 });
  await admin.from("eventos").insert({ contrato_id: id, acao: "cancelado", detalhes: { por: integ.nome } });
  return NextResponse.json(resumoContrato(c));
}
