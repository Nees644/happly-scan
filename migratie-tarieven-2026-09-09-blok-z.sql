-- ===========================================================================
-- VOORSTEL · MIGRATIE 09-09-2026 · Tarieven v3, BLOK Z: de omschakeling
--
-- Draait NA migratie-tarieven-2026-09-09.sql EN nadat de nieuwe code live staat.
-- Dit blok zet de oude productcodes uit. Draait het eerder, dan kan niemand meer
-- een Teamfoto of hermeting kopen: de site van vandaag vraagt nog om TF en HM.
--
-- Herhaalbaar: een update naar een stand die er al is verandert niets.
-- ===========================================================================

-- TF en HM uit v1 vervallen; het pakket komt ervoor in de plaats. Niet
-- verwijderen: bestellingen wijzen ernaar en een factuur van vorige week hoort
-- te blijven kloppen.
update public.producten set actief = false, updated_at = now()
  where code in ('TF','HM','BEG-2','BEG-8','LIC-ORG-10','LIC-ORG-30','LIC-ORG-X');

-- LIC-M en LIC-J, de persoonlijke licentie van 29 en 290 euro uit v1. Ze staan
-- niet in het rijtje dat vervalt maar ze moeten wel weg: ze beloven onbeperkt
-- gratis metingen, terwijl een Professional in v3 145 euro per pakket betaalt.
-- Bevestigd op 10 september 2026: er is er geen een verkocht, dus er is geen
-- klant die er recht aan ontleent. De lijn Professional (PRO-M, PRO-J) komt
-- ervoor in de plaats.
update public.producten set actief = false, updated_at = now()
  where code in ('LIC-M','LIC-J');
