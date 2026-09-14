// api/factuurrun.js — Vercel serverless function, dagelijkse cron
// De maandelijkse verrekening uit sectie 2 van briefing_code_tarieven_v4.md.
//
// Draait elke dag, doet alleen iets op de eerste werkdag van de maand. Zo hoeft
// er geen cron te worden bijgesteld als een maand in het weekend begint.
//
// Per licentiehouder: alle niet-gefactureerde afnames van vorige maand bij
// elkaar, één factuur met een eigen nummer, en één incasso bij Mollie op het
// mandaat dat bij het afsluiten van de licentie is afgegeven.
//
// Nul afnames is geen factuur. Dat scheelt de klant een mail over nul euro.
//
// Handmatig draaien kan met ?dag=2026-11-02, en met ?droog=1 om te zien wat er
// zou gebeuren zonder dat er iets wordt aangemaakt.

import { serviceClient, logFout } from "../teamkracht-auth.js";
import { maakBetaling } from "../mollie.js";
import { isEersteWerkdag, periodeVan, groepeer, telOp,
         incassoOmschrijving, naMislukteIncasso, alsDatum } from "../facturen.js";

function magDraaien(req){
  const geheim = process.env.CRON_SECRET;
  if (!geheim) return true;                       // niet ingesteld: geen slot
  const kop = req.headers?.authorization || "";
  return kop === `Bearer ${geheim}`;
}

export default async function handler(req, res){
  if (!magDraaien(req)){ res.status(401).json({ error: "niet toegestaan" }); return; }

  const vandaag = req.query?.dag ? new Date(String(req.query.dag)) : new Date();
  const droog = req.query?.droog === "1";

  const db = serviceClient();
  const uit = { dag: alsDatum(vandaag), droog, facturen: [], herpogingen: [], overgeslagen: null };

  try{
    // Eerst de herpogingen: die staan los van de maandgrens en zijn vandaag aan
    // de beurt of niet.
    uit.herpogingen = await doeHerpogingen(db, vandaag, droog);

    if (!isEersteWerkdag(vandaag)){
      uit.overgeslagen = "vandaag is niet de eerste werkdag van de maand";
      res.status(200).json(uit);
      return;
    }

    const periode = periodeVan(vandaag);
    const open = await db.from("afnames")
      .select("id, gebruiker_id, organisatie_id, bureau_id, team_id, product_code, prijs_ex_btw, btw_promille, created_at")
      .eq("gefactureerd", false).is("geannuleerd_op", null)
      .lte("created_at", `${periode.tot}T23:59:59Z`);
    if (open.error) throw new Error(`afnames ophalen mislukt: ${open.error.message}`);

    for (const [sleutel, afnames] of groepeer(open.data || [])){
      const gemaakt = await maakFactuur(db, { sleutel, afnames, periode, droog });
      uit.facturen.push(gemaakt);
    }

    res.status(200).json(uit);
  }catch(e){
    await logFout("factuurrun", e.message);
    res.status(500).json({ error: "de factuurrun is vastgelopen", melding: e.message, ...uit });
  }
}

/* Eén factuur, één incasso. De afnames gaan op gefactureerd zodra de factuur
   bestaat, niet pas als de betaling is gelukt: een mislukte incasso is een
   inningsprobleem en geen reden om volgende maand opnieuw te factureren. */
async function maakFactuur(db, { sleutel, afnames, periode, droog }){
  const [soort, id] = sleutel.split(":");
  const wieBetaalt = await haalBetaler(db, soort, id, afnames[0].gebruiker_id);

  const bedragen = telOp(afnames, { btw_verlegd: wieBetaalt.btw_verlegd });
  if (!bedragen) return { sleutel, overgeslagen: "geen afnames" };

  if (droog){
    return { sleutel, droog: true, regels: bedragen.regels.length,
             bedrag: bedragen.bedrag_totaal, naar: wieBetaalt.naam };
  }

  const nummer = await db.rpc("volgend_factuurnummer");
  if (nummer.error || !nummer.data) throw new Error("geen factuurnummer gekregen");

  const factuur = await db.from("facturen").insert({
    nummer: nummer.data,
    gebruiker_id: wieBetaalt.gebruiker_id,
    organisatie_id: soort === "organisatie" ? id : null,
    bureau_id: soort === "bureau" ? id : null,
    periode_van: periode.van,
    periode_tot: periode.tot,
    ...bedragen,
    btw_nummer: wieBetaalt.btw_nummer,
    status: "open"
  }).select("id, nummer").single();
  if (factuur.error) throw new Error(`factuur opslaan mislukt: ${factuur.error.message}`);

  await db.from("afnames")
    .update({ gefactureerd: true, factuur_id: factuur.data.id })
    .in("id", afnames.map(a => a.id));

  const betaald = await incasseer(db, {
    factuur: factuur.data, bedrag: bedragen.bedrag_totaal, periode, wieBetaalt
  });

  return { sleutel, nummer: factuur.data.nummer, bedrag: bedragen.bedrag_totaal,
           regels: bedragen.regels.length, naar: wieBetaalt.naam, incasso: betaald };
}

