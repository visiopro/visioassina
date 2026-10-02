import "server-only";

/**
 * Envio pelo WhatsApp com dois provedores:
 * - evolution: WhatsApp Web, texto livre, sem custo por mensagem
 * - meta: API oficial (Cloud API), com modelos aprovados
 * Escolha em WHATSAPP_PROVEDOR.
 */
export type Provedor = "evolution" | "meta";

/** Lê a variável tolerando erros de cópia: "NOME=valor", aspas, espaços e barra no fim */
function variavel(nome: string) {
  let v = (process.env[nome] ?? "").trim();
  if (v.startsWith(`${nome}=`)) v = v.slice(nome.length + 1).trim();
  v = v.replace(/^["']|["']$/g, "").trim();
  return nome.endsWith("_URL") ? v.replace(/\/+$/, "") : v;
}

export const provedor = (): Provedor => (variavel("WHATSAPP_PROVEDOR") === "meta" ? "meta" : "evolution");

export const whatsappConfigurado = () =>
  provedor() === "meta"
    ? !!(variavel("META_TOKEN") && variavel("META_PHONE_NUMBER_ID"))
    : !!(variavel("EVOLUTION_API_URL") && variavel("EVOLUTION_API_KEY") && variavel("EVOLUTION_INSTANCIA"));

// ------------------------------------------------------------------ Evolution

async function evolutionTexto(numero: string, texto: string) {
  const url = variavel("EVOLUTION_API_URL");
  const key = variavel("EVOLUTION_API_KEY");
  const instancia = variavel("EVOLUTION_INSTANCIA");
  if (!url || !key || !instancia) {
    throw new Error("Evolution não configurada (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCIA).");
  }
  const res = await fetch(`${url}/message/sendText/${encodeURIComponent(instancia)}`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: key },
    body: JSON.stringify({ number: numero, text: texto }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? "A Evolution recusou a chave (401)."
        : `A Evolution recusou o envio (${res.status}). Confira se a instância está conectada.`,
    );
  }
}

/** Envio de documento pela Evolution API (v2) */
export async function enviarDocumento(p: {
  instancia?: string;
  numero: string;
  legenda: string;
  pdf: Buffer;
  nomeArquivo: string;
  token?: string | null;
}) {
  const url = variavel("EVOLUTION_API_URL");
  const key = p.token || variavel("EVOLUTION_API_KEY");
  const instancia = p.instancia || variavel("EVOLUTION_INSTANCIA");
  if (!url || !key || !instancia) {
    throw new Error("WhatsApp não configurado: falta EVOLUTION_API_URL, EVOLUTION_API_KEY ou EVOLUTION_INSTANCIA.");
  }
  const res = await fetch(`${url}/message/sendMedia/${encodeURIComponent(instancia)}`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: key },
    body: JSON.stringify({
      number: p.numero,
      mediatype: "document",
      mimetype: "application/pdf",
      caption: p.legenda,
      media: p.pdf.toString("base64"),
      fileName: p.nomeArquivo,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? "A Evolution recusou a chave (401)."
        : `WhatsApp recusou o envio (${res.status}). Confira se a instância está conectada.`,
    );
  }
}

export async function enviarTexto(p: { instancia?: string; numero: string; texto: string; token?: string | null }) {
  return evolutionTexto(p.numero, p.texto);
}

// ------------------------------------------------------------------ Meta (Cloud API)

async function metaEnviar(corpo: Record<string, unknown>) {
  const token = variavel("META_TOKEN");
  const numeroId = variavel("META_PHONE_NUMBER_ID");
  const versao = variavel("META_API_VERSION") || "v21.0";
  if (!token || !numeroId) {
    throw new Error("API da Meta não configurada (META_TOKEN, META_PHONE_NUMBER_ID).");
  }

  const res = await fetch(`https://graph.facebook.com/${versao}/${numeroId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...corpo }),
    signal: AbortSignal.timeout(20_000),
  });
  const texto = await res.text();
  if (!res.ok) {
    let detalhe = texto.slice(0, 200);
    try {
      detalhe = (JSON.parse(texto) as { error?: { message?: string } }).error?.message ?? detalhe;
    } catch {
      // resposta não-JSON
    }
    console.error("meta whatsapp", res.status, detalhe);
    throw new Error(`A Meta recusou o envio (${res.status}): ${detalhe}`);
  }
}

const idioma = () => variavel("META_TEMPLATE_IDIOMA") || "pt_BR";

// ------------------------------------------------------------------ usos do app

/** Link do contrato para o cliente assinar */
export async function enviarLinkContrato(p: { numero: string; nome: string; titulo: string; marca: string; link: string; token: string }) {
  if (provedor() === "evolution") {
    const texto = `Olá, ${p.nome}! Segue o contrato "${p.titulo}" da ${p.marca} para você conferir e assinar pelo celular:\n\n${p.link}\n\nÉ rápido: você completa seus dados, lê o contrato e assina. Qualquer dúvida, é só responder esta mensagem.`;
    return evolutionTexto(p.numero, texto);
  }
  const modelo = variavel("META_TEMPLATE_CONTRATO");
  if (!modelo) throw new Error("Falta META_TEMPLATE_CONTRATO com o nome do modelo aprovado.");
  return metaEnviar({
    to: p.numero,
    type: "template",
    template: {
      name: modelo,
      language: { code: idioma() },
      components: [
        { type: "body", parameters: [{ type: "text", text: p.nome }, { type: "text", text: p.titulo }, { type: "text", text: p.marca }] },
        // o modelo tem botão de URL terminando em /c/{{1}}
        { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: p.token }] },
      ],
    },
  });
}

/** Código de confirmação da assinatura */
export async function enviarCodigoWhatsapp(p: { numero: string; codigo: string; titulo: string; minutos: number }) {
  if (provedor() === "evolution") {
    const texto = `Seu código para assinar o contrato "${p.titulo}" é ${p.codigo}. Ele vale por ${p.minutos} minutos. Se não foi você, ignore esta mensagem.`;
    return evolutionTexto(p.numero, texto);
  }
  const modelo = variavel("META_TEMPLATE_CODIGO");
  if (!modelo) throw new Error("Falta META_TEMPLATE_CODIGO com o nome do modelo de autenticação aprovado.");
  return metaEnviar({
    to: p.numero,
    type: "template",
    template: {
      name: modelo,
      language: { code: idioma() },
      components: [
        { type: "body", parameters: [{ type: "text", text: p.codigo }] },
        // modelo de autenticação com botão "copiar código"
        { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: p.codigo }] },
      ],
    },
  });
}
