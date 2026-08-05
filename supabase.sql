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
