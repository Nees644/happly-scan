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
