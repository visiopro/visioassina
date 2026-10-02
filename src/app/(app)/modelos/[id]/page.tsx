import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Cabecalho, Cartao } from "@/components/ui";
import { EditorModelo } from "@/components/editor-modelo";
import { ArquivarModelo } from "@/components/acoes-modelo";
import type { Campo } from "@/lib/contrato";

export const dynamic = "force-dynamic";

export default async function Modelo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: m } = await supabase.from("modelos").select("*").eq("id", id).maybeSingle();
  if (!m) notFound();

  return (
    <div className="max-w-4xl">
      <Cabecalho titulo={m.nome} sub={m.ativo ? undefined : "Arquivado: não aparece ao criar contrato."} acao={<ArquivarModelo id={m.id} ativo={m.ativo} />} />
      <Cartao className="p-5 sm:p-6">
        <EditorModelo modelo={{ id: m.id, nome: m.nome, marca: m.marca, corpo: m.corpo, campos: m.campos as Campo[] }} />
      </Cartao>
    </div>
  );
}
