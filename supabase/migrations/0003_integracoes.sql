-- Integração com outros sistemas da VisioPro (ex.: Visio Loca).
-- Cada sistema tem uma chave de API (só o hash fica aqui) e, opcionalmente,
-- um webhook que recebe os eventos dos contratos que ele criou.

create table integracoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 80),
  chave_hash text not null unique,            -- sha256 hex da chave de API
  webhook_url text check (webhook_url is null or webhook_url ~ '^https://'),
  webhook_segredo text not null,              -- assina o corpo do webhook (HMAC-SHA256)
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
-- Sem políticas: só o servidor (service role) lê esta tabela.
alter table integracoes enable row level security;

alter table contratos
  add column integracao_id uuid references integracoes(id) on delete restrict,
  add column referencia_externa text check (referencia_externa is null or char_length(referencia_externa) <= 200);
create index on contratos (integracao_id, referencia_externa);

-- Exemplo de cadastro (troque os valores; a chave em texto puro fica só no outro sistema):
-- insert into integracoes (nome, chave_hash, webhook_url, webhook_segredo)
-- values ('Visio Loca', encode(sha256('CHAVE_DE_API'::bytea), 'hex'), 'https://loca.visiopro.app.br/api/assina/webhook', 'SEGREDO_DO_WEBHOOK');
