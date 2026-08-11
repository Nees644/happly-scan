-- Zelfkracht Index · Supabase-schema
-- Draai dit één keer in de Supabase SQL-editor van project uqulkznqcqpbagbvtqdr.
-- Nieuwe tabel, los van de bestaande scan_results (B2B-spoor), zodat die ongemoeid blijft.

create table if not exists public.index_scan_results (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  index_score   int  not null,
  zien          int  not null,
  sturen        int  not null,
  doen          int  not null,
  items         jsonb,               -- gespiegelde itemscores {Z1..D4}
  age_band      text,                -- optionele contextvraag
  work_situation text,               -- optionele contextvraag
  email         text,                -- pas gevuld bij leadcapture
  name          text,
  company       text,
  duiding       text,                -- de volledige gegenereerde duiding (AI of terugval)
  duiding_generated_at timestamptz,  -- moment van generatie
  duiding_fallback boolean           -- true = terugvaltekst gebruikt in plaats van de AI
);

-- RLS aan. Alle schrijf- en leesacties lopen via de serverside API-routes met de
-- service role key (die RLS omzeilt), dus we geven de anon-rol hier niets.
-- Consistent met het bestaande beleid: anon SELECT ingetrokken op gevoelige tabellen.
alter table public.index_scan_results enable row level security;

