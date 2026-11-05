-- Zelfstartregister: partners en kortingscodes, 5 november 2026.
-- Een intermediair wordt partner en krijgt een kortingscode voor zijn
-- kandidaten. De code geeft een percentage korting op Verificatie & Voorkeur
-- (met en zonder Plus Class). Bij elke registratie die ermee betaalt, wordt
-- vastgelegd via welke partner dat ging.

create table if not exists public.zelfstarters_partners (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  code text not null unique,
  korting_pct integer not null default 25 check (korting_pct between 0 and 100),
  soort text not null default 'open' check (soort in ('open', 'founding')),
  email text,
  actief boolean not null default true,
  aangemaakt_op timestamptz not null default now()
);
create index if not exists zelfstarters_partners_code on public.zelfstarters_partners (upper(code));
grant select, insert, update, delete on public.zelfstarters_partners to service_role;

alter table public.zelfstarters
  add column if not exists partner_id uuid references public.zelfstarters_partners (id),
  add column if not exists kortingscode text,
  add column if not exists korting_cent integer not null default 0;
