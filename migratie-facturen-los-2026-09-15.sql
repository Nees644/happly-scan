-- ===========================================================================
-- MIGRATIE · Factuur bij een aankoop vooraf (15 september 2026)
--
-- Tot nu toe maakte alleen de maandrun facturen, voor wie achteraf betaalt. Wie
-- vooraf koopt, kreeg een betaling bij Mollie en verder niets. Een klant die
-- 598,95 euro afrekent hoort een factuur te krijgen die hij kan boeken, en dat
-- vraagt twee dingen die er nog niet zijn: zijn adres, en een plek om de
-- factuur aan de bestelling te hangen.
--
-- Een factuur bevriest het adres. Verhuist de klant volgend jaar, dan hoort de
-- factuur van vandaag zijn oude adres te houden; daarom staan de velden zowel
-- op de gebruiker (wat nu geldt) als op de factuur (wat toen gold).
--
-- Alleen toevoegen. Herhaalbaar.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- BLOK A · de factuurgegevens van de koper
--
-- naam, organisatie en btw_nummer staan al op teamkracht_gebruikers sinds de
-- certificeringsmigratie. Hier komt het adres erbij.
alter table public.teamkracht_gebruikers
  add column if not exists factuur_naam      text,
  add column if not exists factuur_adres     text,
  add column if not exists factuur_postcode  text,
  add column if not exists factuur_plaats    text,
  add column if not exists factuur_land      text not null default 'NL';


-- ---------------------------------------------------------------------------
-- BLOK B · de factuur van een losse aankoop
--
-- bestelling_id is uniek: een bestelling krijgt hoogstens een factuur. Dat is
-- ook de hele beveiliging tegen dubbel factureren, want de melding van Mollie
-- en de terugkeerpagina doen allebei hetzelfde werk.
alter table public.facturen
  add column if not exists bestelling_id    uuid references public.bestellingen(id) on delete set null,
  add column if not exists klant_naam       text,
  add column if not exists klant_adres      text,
  add column if not exists klant_postcode   text,
  add column if not exists klant_plaats     text,
  add column if not exists klant_land       text,
  add column if not exists klant_referentie text,
  add column if not exists verstuurd_op     timestamptz;

create unique index if not exists facturen_bestelling_idx
  on public.facturen (bestelling_id) where bestelling_id is not null;
