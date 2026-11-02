-- migratie-zelfstarters-2026-11-02.sql
-- Het Zelfstartregister: registraties van zelfstandige professionals via
-- zelfstarters.nl. Een registratie is een betaling plus een meting. Het
-- nummer wordt pas uitgegeven als er is betaald; de badge pas als er ook is
-- gemeten. Draai dit bestand één keer in de SQL-editor van Supabase.

-- Een registratie is een nieuwe soort en ZS een nieuwe groep; de bestaande
-- waarden blijven staan.
alter table public.producten drop constraint if exists producten_soort_check;
alter table public.producten add constraint producten_soort_check
  check (soort in ('meting','certificering','licentie','credit','bundel','registratie'));
alter table public.producten drop constraint if exists producten_groep_check;
alter table public.producten add constraint producten_groep_check
  check (groep is null or groep in ('PAK','HM','ORG','PRO','BUR','LEZ','BEG','OPL','ZS'));

-- De twee producten. Founding-tarief tot 31 december 2026; daarna komen er
-- nieuwe rijen (11900 en 34900) en gaan deze op actief = false.
insert into public.producten
  (code, naam, prijs_ex_btw, interval, soort, fase, groep, prijsniveau, betaalwijze, bevat, voorwaarde)
values
('ZS-STD',  'Zelfstarters Standaard, founding-tarief',  7900, 'eenmalig', 'registratie', 'A', 'ZS', null, 'vooraf',
  'Zelfkracht Scan met duiding, registratienummer, badge, jaarlijkse hermeting', 'Founding-tarief tot 31 december 2026'),
('ZS-PLUS', 'Zelfstarters Plus Class, founding-tarief', 29900, 'eenmalig', 'registratie', 'A', 'ZS', null, 'vooraf',
  'Alles uit Standaard plus een dag live, de plus op badge en certificaat', 'Founding-tarief tot 31 december 2026')
on conflict (code) do nothing;

-- De registraties zelf.
create table if not exists public.zelfstarters (
  id uuid primary key default gen_random_uuid(),
  aangemaakt_op timestamptz not null default now(),
  naam text not null,
  email text not null,
  type text not null check (type in ('standaard','plus')),
  product_code text not null references public.producten(code),
  bedrag_cent integer not null,
  btw_cent integer not null,
  status text not null default 'open' check (status in ('open','betaald','mislukt','verlopen')),
  mollie_payment_id text unique,
  betaald_op timestamptz,
  nummer text unique,
  verificatiecode uuid not null default gen_random_uuid(),
  scan_id uuid,
  eerste_meting_op timestamptz,
  laatste_meting_op timestamptz,
  meetjaren integer[] not null default '{}',
  plus_class_op date,
  plus_class_gevolgd_op date,
  mail_welkom_op timestamptz,
  mail_herinnering_op timestamptz,
  mail_badge_op timestamptz,
  openbaar boolean not null default true
);
create index if not exists zelfstarters_email_idx on public.zelfstarters (lower(email));
create index if not exists zelfstarters_status_idx on public.zelfstarters (status);

-- Nummers lopen per jaar op: ZS-2026-00001. De teller is één reeks voor alle
-- jaren; het jaar in het nummer is het jaar van betaling.
create sequence if not exists public.zelfstarters_nummer_seq;

create or replace function public.zelfstarters_nieuw_nummer(p_jaar integer)
returns text language sql as $$
  select 'ZS-' || p_jaar::text || '-' || lpad(nextval('public.zelfstarters_nummer_seq')::text, 5, '0');
$$;

-- Sinds 30 oktober 2026 krijgt een nieuwe tabel geen Data API-toegang vanzelf.
grant select, insert, update, delete on public.zelfstarters to service_role;
grant usage, select on sequence public.zelfstarters_nummer_seq to service_role;
grant execute on function public.zelfstarters_nieuw_nummer(integer) to service_role;
