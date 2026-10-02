# VisioPro Assina

Contratos online com assinatura eletrônica: você monta o contrato a partir de um modelo, manda o link, e o cliente preenche os próprios dados, lê e assina pelo celular.

**Stack:** Next.js 15 na Vercel · Supabase (Postgres, Auth, Storage, RLS) · WhatsApp pela Evolution API **ou** pela API oficial da Meta · Resend (e-mail, opcional) · @react-pdf para o documento.

## Como funciona
1. **Modelo**: texto do contrato com `{{chave}}` nos pontos variáveis e a lista de campos (quem preenche: você ou o cliente).
2. **Contrato**: escolhe o modelo, preenche o que já sabe, informa quem assina e o canal de confirmação.
3. **Envio**: link `assina.visiopro.app.br/c/<token>` pelo WhatsApp ou e-mail.
4. **Cliente**: completa os dados, lê o contrato montado, assina com o dedo, digita o nome e confirma com um código de 6 dígitos.
5. **PDF assinado**: gerado na hora, com a imagem da assinatura e uma página de comprovante (data, IP, aparelho, canal do código e hash do arquivo). Guardado em bucket privado.
6. **Verificação pública**: `/v` confere um documento pelo código, sem expor o conteúdo.

## Prova da assinatura
Cada contrato guarda: data de envio, de abertura e de assinatura; IP e navegador do signatário; para onde o código foi enviado; nome e documento informados; e o hash SHA-256 do PDF. Tudo isso vai para a última página do PDF e para a tabela `eventos`.

Assinatura eletrônica simples é válida entre as partes (MP 2.200-2/2001, art. 10, § 2º). Para contratos de valor alto ou que precisem de fé pública, use certificado ICP-Brasil.

## Deploy
1. **Supabase**: rode `supabase/migrations/0001_init.sql` e `0002_modelo_padrao.sql`. Crie os usuários da equipe em Authentication > Users (não há cadastro aberto).
2. **Vercel**: variáveis do `.env.example`.
3. **Evolution**: a instância usada para enviar está em `EVOLUTION_INSTANCIA`.
4. **E-mail**: só é necessário se você for usar confirmação por e-mail.

## WhatsApp: Evolution ou Meta
`WHATSAPP_PROVEDOR=evolution` usa o WhatsApp Web (texto livre, sem custo por mensagem, com risco de bloqueio do número).
`WHATSAPP_PROVEDOR=meta` usa a Cloud API oficial, que exige **dois modelos aprovados** no Gerenciador do WhatsApp:

**1. `contrato_para_assinar` — categoria Utilidade**
- Corpo: `Olá, {{1}}! O contrato "{{2}}" da {{3}} está pronto para sua assinatura.`
- Botão: **URL dinâmica** `https://assina.visiopro.app.br/c/{{1}}` (o app envia o token como parâmetro)

**2. `codigo_assinatura` — categoria Autenticação**
- Use o modelo pronto de código, com o botão **copiar código**. O app envia o código no corpo e no botão.

Variáveis: `META_TOKEN` (token permanente), `META_PHONE_NUMBER_ID`, `META_API_VERSION` (padrão v21.0), `META_TEMPLATE_IDIOMA` (padrão pt_BR), `META_TEMPLATE_CONTRATO` e `META_TEMPLATE_CODIGO`. Se os nomes dos modelos forem outros, ajuste as variáveis.

## Limites conhecidos
- Um signatário por contrato. Duas assinaturas (ex.: testemunhas) exigiriam outra rodada de desenvolvimento.
- O cliente não pode alterar o texto, só preencher campos.
- Sem lembrete automático para quem não assinou (o reenvio é manual, pelo painel).
