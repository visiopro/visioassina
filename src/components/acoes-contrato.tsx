"use client";

import { useState, useTransition } from "react";
import { Copy, Download, Loader2, Send, Trash2, X } from "lucide-react";
import { cancelarContrato, enviarContrato, excluirContrato, type Estado } from "@/app/(app)/actions";
import { Aviso, Botao, Cartao } from "./ui";

export function AcoesContrato(p: { id: string; status: string; link: string; whatsapp: string | null; canal: string; temPdf: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Estado>(undefined);
  const [copiado, setCopiado] = useState(false);
  const ativo = p.status !== "assinado" && p.status !== "cancelado";

  return (
    <Cartao className="space-y-2.5 p-4">
      {ativo ? (
        <Botao className="w-full" disabled={pendente} onClick={() => iniciar(async () => setMsg(await enviarContrato(p.id)))}>
          {pendente ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          {p.status === "rascunho" ? "Enviar para assinar" : "Reenviar link"}
        </Botao>
      ) : null}

      <Botao
        variante="secundario"
        className="w-full"
        onClick={async () => {
          await navigator.clipboard.writeText(p.link);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
      >
        <Copy size={17} /> {copiado ? "Link copiado" : "Copiar link"}
      </Botao>

      <a
        href={`/api/contratos/${p.id}/pdf`}
        target="_blank"
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-campo)] border border-traco bg-relevo px-4 py-2.5 hover:border-nevoa"
      >
        <Download size={17} /> {p.temPdf ? "PDF assinado" : "Prévia em PDF"}
      </a>

      {p.whatsapp ? (
        <a
          href={`https://wa.me/${p.whatsapp}?text=${encodeURIComponent(`Segue o contrato para assinar: ${p.link}`)}`}
          target="_blank"
          rel="noreferrer"
          className="block px-4 py-2 text-center text-sm text-sol hover:underline"
        >
          Abrir conversa no WhatsApp
        </a>
      ) : null}

      {ativo ? (
        <div className="space-y-1 border-t border-traco pt-3">
          <Botao variante="fantasma" className="w-full" disabled={pendente} onClick={() => iniciar(async () => setMsg(await cancelarContrato(p.id)))}>
            <X size={16} /> Cancelar contrato
          </Botao>
          {p.status === "rascunho" ? (
            <Botao variante="fantasma" className="w-full text-erro/80 hover:text-erro" disabled={pendente} onClick={() => iniciar(() => excluirContrato(p.id))}>
              <Trash2 size={16} /> Excluir rascunho
            </Botao>
          ) : null}
        </div>
      ) : null}

      <p className="break-all text-center text-xs text-nevoa">{p.link}</p>
      {msg ? <Aviso tipo={msg.erro ? "erro" : "ok"}>{msg.erro ?? msg.ok}</Aviso> : null}
    </Cartao>
  );
}
