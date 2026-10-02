import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dataHora } from "@/lib/formato";
import { Cartao } from "@/components/ui";
import { Marca } from "@/components/marca";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documento verificado · VisioPro Assina" };

/** Resultado da verificação pública: confirma a assinatura sem expor o conteúdo */
export default async function Resultado({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const limpo = decodeURIComponent(codigo).trim().toUpperCase();
  if (!/^[A-Z0-9]{6,16}$/.test(limpo)) notFound();

  const { data: c } = await supabaseAdmin()
    .from("contratos")
    .select("titulo, marca, status, assinado_em, assinatura_nome, assinante_documento, pdf_hash, codigo_verificacao")
    .eq("codigo_verificacao", limpo)
    .maybeSingle();

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-16 pt-16">
      <header className="mb-6 flex items-center gap-3">
        <Marca className="h-9 w-9" />
        <p className="font-semibold">Verificação de documento</p>
      </header>

      {!c || c.status !== "assinado" ? (
        <Cartao className="p-6 text-center">
          <p className="font-medium text-alerta">Documento não encontrado</p>
          <p className="mt-1 text-sm text-nevoa">
            Nenhum documento assinado com o código {limpo}. Confira o código no comprovante, no fim do PDF.
          </p>
        </Cartao>
      ) : (
        <Cartao className="p-6">
          <p className="font-medium text-economia">Documento autêntico</p>
          <dl className="mt-4 space-y-2 text-sm">
            {[
              ["Documento", c.titulo],
              ["Emitido por", c.marca],
              ["Assinado por", `${c.assinatura_nome}${c.assinante_documento ? ` (${c.assinante_documento})` : ""}`],
              ["Assinado em", dataHora(c.assinado_em)],
              ["Código", c.codigo_verificacao],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-traco pb-2">
                <dt className="text-nevoa">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 break-all text-xs text-nevoa">
            Impressão digital do arquivo (SHA-256): {c.pdf_hash}
          </p>
          <p className="mt-2 text-xs text-nevoa">
            Compare esse código com o do seu PDF. Se o arquivo tiver sido alterado, a impressão digital muda.
          </p>
        </Cartao>
      )}
    </main>
  );
}
