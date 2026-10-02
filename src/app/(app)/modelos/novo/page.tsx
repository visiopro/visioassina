import { Cabecalho, Cartao } from "@/components/ui";
import { EditorModelo } from "@/components/editor-modelo";

export default function NovoModelo() {
  return (
    <div className="max-w-4xl">
      <Cabecalho titulo="Novo modelo" sub="Escreva o contrato e use {{chave}} onde entra um dado variável." />
      <Cartao className="p-5 sm:p-6">
        <EditorModelo />
      </Cartao>
    </div>
  );
}
