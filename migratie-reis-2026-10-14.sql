-- ============================================================
-- ZELFKRACHT SCAN · migratie 14-10-2026: koppeling aan de Volhoudreis
-- Supabase-project van de scan (uqulkznqcqpbagbvtqdr). Idempotent.
--
-- Een meting die vanuit een reis wordt gedaan (link met ?reis=<token>)
-- krijgt de reistoken mee. De scan weet verder niets van de reis: de
-- vier getallen gaan via api/scan.js naar de reisserver (api/reis-scan),
-- met een gedeeld geheim. Verwijdert een deelnemer zijn reis, dan maakt
-- de reisserver deze kolom leeg; de meting zelf blijft anoniem staan.
-- ============================================================

alter table public.index_scan_results
  add column if not exists reis_token text
    check (reis_token is null or reis_token ~ '^[0-9a-f]{32}$'),
  add column if not exists reis_meting text
    check (reis_meting is null or reis_meting in ('start','eind'));

create index if not exists index_scan_results_reis_token_idx
  on public.index_scan_results (reis_token)
  where reis_token is not null;

-- ── CONTROLE (toont één rij) ─────────────────────────────────
select
  count(*)                         as metingen,
  count(reis_token)                as metingen_uit_een_reis
from public.index_scan_results;
