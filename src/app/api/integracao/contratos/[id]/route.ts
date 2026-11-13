import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { autenticarIntegracao, resumoContrato } from "@/lib/integracao";

export const runtime = "nodejs";

/** Status atual de um contrato criado pela própria integração. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const integ = await autenticarIntegracao(req);
  if (!integ) return NextResponse.json({ erro: "Chave de integração inválida." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  const { data: c } = await supabaseAdmin().from("contratos").select("*").eq("id", id).eq("integracao_id", integ.id).maybeSingle();
  if (!c) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  return NextResponse.json(resumoContrato(c));
}
