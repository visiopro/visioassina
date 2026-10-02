import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** PDF assinado pelo link do cliente */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) return new Response("não encontrado", { status: 404 });
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("contratos").select("pdf_path, titulo, codigo_verificacao").eq("token", token).maybeSingle();
  if (!c?.pdf_path) return new Response("não encontrado", { status: 404 });
  const { data: arquivo } = await admin.storage.from("contratos").download(c.pdf_path);
  if (!arquivo) return new Response("não encontrado", { status: 404 });
  return new Response(await arquivo.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${c.titulo.replace(/[^\w.-]+/g, "_")}_${c.codigo_verificacao}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
