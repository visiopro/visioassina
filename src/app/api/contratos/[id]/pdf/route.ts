import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { gerarPdfContrato } from "@/lib/pdf/contrato";
import { linkVerificacao } from "@/lib/formato";
import type { Campo } from "@/lib/contrato";

export const runtime = "nodejs";
export const maxDuration = 60;

/** PDF para a equipe: o assinado, se existir; senão uma prévia */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("não autorizado", { status: 401 });

  const { data: c } = await supabase.from("contratos").select("*").eq("id", id).maybeSingle();
  if (!c) return new Response("não encontrado", { status: 404 });

  if (c.pdf_path) {
    const { data: arquivo } = await supabaseAdmin().storage.from("contratos").download(c.pdf_path);
    if (arquivo) {
      return new Response(await arquivo.arrayBuffer(), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${c.codigo_verificacao}.pdf"` },
      });
    }
  }

  const pdf = await gerarPdfContrato({
    titulo: c.titulo,
    marca: c.marca,
    corpo: c.corpo,
    campos: c.campos as Campo[],
    valores: c.valores as Record<string, string>,
    codigo_verificacao: c.codigo_verificacao,
    assinatura_imagem: null,
    assinatura_nome: null,
    destinatario_nome: c.destinatario_nome,
    assinante_documento: null,
    assinante_ip: null,
    assinante_agente: null,
    codigo_enviado_para: null,
    confirmacao: c.confirmacao,
    assinado_em: null,
    enviado_em: c.enviado_em,
    visualizado_em: c.visualizado_em,
    urlVerificacao: linkVerificacao(),
  });
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="previa_${c.codigo_verificacao}.pdf"` },
  });
}
