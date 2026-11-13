import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { autenticarIntegracao } from "@/lib/integracao";

export const runtime = "nodejs";

/** PDF assinado de um contrato criado pela própria integração. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const integ = await autenticarIntegracao(req);
  if (!integ) return NextResponse.json({ erro: "Chave de integração inválida." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("contratos").select("status, pdf_path, codigo_verificacao").eq("id", id).eq("integracao_id", integ.id).maybeSingle();
  if (!c) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  if (c.status !== "assinado" || !c.pdf_path) return NextResponse.json({ erro: "O contrato ainda não foi assinado." }, { status: 409 });
  const { data: arquivo, error } = await admin.storage.from("contratos").download(c.pdf_path);
  if (error || !arquivo) return NextResponse.json({ erro: "Documento indisponível." }, { status: 500 });
  return new NextResponse(Buffer.from(await arquivo.arrayBuffer()), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="contrato-assinado-${c.codigo_verificacao}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
