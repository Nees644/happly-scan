-- Het gratis proefkwartier voor leidinggevenden, 27 november 2026.
-- Twintig plekken in december. De aanvraag komt hier binnen voordat de
-- aanvrager doorgaat naar cal.com om een moment te kiezen.
-- Alleen toevoegen. Herhaalbaar. Eindigt met een controleregel.

create table if not exists public.proefkwartier_aanvragen (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  naam          text not null,
  email         text not null,
  organisatie   text,
  doel          text not null check (doel in ('rust','grip','gesprek','energie','team','steviger')),
  toelichting   text,
  -- Kwam de aanvrager van zijn leiderpagina, dan staat hier het token van zijn Leidersbeeld.
  leider_token  text,
  herkomst      text,
  -- Voor de opvolging: gepland, gehouden, zetje verstuurd, programma gekocht.
  status        text not null default 'aangevraagd'
                check (status in ('aangevraagd','gepland','gehouden','opgevolgd','klant','geen'))
);

create index if not exists proefkwartier_aanvragen_tijd_idx on public.proefkwartier_aanvragen (created_at desc);

alter table public.proefkwartier_aanvragen enable row level security;
-- Regel sinds 30 oktober 2026: alleen de service-sleutel, niets aan anon of authenticated.
grant select, insert, update, delete on public.proefkwartier_aanvragen to service_role;

select (select count(*) from public.proefkwartier_aanvragen) as aanvragen;
