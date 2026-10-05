-- MIGRATIE · Lezer heet naar buiten Gecertificeerde Practitioner (5 oktober 2026)
--
-- Alleen de namen en omschrijvingen die een klant ziet, op de prijslijst en
-- op de factuur. De codes (LEZ-1, LEZ-2, LEZ-10), de groep LEZ en het niveau
-- lezer in de database blijven zoals ze zijn: daar hangen betalingen en
-- toegangsrechten aan. Geen bedrag verandert.
--
-- Een factuur die al is uitgegeven blijft zoals hij is; alleen nieuwe
-- facturen dragen de nieuwe naam.

update public.producten
   set naam        = replace(naam, 'Lezer', 'Practitioner'),
       bevat       = replace(bevat, 'Lezer', 'Practitioner'),
       voorwaarde  = replace(voorwaarde, 'Lezer', 'Practitioner'),
       updated_at  = now()
 where naam like '%Lezer%'
    or bevat like '%Lezer%'
    or voorwaarde like '%Lezer%';

-- Controle: dit hoort nul rijen te geven.
select code, naam from public.producten
 where naam like '%Lezer%' or bevat like '%Lezer%' or voorwaarde like '%Lezer%';
