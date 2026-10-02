"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { salvarModelo, type Estado } from "@/app/(app)/actions";
import { TIPOS, variaveisOrfas, type Campo, type TipoCampo } from "@/lib/contrato";
import { Aviso, Botao, Campo as CampoUI, cx } from "./ui";

type Modelo = { id?: string; nome: string; marca: string; corpo: string; campos: Campo[] };

const EXEMPLO = `## Partes

CONTRATADA: VisioPro Tecnologia, CNPJ 35.969.774/0001-00.

CONTRATANTE: {{empresa}}, CNPJ {{cnpj}}, com sede em {{endereco}}, representada por {{representante}}.

## Objeto

Prestação dos serviços descritos nesta proposta, pelo valor de {{valor}}.`;

export function EditorModelo({ modelo }: { modelo?: Modelo }) {
  const [estado, acao, enviando] = useActionState<Estado, FormData>(salvarModelo, undefined);
  const [corpo, setCorpo] = useState(modelo?.corpo ?? EXEMPLO);
  const [campos, setCampos] = useState<Campo[]>(
    modelo?.campos ?? [
      { chave: "empresa", rotulo: "Empresa", tipo: "texto", quem: "cliente", obrigatorio: true },
      { chave: "cnpj", rotulo: "CNPJ", tipo: "cnpj", quem: "cliente", obrigatorio: true },
      { chave: "endereco", rotulo: "Endereço", tipo: "texto", quem: "cliente", obrigatorio: true },
      { chave: "representante", rotulo: "Representante", tipo: "texto", quem: "cliente", obrigatorio: true },
      { chave: "valor", rotulo: "Valor", tipo: "moeda", quem: "voce", obrigatorio: true },
    ],
  );

  const orfas = variaveisOrfas(corpo, campos);
  const trocar = (i: number, mudanca: Partial<Campo>) => setCampos((cs) => cs.map((c, j) => (i === j ? { ...c, ...mudanca } : c)));

  return (
    <form action={acao} className="space-y-5">
      {modelo?.id ? <input type="hidden" name="id" value={modelo.id} /> : null}
      <input type="hidden" name="campos" value={JSON.stringify(campos)} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <CampoUI rotulo="Nome do modelo">
          <input name="nome" required defaultValue={modelo?.nome} className="campo" placeholder="Contrato de prestação de serviços" />
        </CampoUI>
        <CampoUI rotulo="Marca no cabeçalho" ajuda="VisioPro, Promax, ISPLAM…">
          <input name="marca" defaultValue={modelo?.marca ?? "VisioPro"} className="campo" />
        </CampoUI>
      </div>

      <CampoUI rotulo="Texto do contrato" ajuda="Use {{chave}} para os dados variáveis. Linhas que começam com ## viram títulos.">
        <textarea name="corpo" value={corpo} onChange={(e) => setCorpo(e.target.value)} rows={16} className="campo font-mono text-[13px]" />
      </CampoUI>

      <fieldset className="rounded-[var(--radius-cartao)] border border-traco p-4">
        <legend className="px-1.5 text-sm font-medium">Campos variáveis</legend>
        <div className="space-y-2">
          {campos.map((c, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1.1fr_1.2fr_1fr_1fr_auto]">
              <input
                value={c.chave}
                onChange={(e) => trocar(i, { chave: e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() })}
                placeholder="chave"
                className="campo py-1.5 font-mono text-sm"
                aria-label="Chave"
              />
              <input value={c.rotulo} onChange={(e) => trocar(i, { rotulo: e.target.value })} placeholder="Rótulo" className="campo py-1.5 text-sm" aria-label="Rótulo" />
              <select value={c.tipo} onChange={(e) => trocar(i, { tipo: e.target.value as TipoCampo })} className="campo py-1.5 text-sm" aria-label="Tipo">
                {(Object.keys(TIPOS) as TipoCampo[]).map((t) => (
                  <option key={t} value={t}>
                    {TIPOS[t]}
                  </option>
                ))}
              </select>
              <select value={c.quem} onChange={(e) => trocar(i, { quem: e.target.value as "voce" })} className="campo py-1.5 text-sm" aria-label="Quem preenche">
                <option value="voce">Você</option>
                <option value="cliente">Cliente</option>
              </select>
              <button type="button" onClick={() => setCampos((cs) => cs.filter((_, j) => j !== i))} aria-label="Remover campo" className="rounded-lg p-2 text-nevoa hover:text-erro">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <Botao
          type="button"
          variante="secundario"
          className="mt-3"
          onClick={() => setCampos((cs) => [...cs, { chave: "", rotulo: "", tipo: "texto", quem: "cliente", obrigatorio: true }])}
        >
          <Plus size={16} /> Adicionar campo
        </Botao>
        {orfas.length ? (
          <p className={cx("mt-3 text-sm text-alerta")}>
            No texto há {orfas.map((o) => `{{${o}}}`).join(", ")} sem campo cadastrado. Esses lugares ficam em branco no contrato.
          </p>
        ) : null}
      </fieldset>

      {estado?.erro ? <Aviso tipo="erro">{estado.erro}</Aviso> : null}
      <Botao disabled={enviando}>{enviando ? "Salvando…" : "Salvar modelo"}</Botao>
    </form>
  );
}
