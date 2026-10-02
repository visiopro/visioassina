"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { enviarLinkContrato } from "@/lib/whatsapp";
import { enviarEmail } from "@/lib/codigo";
import { linkContrato, soDigitos } from "@/lib/formato";
import type { Campo } from "@/lib/contrato";

export type Estado = { erro?: string; ok?: string } | undefined;

const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const erroDe = (e: unknown) => (e instanceof Error ? e.message : "Não foi possível concluir.");

async function equipe() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// ------------------------------------------------------------------ modelos

export async function salvarModelo(_: Estado, form: FormData): Promise<Estado> {
  const { supabase } = await equipe();
  const id = txt(form, "id");
  const nome = txt(form, "nome");
  const marca = txt(form, "marca") || "VisioPro";
  const corpo = String(form.get("corpo") ?? "");
  let campos: Campo[];
  try {
    campos = JSON.parse(String(form.get("campos") ?? "[]"));
  } catch {
    return { erro: "Campos inválidos." };
  }
  if (nome.length < 2) return { erro: "Dê um nome ao modelo." };
  if (corpo.trim().length < 20) return { erro: "Escreva o texto do contrato." };
  const chaves = campos.map((c) => c.chave);
  if (new Set(chaves).size !== chaves.length) return { erro: "Há campos com a mesma chave." };

  const linha = { nome, marca, corpo, campos };
  const { error } = id ? await supabase.from("modelos").update(linha).eq("id", id) : await supabase.from("modelos").insert(linha);
  if (error) return { erro: "Não foi possível salvar o modelo." };
  revalidatePath("/modelos");
  redirect("/modelos");
}

export async function arquivarModelo(id: string, ativo: boolean) {
  const { supabase } = await equipe();
  await supabase.from("modelos").update({ ativo }).eq("id", id);
  revalidatePath("/modelos");
}

// ------------------------------------------------------------------ contratos

export async function criarContrato(_: Estado, form: FormData): Promise<Estado> {
  const { supabase } = await equipe();
  const modeloId = txt(form, "modelo_id");
  const nome = txt(form, "destinatario_nome");
  const whats = soDigitos(txt(form, "destinatario_whatsapp"));
  const email = txt(form, "destinatario_email");
  const confirmacao = txt(form, "confirmacao") === "email" ? "email" : "whatsapp";
  const titulo = txt(form, "titulo");
  let valores: Record<string, string>;
  try {
    valores = JSON.parse(String(form.get("valores") ?? "{}"));
  } catch {
    valores = {};
  }

  const { data: modelo } = await supabase.from("modelos").select("*").eq("id", modeloId).maybeSingle();
  if (!modelo) return { erro: "Escolha um modelo." };
  if (nome.length < 2) return { erro: "Informe para quem é o contrato." };
  if (confirmacao === "whatsapp" && !whats) return { erro: "Informe o WhatsApp de quem vai assinar." };
  if (confirmacao === "email" && !email) return { erro: "Informe o e-mail de quem vai assinar." };

  const { data: contrato, error } = await supabase
    .from("contratos")
    .insert({
      modelo_id: modelo.id,
      titulo: titulo || modelo.nome,
      marca: modelo.marca,
      corpo: modelo.corpo,
      campos: modelo.campos,
      valores,
      destinatario_nome: nome,
      destinatario_whatsapp: whats ? (whats.startsWith("55") ? whats : `55${whats}`) : null,
      destinatario_email: email || null,
      confirmacao,
      expira_em: txt(form, "expira_em") || null,
    })
    .select("id")
    .single();
  if (error || !contrato) return { erro: "Não foi possível criar o contrato." };
  revalidatePath("/");
  redirect(`/contratos/${contrato.id}`);
}

export async function enviarContrato(id: string): Promise<Estado> {
  try {
    const { supabase } = await equipe();
    const { data: c } = await supabase.from("contratos").select("*").eq("id", id).maybeSingle();
    if (!c) return { erro: "Contrato não encontrado." };
    if (c.status === "assinado") return { erro: "Esse contrato já foi assinado." };

    const link = linkContrato(c.token);
    const texto = `Olá, ${c.destinatario_nome}! Segue o contrato "${c.titulo}" da ${c.marca} para você conferir e assinar pelo celular:\n\n${link}\n\nÉ rápido: você completa seus dados, lê o contrato e assina. Qualquer dúvida, é só responder esta mensagem.`;

    if (c.confirmacao === "whatsapp") {
      if (!c.destinatario_whatsapp) return { erro: "Contrato sem WhatsApp." };
      await enviarLinkContrato({ numero: c.destinatario_whatsapp, nome: c.destinatario_nome, titulo: c.titulo, marca: c.marca, link, token: c.token });
    } else {
      if (!c.destinatario_email) return { erro: "Contrato sem e-mail." };
      await enviarEmail(c.destinatario_email, `Contrato para assinar: ${c.titulo}`, texto);
    }

    await supabase.from("contratos").update({ status: c.status === "rascunho" ? "enviado" : c.status, enviado_em: c.enviado_em ?? new Date().toISOString() }).eq("id", id);
    await supabase.from("eventos").insert({ contrato_id: id, acao: "enviado", detalhes: { canal: c.confirmacao } });
    revalidatePath(`/contratos/${id}`);
    return { ok: `Link enviado por ${c.confirmacao === "whatsapp" ? "WhatsApp" : "e-mail"}.` };
  } catch (e) {
    return { erro: erroDe(e) };
  }
}

export async function cancelarContrato(id: string): Promise<Estado> {
  const { supabase } = await equipe();
  const { data } = await supabase.from("contratos").update({ status: "cancelado" }).eq("id", id).neq("status", "assinado").select("id").maybeSingle();
  if (!data) return { erro: "Contrato assinado não pode ser cancelado." };
  await supabase.from("eventos").insert({ contrato_id: id, acao: "cancelado" });
  revalidatePath(`/contratos/${id}`);
  return { ok: "Contrato cancelado." };
}

export async function excluirContrato(id: string) {
  const { supabase } = await equipe();
  await supabase.from("contratos").delete().eq("id", id).eq("status", "rascunho");
  revalidatePath("/");
  redirect("/");
}

/** Consulta pública de CNPJ para preencher o cadastro */
export async function buscarCnpj(cnpj: string): Promise<{ erro?: string; dados?: { razao: string; fantasia: string; endereco: string } }> {
  const d = soDigitos(cnpj);
  if (d.length !== 14) return { erro: "CNPJ incompleto." };
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${d}`, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return { erro: res.status === 404 ? "CNPJ não encontrado." : "Consulta indisponível agora." };
    const j = (await res.json()) as Record<string, string>;
    const endereco = [
      `${j.descricao_tipo_de_logradouro ?? ""} ${j.logradouro ?? ""}`.trim(),
      j.numero,
      j.bairro,
      `${j.municipio ?? ""}/${j.uf ?? ""}`,
      j.cep ? `CEP ${String(j.cep).replace(/(\d{5})(\d{3})/, "$1-$2")}` : "",
    ]
      .filter(Boolean)
      .join(", ");
    return { dados: { razao: j.razao_social ?? "", fantasia: j.nome_fantasia ?? "", endereco } };
  } catch {
    return { erro: "Não foi possível consultar o CNPJ agora." };
  }
}

export async function sair() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
