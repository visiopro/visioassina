-- VisioPro Assina — contratos com assinatura eletrônica

create extension if not exists "pgcrypto";

create type status_contrato as enum ('rascunho', 'enviado', 'visualizado', 'assinado', 'cancelado');
create type confirmacao as enum ('whatsapp', 'email');

-- ============================================================
-- Modelos de contrato
-- ============================================================
create table modelos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 120),
  marca text not null default 'VisioPro',      -- aparece no cabeçalho do PDF
  corpo text not null,                          -- texto com {{variaveis}}
  campos jsonb not null default '[]'::jsonb,    -- [{chave,rotulo,tipo,quem,obrigatorio}]
  ativo boolean not null default true,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Contratos enviados
-- ============================================================
create table contratos (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid references modelos(id) on delete restrict,
  titulo text not null,
  marca text not null default 'VisioPro',
  corpo text not null,                          -- cópia do modelo no envio
  campos jsonb not null default '[]'::jsonb,    -- definição dos campos
  valores jsonb not null default '{}'::jsonb,   -- o que já foi preenchido
  destinatario_nome text not null,
  destinatario_whatsapp text check (destinatario_whatsapp is null or destinatario_whatsapp ~ '^55[0-9]{10,11}$'),
  destinatario_email text,
  confirmacao confirmacao not null default 'whatsapp',
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  codigo_verificacao text not null unique default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10)),
  status status_contrato not null default 'rascunho',
  expira_em date,
  enviado_em timestamptz,
  visualizado_em timestamptz,
  assinado_em timestamptz,
  -- prova da assinatura
  assinatura_imagem text,                       -- PNG em base64 (desenho)
  assinatura_nome text,                         -- nome digitado
  assinante_documento text,
  assinante_ip text,
  assinante_agente text,
  codigo_enviado_para text,
  pdf_path text,
  pdf_hash text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index on contratos (status, created_at desc);

-- código de confirmação (OTP) em tabela própria: some depois de usado
create table codigos (
  contrato_id uuid primary key references contratos(id) on delete cascade,
  codigo text not null,
  enviado_para text not null,
  tentativas int not null default 0,
  expira_em timestamptz not null,
  created_at timestamptz not null default now()
);

-- trilha de auditoria
create table eventos (
  id bigint generated always as identity primary key,
  contrato_id uuid not null references contratos(id) on delete cascade,
  acao text not null,
  ip text,
  agente text,
  detalhes jsonb,
  created_at timestamptz not null default now()
);
create index on eventos (contrato_id, created_at);

-- ============================================================
-- RLS: a equipe da VisioPro (usuários logados) vê tudo;
-- o cliente acessa só pelo link público, que passa pelo servidor.
-- ============================================================
alter table modelos enable row level security;
alter table contratos enable row level security;
alter table codigos enable row level security;
alter table eventos enable row level security;

create policy modelos_equipe on modelos for all to authenticated using (true) with check (true);
create policy contratos_equipe on contratos for all to authenticated using (true) with check (true);
create policy eventos_equipe on eventos for select to authenticated using (true);
-- codigos não tem política: só o servidor acessa

-- bucket privado dos PDFs assinados
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contratos', 'contratos', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;
create policy contratos_pdf_ler on storage.objects for select to authenticated
  using (bucket_id = 'contratos');
