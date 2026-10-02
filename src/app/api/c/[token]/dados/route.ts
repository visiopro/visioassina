import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { documentoValido, faltamDoCliente, type Campo } from "@/lib/contrato";
import { ipDaRequisicao } from "@/lib/requisicao";

export const runtime = "nodejs";

/** Salva os dados preenchidos pelo cliente, antes da assinatura */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  const corpo = (await req.json().catch(() => null)) as { valores?: Record<string, string> } | null;
  const enviados = corpo?.valores ?? {};

  const admin = supabaseAdmin();
  const { data: c } = await admin.from("contratos").select("id, status, campos, valores").eq("token", token).maybeSingle();
  if (!c) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  if (c.status === "assinado") return NextResponse.json({ erro: "Esse contrato já foi assinado." }, { status: 409 });
  if (c.status === "cancelado") return NextResponse.json({ erro: "Esse contrato foi cancelado." }, { status: 409 });

  const campos = c.campos as Campo[];
  const doCliente = campos.filter((x) => x.quem === "cliente");
  const valores = { ...(c.valores as Record<string, string>) };
  for (const campo of doCliente) {
    const v = String(enviados[campo.chave] ?? "").trim().slice(0, 300);
    if (v && (campo.tipo === "cnpj" || campo.tipo === "cpf") && !documentoValido(campo.tipo, v)) {
      return NextResponse.json({ erro: `${campo.rotulo}: número inválido.` }, { status: 400 });
    }
    valores[campo.chave] = v;
  }

  const faltando = faltamDoCliente(campos, valores);
  if (faltando.length) return NextResponse.json({ erro: `Preencha: ${faltando.map((f) => f.rotulo).join(", ")}.` }, { status: 400 });

  await admin.from("contratos").update({ valores }).eq("id", c.id);
  await admin.from("eventos").insert({ contrato_id: c.id, acao: "dados_preenchidos", ip: ipDaRequisicao(req), agente: req.headers.get("user-agent") });
  return NextResponse.json({ ok: true, valores });
}
