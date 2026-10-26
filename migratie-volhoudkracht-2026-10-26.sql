-- ===========================================================================
-- MIGRATIE · Volhoudkracht Scan (26 oktober 2026)
--
-- Hoort bij briefings/volhoudkracht-scan.md, paragraaf 10.
--
-- Draait NA migratie-leidersbeeld-2026-09-15.sql (tabel opvolging bestaat).
-- Herhaalbaar: create if not exists, add column if not exists, de check op
-- opvolging wordt eerst gedropt en dan opnieuw gezet. Er wordt niets
-- verwijderd.
--
-- Sinds 30 oktober 2026 krijgt een nieuwe tabel in public geen Data
-- API-toegang vanzelf; daarom de grant aan service_role in dit blok. Niets
-- aan anon of authenticated: de routes schrijven en lezen met de service role.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- BLOK A · de scan zelf
--
-- Een rij is twee dingen tegelijk: de meting van de professional over zijn
-- programma, en een lead. De scores worden door de serverfunctie uitgerekend
-- uit de antwoorden; de browser bepaalt niets.
create table if not exists public.volhoudkracht (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),

  -- De eigen ingang: /volhoudkracht/:token. Staat alleen in de mail.
  token             uuid not null unique default gen_random_uuid(),

  -- Het woord van de invuller; [programma] in de vragen wordt ermee gevuld.
  woord             text not null check (woord in ('programma','training','traject','interventie')),
  programma_naam    text not null,
  aanbieder         text not null check (aanbieder in ('eigen','keten')),

  naam              text not null,
  email             text not null,
  organisatie       text not null,

  -- { R1: 0..3, ..., M4: 0..3 }
  antwoorden        jsonb not null,
  score             integer not null check (score between 0 and 100),
  dim_reden         integer not null check (dim_reden between 0 and 100),
  dim_plan          integer not null check (dim_plan between 0 and 100),
  dim_ritme         integer not null check (dim_ritme between 0 and 100),
  dim_weerstand     integer not null check (dim_weerstand between 0 and 100),
  dim_contact       integer not null check (dim_contact between 0 and 100),
  dim_meting        integer not null check (dim_meting between 0 and 100),
  zwakste           text not null check (zwakste in ('R','P','T','W','C','M')),
  band              text not null check (band in ('start','bedoeld','georganiseerd')),

  herkomst_src      text,
  privacy_akkoord_op timestamptz not null,
  mail_verzonden_op timestamptz,
  mail_geopend_op   timestamptz
);

create index if not exists volhoudkracht_email_idx on public.volhoudkracht (email);
create index if not exists volhoudkracht_created_idx on public.volhoudkracht (created_at desc);

alter table public.volhoudkracht enable row level security;

-- Lezen in het beheerscherm: alleen de beheerder. De publieke routes gaan via
-- de service role en langs RLS heen.
drop policy if exists "volhoudkracht lezen" on public.volhoudkracht;
create policy "volhoudkracht lezen" on public.volhoudkracht
  for select to authenticated using (public.teamkracht_is_beheerder());

grant select, insert, update, delete on public.volhoudkracht to service_role;


-- ---------------------------------------------------------------------------
-- BLOK B · opvolging krijgt een derde bron
--
-- Zelfde tabel als voor het Leidersbeeld en de Zelfkracht Index, zodat straks
-- één scherm alle leads toont. De check die afdwingt dat er precies één bron
-- is gevuld, wordt uitgebreid; de bestaande rijen voldoen er al aan.
alter table public.opvolging
  add column if not exists volhoudkracht_id uuid references public.volhoudkracht(id) on delete cascade;

alter table public.opvolging drop constraint if exists opvolging_bron_check;
alter table public.opvolging drop constraint if exists opvolging_een_bron;

alter table public.opvolging
  add constraint opvolging_bron_check check (bron in ('leidersbeeld','zelfkracht','volhoudkracht'));

alter table public.opvolging
  add constraint opvolging_een_bron check (
    (bron = 'leidersbeeld'  and leidersbeeld_id  is not null and opvolgreeks_id is null and volhoudkracht_id is null)
    or
    (bron = 'zelfkracht'    and opvolgreeks_id   is not null and leidersbeeld_id is null and volhoudkracht_id is null)
    or
    (bron = 'volhoudkracht' and volhoudkracht_id is not null and leidersbeeld_id is null and opvolgreeks_id is null)
  );

create index if not exists opvolging_volhoudkracht_idx
  on public.opvolging (volhoudkracht_id, created_at desc)
  where volhoudkracht_id is not null;


-- ---------------------------------------------------------------------------
-- Controle: één rij terug, met de nieuwe tabel en de nieuwe kolom.
select
  (select count(*) from information_schema.tables  where table_schema = 'public' and table_name = 'volhoudkracht') as tabel_volhoudkracht,
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'opvolging' and column_name = 'volhoudkracht_id') as kolom_opvolging,
  (select count(*) from public.volhoudkracht) as scans;
