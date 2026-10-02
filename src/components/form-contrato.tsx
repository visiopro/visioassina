"use client";

import { useActionState, useMemo, useState } from "react";
import { criarContrato, type Estado } from "@/app/(app)/actions";
import { TIPOS, type Campo } from "@/lib/contrato";
import { Aviso, Botao, Campo as CampoUI } from "./ui";

type Modelo = { id: string; nome: string; marca: string; campos: Campo[] };

export function FormContrato({ modelos }: { modelos: Modelo[] }) {
  const [estado, acao, enviando] = useActionState<Estado, FormData>(criarContrato, undefined);
  const [modeloId, setModeloId] = useState(modelos[0]?.id ?? "");
  const [confirmacao, setConfirmacao] = useState<"whatsapp" | "email">("whatsapp");
  const [valores, setValores] = useState<Record<string, string>>({});

  const modelo = useMemo(() => modelos.find((m) => m.id === modeloId), [modelos, modeloId]);
  const meus = (modelo?.campos ?? []).filter((c) => c.quem === "voce");
  const doCliente = (modelo?.campos ?? []).filter((c) => c.quem === "cliente");

  return (
    <form action={acao} className="space-y-5">
      <input type="hidden" name="valores" value={JSON.stringify(valores)} />
      <CampoUI rotulo="Modelo">
        <select name="modelo_id" value={modeloId} onChange={(e) => setModeloId(e.target.value)} className="campo">
          {modelos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome} · {m.marca}
            </option>
          ))}
        </select>
      </CampoUI>

      <CampoUI rotulo="Título do contrato" ajuda="Como aparece para o cliente. Em branco, usa o nome do modelo.">
        <input name="titulo" className="campo" placeholder={modelo?.nome} />
      </CampoUI>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <CampoUI rotulo="Quem vai assinar">
          <input name="destinatario_nome" required className="campo" placeholder="Nome da pessoa" />
        </CampoUI>
        <CampoUI rotulo="Prazo para assinar" ajuda="Opcional.">
          <input name="expira_em" type="date" className="campo" />
        </CampoUI>
        <CampoUI rotulo="WhatsApp" ajuda="Com DDD.">
          <input name="destinatario_whatsapp" inputMode="tel" className="campo" />
        </CampoUI>
        <CampoUI rotulo="E-mail">
          <input name="destinatario_email" type="email" className="campo" />
        </CampoUI>
      </div>

      <fieldset className="rounded-[var(--radius-cartao)] border border-traco p-4">
        <legend className="px-1.5 text-sm font-medium">Confirmação da assinatura</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([
            { v: "whatsapp" as const, r: "Código no WhatsApp" },
            { v: "email" as const, r: "Código no e-mail" },
          ]).map((o) => (
            <label key={o.v} className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-campo)] border px-3.5 py-3 ${confirmacao === o.v ? "border-sol bg-sol/5" : "border-traco"}`}>
              <input type="radio" name="confirmacao" value={o.v} checked={confirmacao === o.v} onChange={() => setConfirmacao(o.v)} className="accent-[var(--color-sol)]" />
              <span className="text-[15px]">{o.r}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {meus.length ? (
        <fieldset className="rounded-[var(--radius-cartao)] border border-traco p-4">
          <legend className="px-1.5 text-sm font-medium">Dados que você preenche</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {meus.map((c) => (
              <CampoUI key={c.chave} rotulo={`${c.rotulo} (${TIPOS[c.tipo]})`}>
                <input
                  value={valores[c.chave] ?? ""}
                  onChange={(e) => setValores((v) => ({ ...v, [c.chave]: e.target.value }))}
                  type={c.tipo === "data" ? "date" : "text"}
                  className="campo"
                />
              </CampoUI>
            ))}
          </div>
        </fieldset>
      ) : null}

      {doCliente.length ? (
        <p className="text-sm text-nevoa">
          O cliente vai preencher: {doCliente.map((c) => c.rotulo).join(", ")}.
        </p>
      ) : null}

      {estado?.erro ? <Aviso tipo="erro">{estado.erro}</Aviso> : null}
      <Botao disabled={enviando}>{enviando ? "Criando…" : "Criar contrato"}</Botao>
    </form>
  );
}
