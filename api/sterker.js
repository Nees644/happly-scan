// api/sterker.js, Vercel serverless function
// Sterker op je werk in één functie: aanmelden, betaalknop en de melding van
// Mollie. Eén functie in plaats van drie houdt het aantal functies van het
// project laag. De oude adressen blijven werken via vercel.json:
//   /api/sterker-aanmelden  ->  /api/sterker?r=aanmelden
//   /api/sterker-betaal     ->  /api/sterker?r=betaal
//   /api/sterker-webhook    ->  /api/sterker?r=webhook

import { serviceClient, logFout } from "../teamkracht-auth.js";
import { haalBetaling } from "../mollie.js";
import { PRODUCTEN, meldAan, zoekOpToken, startBetaling, verwerkMollieId } from "../sterker.js";

// Onderdeel aanmelden:
// GET: de drie programma's met hun prijs uit de tabel producten, voor het
// formulier. POST: aanmelden; maakt de factuur en geeft de betaallink terug.


async function aanmelden(req, res){
  const db = serviceClient();
  if (req.method === "GET"){
    const r = await db.from("producten").select("code, naam, prijs_ex_btw, bevat, voorwaarde")
      .in("code", Object.values(PRODUCTEN)).eq("actief", true);
    const uit = Object.entries(PRODUCTEN).map(([soort, code]) => {
      const p = (r.data || []).find(x => x.code === code);
      return p ? { soort, naam: p.naam, prijs_ex_btw: p.prijs_ex_btw, bevat: p.bevat, voorwaarde: p.voorwaarde } : null;
    }).filter(Boolean);
    res.setHeader("Cache-Control", "s-maxage=300");
    res.status(200).json({ producten: uit });
    return;
  }
  if (req.method !== "POST"){ res.status(405).json({ error: "methode" }); return; }
  const invoer = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  try{
    const uit = await meldAan(db, req, invoer);
    res.status(200).json(uit);
  }catch(e){
    if (e.status && e.status < 500){ res.status(e.status).json({ error: e.message }); return; }
    await logFout("sterker-aanmelden", e.message);
    res.status(500).json({ error: "Het aanmelden lukte niet. Probeer het zo nog eens, of mail hallo@happly.nl." });
  }
}

// Onderdeel betaal:
// De betaalknop in de factuurmail. Maakt op het moment van klikken een
// betaling bij Mollie en stuurt door naar de betaalpagina. Met &stand=1 geeft
// hij de stand terug voor de terugkeerpagina, en vraagt hij die zo nodig zelf
// bij Mollie op.


async function betaal(req, res){
  const db = serviceClient();
  const a = await zoekOpToken(db, req.query?.t);
  if (!a){ res.status(404).send("Deze betaallink kennen we niet. Mail hallo@happly.nl."); return; }

  if (req.query?.stand){
    let status = a.status;
    if (status !== "betaald" && a.mollie_payment_id){
      try{
        await verwerkMollieId(db, a.mollie_payment_id, haalBetaling);
        status = (await zoekOpToken(db, a.token))?.status || status;
      }catch(e){ /* de melding van Mollie volgt nog */ }
    }
    res.status(200).json({ status, organisatie: a.organisatie });
    return;
  }

  if (a.status === "betaald"){ res.redirect(302, `/sterker-betaald?t=${encodeURIComponent(a.token)}`); return; }
  try{
    const { betaalpagina } = await startBetaling(db, req, a);
    if (!betaalpagina) throw new Error("geen betaalpagina van Mollie");
    res.redirect(303, betaalpagina);
  }catch(e){
    await logFout("sterker-betaal", e.message);
    res.status(502).send("Betalen lukt op dit moment niet. Probeer het zo nog eens, of mail hallo@happly.nl.");
  }
}

// Onderdeel webhook:
// Mollie meldt hier een betaling van Sterker op je werk. Zelfde regels als
// api/betaling-webhook.js: de melding is een seintje, wij halen de stand zelf
// op, en we antwoorden altijd 200 zodra de melding is vastgelegd.


async function webhook(req, res){
  if (req.method !== "POST"){ res.status(405).send("method"); return; }
  const geheim = process.env.MOLLIE_WEBHOOK_SECRET;
  if (geheim && req.query?.s !== geheim){ res.status(401).send("nee"); return; }

  const body = typeof req.body === "string"
    ? Object.fromEntries(new URLSearchParams(req.body))
    : (req.body || {});
  const mollieId = String(body.id || "");
  if (!/^tr_[A-Za-z0-9]+$/.test(mollieId)){ res.status(400).send("geen geldig id"); return; }

  const db = serviceClient();
  const melding = await db.from("mollie_meldingen").insert({ mollie_id: mollieId }).select("id").single();
  try{
    const uitkomst = await verwerkMollieId(db, mollieId, haalBetaling);
    await db.from("mollie_meldingen").update({ verwerkt_op: new Date().toISOString(), uitkomst: `sterker: ${uitkomst}` }).eq("id", melding.data?.id);
    res.status(200).send("ok");
  }catch(e){
    await db.from("mollie_meldingen").update({ uitkomst: `sterker mislukt: ${String(e.message).slice(0, 120)}` }).eq("id", melding.data?.id);
    await logFout("sterker-webhook", e.message);
    res.status(200).send("ok");
  }
}

export default async function handler(req, res){
  const r = req.query?.r;
  if (r === "aanmelden") return aanmelden(req, res);
  if (r === "betaal") return betaal(req, res);
  if (r === "webhook") return webhook(req, res);
  res.status(404).send("onbekend");
}