/* Naar wie de rekening gaat, en waarop we mogen incasseren. */
async function haalBetaler(db, soort, id, gebruikerId){
  let naam = null;

  if (soort === "organisatie" && id){
    const o = await db.from("organisaties").select("naam, beheerder_user_id").eq("id", id).maybeSingle();
    gebruikerId = o.data?.beheerder_user_id || gebruikerId;
    naam = o.data?.naam || null;
  }else if (soort === "bureau" && id){
    const b = await db.from("bureaus").select("naam, beheerder_user_id").eq("id", id).maybeSingle();
    gebruikerId = b.data?.beheerder_user_id || gebruikerId;
    naam = b.data?.naam || null;
  }

  const g = await db.from("teamkracht_gebruikers")
    .select("naam, email, btw_nummer, mollie_customer_id, mollie_mandate_id")
    .eq("user_id", gebruikerId).maybeSingle();

  return {
    gebruiker_id: gebruikerId,
    naam: naam || g.data?.naam || g.data?.email || "onbekend",
    btw_nummer: g.data?.btw_nummer || null,
    // Verlegd alleen bij een buitenlands btw-nummer. Een Nederlands nummer
    // begint met NL en daar rekenen we gewoon 21 procent over.
    btw_verlegd: !!g.data?.btw_nummer && !/^NL/i.test(g.data.btw_nummer),
    mollie_customer_id: g.data?.mollie_customer_id || null,
    mollie_mandate_id: g.data?.mollie_mandate_id || null
  };
}

/* De incasso bij Mollie, op het mandaat van de eerste betaling. Geen mandaat
   betekent geen incasso: de factuur blijft open staan en de beheerder ziet hem
   in het dagsignaal. Een factuur zonder incasso is beter dan een incasso zonder
   machtiging. */
async function incasseer(db, { factuur, bedrag, periode, wieBetaalt }){
  if (!wieBetaalt.mollie_customer_id || !wieBetaalt.mollie_mandate_id){
    await logFout("factuurrun", `geen mandaat voor factuur ${factuur.nummer}`);
    return { gelukt: false, reden: "geen mandaat" };
  }

  const basis = process.env.SITE_URL || "https://scan.happly.nl";
  const geheim = process.env.MOLLIE_WEBHOOK_SECRET || "";

  try{
    const betaling = await maakBetaling({
      centen: bedrag,
      omschrijving: incassoOmschrijving(factuur.nummer, periode),
      redirectUrl: `${basis}/account`,
      webhookUrl: `${basis}/api/betaling-webhook?s=${encodeURIComponent(geheim)}`,
      metadata: { factuur_id: factuur.id, nummer: factuur.nummer },
      customerId: wieBetaalt.mollie_customer_id,
      sequenceType: "recurring"
    });

    await db.from("facturen")
      .update({ mollie_payment_id: betaling.id }).eq("id", factuur.id);
    await db.from("betalingen").insert({
      mollie_payment_id: betaling.id,
      gebruiker_id: wieBetaalt.gebruiker_id,
      factuur_id: factuur.id,
      soort: "recurring",
      bedrag_cent: bedrag,
      mollie_mandate_id: wieBetaalt.mollie_mandate_id
    });

    return { gelukt: true, mollie_payment_id: betaling.id };
  }catch(e){
    await logFout("factuurrun", `incasso mislukt voor ${factuur.nummer}: ${e.message}`);
    return { gelukt: false, reden: String(e.message).slice(0, 120) };
  }
}

/* De facturen die vandaag aan een tweede poging toe zijn. Eén herpoging na vijf
   dagen; blijft die ook mislukken, dan gaat de kraan dicht. */
async function doeHerpogingen(db, vandaag, droog){
  const q = await db.from("facturen")
    .select("id, nummer, gebruiker_id, organisatie_id, bureau_id, bedrag_totaal, periode_van, periode_tot, status")
    .eq("status", "herpoging").lte("herpoging_op", alsDatum(vandaag));
  const uit = [];

  for (const f of q.data || []){
    if (droog){ uit.push({ nummer: f.nummer, droog: true }); continue; }

    const soort = f.bureau_id ? "bureau" : f.organisatie_id ? "organisatie" : "gebruiker";
    const wieBetaalt = await haalBetaler(db, soort, f.bureau_id || f.organisatie_id, f.gebruiker_id);
    const uitkomst = await incasseer(db, {
      factuur: f, bedrag: f.bedrag_totaal,
      periode: { van: f.periode_van, tot: f.periode_tot }, wieBetaalt
    });

    if (uitkomst.gelukt){
      await db.from("facturen").update({ status: "open", herpoging_op: null }).eq("id", f.id);
    }else{
      const gevolg = naMislukteIncasso(f, vandaag);
      await db.from("facturen").update({ status: gevolg.status, herpoging_op: gevolg.herpoging_op }).eq("id", f.id);
      if (gevolg.blokkeren){
        await db.from("teamkracht_gebruikers")
          .update({ afname_geblokkeerd: true }).eq("user_id", wieBetaalt.gebruiker_id);
      }
    }
    uit.push({ nummer: f.nummer, gelukt: uitkomst.gelukt });
  }
  return uit;
}
