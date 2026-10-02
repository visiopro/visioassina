"use client";

import { useTransition } from "react";
import { arquivarModelo } from "@/app/(app)/actions";
import { Botao } from "./ui";

export function ArquivarModelo({ id, ativo }: { id: string; ativo: boolean }) {
  const [pendente, iniciar] = useTransition();
  return (
    <Botao variante={ativo ? "fantasma" : "secundario"} disabled={pendente} onClick={() => iniciar(() => arquivarModelo(id, !ativo))}>
      {ativo ? "Arquivar" : "Reativar"}
    </Botao>
  );
}
