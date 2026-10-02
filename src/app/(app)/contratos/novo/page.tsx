import { supabaseServer } from "@/lib/supabase/server";
import { BotaoLink, Cabecalho, Cartao, Vazio } from "@/components/ui";
import { FormContrato } from "@/components/form-contrato";
import type { Campo } from "@/lib/contrato";

export const dynamic = "force-dynamic";

export default async function NovoContrato() {
  const supabase = await supabaseServer();
  const { data: modelos } = await supabase.from("modelos").select("id, nome, marca, campos").eq("ativo", true).order("nome");

  if (!modelos?.length) {
    return (
      <Vazio
        titulo="Crie um modelo primeiro"
        texto="O modelo é o texto do contrato com os campos que você e o cliente preenchem."
        acao={<BotaoLink href="/modelos/novo">Criar modelo</BotaoLink>}
      />
    );
  }

  return (
    <div className="max-w-3xl">
      <Cabecalho titulo="Novo contrato" sub="Preencha o que você já sabe. O resto o cliente completa pelo link." />
      <Cartao className="p-5 sm:p-6">
        <FormContrato modelos={modelos.map((m) => ({ ...m, campos: m.campos as Campo[] }))} />
      </Cartao>
    </div>
  );
}
