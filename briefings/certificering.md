> **Bron van waarheid.** Dit bestand in de repo is leidend. Een kopie in
> Downloads of Drive is een werkversie; wijk je daarvan af, werk dan dit bestand
> bij. Zie CLAUDE.md.
>
> **Gecorrigeerd ten opzichte van de aangeleverde versie:** waar de briefing
> Stripe noemt staat hier Mollie, want dat is wat er is gebouwd. Waar de briefing
> acht deelnemers noemt staat hier vijf, het besluit van 7, 8 en 9 september 2026.

# Briefing Claude Code · Certificering fase A (Lezer-module, register, licentie)

Datum: 9 september 2026. Bron van waarheid voor model en regels: `briefing_code_teamkracht.md`. Deze briefing bouwt daarop en verandert niets aan het meetmodel.

## Waarom
De metingen zijn het product. Happly gaat niet verdienen aan losse metingen maar aan certificering en verlenging. Fase A levert het minimum: iemand doorloopt online de Lezer-module, haalt een toets, staat in een openbaar register, krijgt een badge en een persoonlijke licentie waarmee Teamfoto's en hermetingen inbegrepen zijn.

## Scope fase A
1. Lezer-module: zes korte hoofdstukken (tekst en beeld, inhoud levert Maarten), voortgang per gebruiker.
2. Toets: 20 meerkeuzevragen uit een pool van 40, lat 16 goed, maximaal drie pogingen per 30 dagen.
3. Register: openbare pagina `teamkrachtindex.nl/register` en `/register/:slug` met naam, niveau (Lezer / Begeleider / Opleider), status (actief / niet actief), datum, optioneel organisatie en website. Zichtbaar alleen na expliciete toestemming bij de toets. Verwijderen op verzoek via instellingen.
4. Badge: PNG en SVG per certificaat met naam, niveau, jaar, verificatie-URL. Deelbaar op LinkedIn.
5. Licentie: `licentie_actief` op de gebruiker, gekoppeld aan een Mollie-abonnement (€ 29 per maand of € 290 per jaar). Actief = metingen inbegrepen; niet actief = losse prijzen (Teamfoto € 95, hermeting € 95).
6. Leesdrempel voor niet-gecertificeerden: gratis instructie (hoofdstuk 1 en 2 van de module) verplicht vóór de eerste Teamfoto.

Buiten scope fase A: Begeleider- en Opleiderniveau in de UI (wel als enum voorbereiden), organisatiebundels, leadknop, kwartaalbeelden.

## Datamodel (voorstel, ter review)
- `gebruikers`: bestaand, aanvullen met `niveau` (enum: geen, lezer, begeleider, opleider), `licentie_actief` (bool), `licentie_tot` (date), `mollie_customer_id`, `register_toestemming` (bool), `register_slug`.
- `certificaten`: id, gebruiker_id, niveau, uitgegeven_op, uitgegeven_door (gebruiker_id van Opleider, null = Happly), status, verificatiecode (uuid).
- `module_voortgang`: gebruiker_id, hoofdstuk, afgerond_op.
- `toets_pogingen`: gebruiker_id, gestart_op, score, geslaagd, antwoorden (jsonb).
- `toets_vragen`: id, vraag, opties (jsonb), juist, hoofdstuk, actief.

## Regels die hard zijn
- Individuele Zelfkracht-scores blijven alleen zichtbaar voor de deelnemer, ook voor certificaathouders.
- Teamfoto verschijnt pas bij minimaal vijf afgeronde deelnemers (`teamkracht_config.min_deelnemers_kaart`).
- Teams worden nooit naast andere teams uit dezelfde organisatie getoond.
- N wordt nergens publiek getoond.
- Server-side controle van `licentie_actief` en `niveau` bij elke Teamfoto-aanvraag; nooit vertrouwen op de client.

## Acceptatiecriteria
1. Een nieuwe gebruiker kan hoofdstuk 1 en 2 gratis doorlopen en daarna één Teamfoto aanvragen tegen € 95.
2. Na aankoop Lezer (€ 149 of € 495) zijn alle hoofdstukken open; na 16/20 verschijnt het certificaat, de badge en (bij toestemming) de registerpagina binnen één minuut.
3. Verificatie-URL toont naam, niveau, status en datum; een ingetrokken of verlopen licentie toont "niet actief" zonder de pagina te verwijderen.
4. Bij `licentie_actief = true` rekent een Teamfoto-aanvraag € 0; bij false € 95. Getest server-side.
5. Verwijderen uit register via instellingen werkt direct; certificaat blijft in de database met status ingetrokken_op_verzoek.

## Vragen aan Claude Code vóór de bouw
1. Hoe wordt `licentie_tot` bijgewerkt bij uitval van de Mollie-melding?
2. Register op teamkrachtindex.nl: apart Vercel-project of route binnen happly-scan? Voorkeur Maarten: één codebase, twee domeinen.
3. Geef een SQL-migratieblok ter review voordat het in Supabase draait.
