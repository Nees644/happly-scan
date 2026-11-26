-- Sterker op je werk: aanmelden met factuur, 26 november 2026.
--
-- Een organisatie meldt zich aan op scan.happly.nl/sterker-aanmelden. Direct
-- daarna maakt het systeem een btw-factuur met een eigen nummer uit dezelfde
-- reeks als alle andere facturen, met een betaaltermijn van veertien dagen en
-- een betaallink via Mollie (creditcard, iDEAL en wat Mollie verder aanbiedt).
-- Is er betaald, dan gaat de factuur op betaald.
--
-- Drie producten, excl. btw, de bedragen van happly.nl (besluit 25 november
-- 2026). Een heel team blijft op offerte en staat hier niet in.
--
-- Alleen toevoegen. Herhaalbaar. Eindigt met een controleregel.

-- 1. De productgroep en de soort bestaan nog niet als waarde.
alter table public.producten drop constraint if exists producten_soort_check;
alter table public.producten add constraint producten_soort_check
  check (soort in ('meting','certificering','licentie','credit','bundel','registratie','programma'));
alter table public.producten drop constraint if exists producten_groep_check;
alter table public.producten add constraint producten_groep_check
  check (groep is null or groep in ('PAK','HM','ORG','PRO','BUR','LEZ','BEG','OPL','ZS','SOW'));

-- 2. De drie producten. Fase B: ze staan niet in de openbare prijslijst van de
--    scans; ze worden verkocht via happly.nl en het aanmeldformulier.
insert into public.producten
  (code, naam, prijs_ex_btw, interval, soort, fase, groep, prijsniveau, betaalwijze, bevat, voorwaarde)
values
('SOW-START', 'Sterker op je werk, twaalf weken', 39500, 'eenmalig', 'programma', 'B', 'SOW', null, 'vooraf',
  'Twaalf weken elke week 15 minuten met een vaste coach, en Zetjes voor tussendoor', 'Per deelnemer'),
('SOW-LEID', 'Sterker op je werk voor leidinggevenden, twaalf weken', 69500, 'eenmalig', 'programma', 'B', 'SOW', null, 'vooraf',
  'Twaalf weken elke week 15 minuten met een vaste coach, het Leidersbeeld en het team in beeld bij start en eind', 'Per leidinggevende'),
('SOW-JAAR', 'Sterker op je werk, jaarplek', 99000, 'eenmalig', 'programma', 'B', 'SOW', null, 'vooraf',
  'Een jaar lang elke twee weken je coach en elke week Zetjes', 'Per deelnemer')
on conflict (code) do update set naam = excluded.naam, prijs_ex_btw = excluded.prijs_ex_btw,
  bevat = excluded.bevat, voorwaarde = excluded.voorwaarde, soort = excluded.soort, groep = excluded.groep, actief = true;

-- 3. De aanmeldingen. Het bedrag wordt bevroren op het moment van aanmelden.
create table if not exists public.sterker_aanmeldingen (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  -- Met dit token opent de klant zijn betaalpagina, zonder account.
  token             text not null unique,
  product_code      text not null references public.producten(code),
  plaatsen          integer not null check (plaatsen between 1 and 500),
  organisatie       text not null,
  contact_naam      text not null,
  email             text not null,
  telefoon          text,
  klant_adres       text not null,
  klant_postcode    text not null,
  klant_plaats      text not null,
  klant_land        text not null default 'NL',
  klant_btw_nummer  text,
  referentie        text,
  deelnemers        text,
  opmerking         text,
  herkomst          text,
  prijs_plaats_cent integer not null,
  bedrag_ex_cent    integer not null,
  btw_cent          integer not null,
  bedrag_cent       integer not null,
  status            text not null default 'open' check (status in ('open','betaald','geannuleerd')),
  mollie_payment_id text,
  betaald_op        timestamptz,
  factuur_id        uuid references public.facturen(id) on delete set null
);

create index if not exists sterker_aanmeldingen_status_idx on public.sterker_aanmeldingen (status, created_at desc);
create index if not exists sterker_aanmeldingen_mollie_idx on public.sterker_aanmeldingen (mollie_payment_id);

alter table public.sterker_aanmeldingen enable row level security;
-- Regel sinds 30 oktober 2026: alleen de service-sleutel, niets aan anon of authenticated.
grant select, insert, update, delete on public.sterker_aanmeldingen to service_role;

-- 4. De factuur hoort bij hoogstens één aanmelding, en krijgt een vervaldatum.
alter table public.facturen
  add column if not exists sterker_id uuid references public.sterker_aanmeldingen(id) on delete set null,
  add column if not exists vervaldatum date;
create unique index if not exists facturen_sterker_idx on public.facturen (sterker_id) where sterker_id is not null;

-- Controle: drie actieve producten en de nieuwe tabel.
select (select count(*) from public.producten where groep = 'SOW' and actief) as producten,
       (select count(*) from public.sterker_aanmeldingen) as aanmeldingen;
