import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { autenticarIntegracao, resumoContrato } from "@/lib/integracao";
import { soDigitos } from "@/lib/formato";

export const runtime = "nodejs";

const Campo = z.object({
  chave: z.string().regex(/^[a-zA-Z0-9_]{1,40}$/),
  rotulo: z.string().min(1).max(80),
  tipo: z.enum(["texto", "cnpj", "cpf", "email", "telefone", "moeda", "data", "numero"]),
  quem: z.enum(["voce", "cliente"]),
  obrigatorio: z.boolean(),
});

const Pedido = z.object({
  referencia: z.string().min(1).max(200),
  titulo: z.string().min(2).max(160),
  marca: z.string().min(1).max(100),
  corpo: z.string().min(20).max(60_000),
  campos: z.array(Campo).max(40),
  valores: z.record(z.string().max(300)).default({}),
  destinatario: z.object({
    nome: z.string().min(2).max(120),
    whatsapp: z.string().max(20).optional().nullable(),
    email: z.string().email().max(160).optional().nullable(),
  }),
  confirmacao: z.enum(["whatsapp", "email"]),
  expira_em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

/**
 * Cria um contrato pronto para assinar. O sistema integrado entrega o link ao
 * cliente (por isso o contrato já nasce "enviado"); o código de confirmação
 * continua saindo do Assina.
 */
export async function POST(req: Request) {
  const integ = await autenticarIntegracao(req);
  if (!integ) return NextResponse.json({ erro: "Chave de integração inválida." }, { status: 401 });

  const lido = Pedido.safeParse(await req.json().catch(() => null));
  if (!lido.success) {
    return NextResponse.json({ erro: "Dados inválidos.", detalhes: lido.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
  }
  const p = lido.data;
  const chaves = p.campos.map((c) => c.chave);
  if (new Set(chaves).size !== chaves.length) return NextResponse.json({ erro: "Há campos com a mesma chave." }, { status: 400 });

  let whatsapp = soDigitos(p.destinatario.whatsapp ?? "");
  if (whatsapp && !whatsapp.startsWith("55")) whatsapp = `55${whatsapp}`;
  if (whatsapp && !/^55[0-9]{10,11}$/.test(whatsapp)) return NextResponse.json({ erro: "WhatsApp do signatário inválido." }, { status: 400 });
  if (p.confirmacao === "whatsapp" && !whatsapp) return NextResponse.json({ erro: "Informe o WhatsApp de quem vai assinar." }, { status: 400 });
  if (p.confirmacao === "email" && !p.destinatario.email) return NextResponse.json({ erro: "Informe o e-mail de quem vai assinar." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: c, error } = await admin
    .from("contratos")
    .insert({
      titulo: p.titulo,
      marca: p.marca,
      corpo: p.corpo,
      campos: p.campos,
      valores: p.valores,
      destinatario_nome: p.destinatario.nome,
      destinatario_whatsapp: whatsapp || null,
      destinatario_email: p.destinatario.email || null,
      confirmacao: p.confirmacao,
      expira_em: p.expira_em || null,
      status: "enviado",
      enviado_em: new Date().toISOString(),
      integracao_id: integ.id,
      referencia_externa: p.referencia,
      created_by: null,
    })
    .select("*")
    .single();
  if (error || !c) return NextResponse.json({ erro: "Não foi possível criar o contrato." }, { status: 500 });

  await admin.from("eventos").insert({ contrato_id: c.id, acao: "criado_por_integracao", detalhes: { integracao: integ.nome, referencia: p.referencia } });
  return NextResponse.json(resumoContrato(c), { status: 201 });
}
