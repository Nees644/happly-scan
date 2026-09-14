-- ===========================================================================
-- MIGRATIE v4 · BLOK Z: de omschakeling
--
-- Draait NA migratie-tarieven-v4-2026-09-14.sql EN nadat de nieuwe code live
-- staat. Dit blok zet de oude productcodes uit; draait het eerder, dan kloppen
-- de prijzen op de site niet meer met wat de code vraagt.
--
-- Herhaalbaar: een update naar een stand die er al is verandert niets.
-- ===========================================================================

-- Alles wat v4 vervangt. Niet verwijderen: er hangen bestellingen aan.
update public.producten set actief = false, updated_at = now()
 where code in (
   -- de tegoedrijen uit v3, partners kopen niets meer vooraf
   'PAK-BUR', 'PAK-BUR-EXTRA', 'HM-BUR',
   -- v1 en v2, voor het geval een omgeving ze nog actief heeft
   'TF', 'HM', 'LIC-M', 'LIC-J', 'BEG-2', 'BEG-8',
   'LIC-ORG-10', 'LIC-ORG-30', 'LIC-ORG-X'
 );

-- Wie een certificaat heeft maar geen licentie, is vanaf nu partner zonder
-- licentie en betaalt 249 in plaats van 495.
update public.teamkracht_gebruikers
   set lijn = 'partner_zonder_licentie'
 where lijn = 'los'
   and niveau in ('lezer','begeleider','opleider')
   and licentie_actief = false;