-- Bewust geen anon-policies: geen anon INSERT, geen anon SELECT.
-- (De browser praat nooit rechtstreeks met deze tabel; alles gaat via /api/*.)

-- Handige index voor de latere itemanalyse.
create index if not exists index_scan_results_created_at_idx
  on public.index_scan_results (created_at);

-- Leesrecht voor ingelogde dashboardgebruikers (dashboard-index.html).
-- De anon-rol blijft volledig buitengesloten; alleen wie via Supabase Auth is
-- ingelogd (hetzelfde account als het B2B-dashboard) mag lezen.
drop policy if exists "authenticated read" on public.index_scan_results;
create policy "authenticated read" on public.index_scan_results
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- MIGRATIE 24-07-2026 · duiding opslaan bij de meting
-- Voor het bestaande project: draai alleen dit blok in de SQL-editor.
-- (Nieuwe installaties krijgen de kolommen al via de create table hierboven.)
alter table public.index_scan_results
  add column if not exists duiding text,
  add column if not exists duiding_generated_at timestamptz,
  add column if not exists duiding_fallback boolean;

-- ---------------------------------------------------------------------------
-- MIGRATIE 27-07-2026 · funnel_events (conversiemeting in de keten)
-- Voor het bestaande project: draai alleen dit blok in de SQL-editor.
-- Anonieme gebruiksstatistieken: event, bron en een random sessie-id per bezoek.
-- Bewust GEEN koppeling aan index_scan_results of persoonsgegevens.

create table if not exists public.funnel_events (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event      text not null,
  bron       text,        -- src-parameter (uitslag, mail, post); null voor scan-events
  sessie     text not null -- random per paginabezoek, leeft alleen in paginageheugen
);

-- RLS: de browser mag met de anon key uitsluitend schrijven, nooit lezen.
alter table public.funnel_events enable row level security;

drop policy if exists "anon insert" on public.funnel_events;
create policy "anon insert" on public.funnel_events
  for insert to anon with check (true);

-- Leesrecht alleen voor ingelogde dashboardgebruikers (zelfde patroon als
-- index_scan_results), zodat de funnel straks in het dashboard kan.
drop policy if exists "authenticated read" on public.funnel_events;
create policy "authenticated read" on public.funnel_events
  for select to authenticated using (true);

create index if not exists funnel_events_created_at_idx
  on public.funnel_events (created_at);
create index if not exists funnel_events_event_idx
  on public.funnel_events (event);

-- ---------------------------------------------------------------------------
-- MIGRATIE 05-08-2026 · herkomstmeting (src) + opvolgreeks
-- Voor het bestaande project: draai alleen dit blok in de SQL-editor.

-- 1. Herkomst: de src-parameter uit de URL gaat sessiebreed mee met alle
--    funnel-events (naast de eventgebonden kolom bron, die blijft wat hij was).
alter table public.funnel_events add column if not exists src text;

-- 2. Opvolgreeks: één rij per meting met mailadres. De cron (/api/opvolg)
--    leest hieruit welke mail (dag 3, 7, 56) aan de beurt is.
--    laagste_dimensie bepaalt de scène in de dag-3-mail en de weekkoppeling
--    in de dag-7-mail. afgemeld = true stopt de reeks (afmeldlink of nieuwe
--    meting met hetzelfde mailadres).
create table if not exists public.opvolgreeks (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  scan_id          uuid references public.index_scan_results(id),
  email            text not null,
  name             text,
  index_score      int,
  laagste_dimensie text not null,   -- Zien | Sturen | Doen
  afgemeld         boolean not null default false,
  mail3_sent_at    timestamptz,
  mail7_sent_at    timestamptz,
  mail56_sent_at   timestamptz
);

-- RLS: de browser komt hier nooit; alles loopt serverside via de service role.
alter table public.opvolgreeks enable row level security;

-- Leesrecht alleen voor ingelogde dashboardgebruikers (zelfde patroon als
-- index_scan_results); de anon-rol blijft volledig buitengesloten.
drop policy if exists "authenticated read" on public.opvolgreeks;
create policy "authenticated read" on public.opvolgreeks
  for select to authenticated using (true);

create index if not exists opvolgreeks_due_idx
  on public.opvolgreeks (afgemeld, created_at);
create index if not exists opvolgreeks_email_idx
  on public.opvolgreeks (email);

-- ---------------------------------------------------------------------------
-- MIGRATIE 05-08-2026b · deelbare herkenningszin
-- Voor het bestaande project: draai alleen deze regel in de SQL-editor.
-- De meest markante zin uit de duiding (AI-selectie via /api/deelzin), één keer
-- gegenereerd en met de meting opgeslagen voor het deelbeeld op de uitslagpagina.
alter table public.index_scan_results add column if not exists deel_zin text;

-- ---------------------------------------------------------------------------
-- MIGRATIE 05-08-2026c · LinkedIn-deelpagina (/deel/[id])
-- Voor het bestaande project: draai alleen dit blok in de SQL-editor.
--
-- deel_id is het PUBLIEKE id van de deelpagina, bewust een ander uuid dan het
-- interne scan-id: het scan-id geeft via /api/lead toegang tot de uitslagmail
-- en mag daarom nooit in een openbare link staan. deel_id ontsluit alleen de
-- deel_zin en het deelbeeld, nooit scores of persoonsgegevens.
alter table public.index_scan_results
  add column if not exists deel_id uuid not null default gen_random_uuid();
create unique index if not exists index_scan_results_deel_id_idx
  on public.index_scan_results (deel_id);

-- Publieke storage-bucket voor de gegenereerde deelbeelden (og:image).
-- Upload loopt serverside via /api/deelbeeld (service role, eenmalig per
-- meting); lezen kan iedereen, er staat alleen het deelbeeld in.
insert into storage.buckets (id, name, public)
  values ('deelbeelden', 'deelbeelden', true)
  on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- MIGRATIE 12-08-2026 · hermetingen herkennen en labelen
-- Voor het bestaande project: draai alleen dit blok in de SQL-editor.
--
-- Principe (briefing 12-08-2026): iedereen mag opnieuw meten, maar per
-- e-mailadres telt alleen de eerste afgeronde meting mee in de onderzoeksdata.
-- Latere metingen krijgen is_hermeting = true en verwijzen naar de eerste.
-- Er wordt niets geblokkeerd of verwijderd; geen unique constraint op email.
alter table public.index_scan_results
  add column if not exists is_hermeting boolean not null default false,
  add column if not exists eerste_meting_id uuid references public.index_scan_results(id);

-- Eenmalige opschoning van bestaande data: groepeer op genormaliseerd adres
-- (trim + lower, dezelfde normalisatie als api/hermeting.js en api/lead.js)
-- en label alle latere metingen als hermeting met verwijzing naar de oudste.
with eerste as (
  select distinct on (lower(trim(email))) id, lower(trim(email)) as adres
  from public.index_scan_results
  where email is not null and trim(email) <> ''
  order by lower(trim(email)), created_at asc
)
update public.index_scan_results r
set is_hermeting = true, eerste_meting_id = e.id
from eerste e
where r.email is not null
  and lower(trim(r.email)) = e.adres
  and r.id <> e.id;
