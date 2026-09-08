// api/betaling-webhook.js — Vercel serverless function
// Mollie meldt hier dat er iets met een betaling is gebeurd. In die melding
// staat alleen een id, geen bedrag en geen status; die halen we zelf op. Dat is
// met opzet zo bij Mollie en het is precies goed: de melding is een seintje,
// nooit de waarheid.
//
// Deze route is publiek, want Mollie logt nergens in. Het geheim in de URL houdt
// vreemden weg. Antwoordt altijd met 200 zodra de melding is opgeslagen: een
// foutcode laat Mollie het uren blijven proberen, en dat helpt niemand als de
// fout aan onze kant zit.

import { serviceClient, logFout } from "../teamkracht-auth.js";
import { haalBetaling } from "../mollie.js";

/* Wat er moet gebeuren zodra een betaling binnen is. Alleen dingen die uit de
   bestelling volgen; de bestelling zelf is de bron. */
async function verwerkBetaling(db, bestelling){
  const code = bestelling.product_code;

  // Een losse Teamfoto of hermeting wordt pas verbruikt als de kaart wordt
  // gemaakt. Hier hoeft niets te gebeuren; het recht staat in de bestelling.
  if (code === "TF" || code === "HM") return "recht op een kaart vastgelegd";

  // De Lezer-module: alle hoofdstukken open. Dat leiden we af uit een betaalde
  // bestelling, dus er is geen vlag om te zetten. Wel de rol, zodat iemand die
  // alleen de module kocht ook echt binnenkomt.
  if (code === "LEZ-1" || code === "LEZ-2"){
    await db.from("teamkracht_gebruikers")
      .update({ rol: "lezer" })
      .eq("user_id", bestelling.gebruiker_id)
      .eq("rol", "lezer");   // een coach of beheerder houdt zijn eigen rol
    return "module opengezet";
  }

  return "geen actie";
}

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).send("method"); return; }

  const geheim = process.env.MOLLIE_WEBHOOK_SECRET;
  if (geheim && req.query?.s !== geheim){ res.status(401).send("nee"); return; }

  const body = typeof req.body === "string"
    ? Object.fromEntries(new URLSearchParams(req.body))
    : (req.body || {});
  const mollieId = String(body.id || "");
  if (!/^tr_[A-Za-z0-9]+$/.test(mollieId)){ res.status(400).send("geen geldig id"); return; }

  const db = serviceClient();

  // Eerst vastleggen dat de melding er was. Ook als de rest hierna misgaat,
  // weten we dan dat Mollie iets heeft gestuurd.
  const melding = await db.from("mollie_meldingen")
    .insert({ mollie_id: mollieId }).select("id").single();

  try{
    const betaling = await haalBetaling(mollieId);
    const bestellingId = betaling?.metadata?.bestelling_id || null;

    let q = db.from("bestellingen").select("*");
    q = bestellingId ? q.eq("id", bestellingId) : q.eq("mollie_payment_id", mollieId);
    const b = await q.single();
    if (b.error || !b.data){
      await db.from("mollie_meldingen")
        .update({ verwerkt_op: new Date().toISOString(), uitkomst: "geen bestelling gevonden" })
        .eq("id", melding.data?.id);
      res.status(200).send("ok");
      return;
    }
    const bestelling = b.data;

    // Al verwerkt? Dan niets doen. Mollie bezorgt een melding gerust twee keer.
    if (bestelling.status === "betaald" && betaling.status === "paid"){
      await db.from("mollie_meldingen")
        .update({ verwerkt_op: new Date().toISOString(), uitkomst: "al verwerkt" })
        .eq("id", melding.data?.id);
      res.status(200).send("ok");
      return;
    }

    const nieuw = betaling.status === "paid"     ? "betaald"
                : betaling.status === "expired"  ? "verlopen"
                : betaling.status === "canceled" ? "mislukt"
                : betaling.status === "failed"   ? "mislukt"
                : null;

    let uitkomst = `status ${betaling.status}`;
    if (nieuw){
      await db.from("bestellingen").update({
        status: nieuw,
        mollie_payment_id: mollieId,
        betaald_op: nieuw === "betaald" ? new Date().toISOString() : null
      }).eq("id", bestelling.id);

      if (nieuw === "betaald"){
        uitkomst = await verwerkBetaling(db, bestelling);
      } else {
        uitkomst = `bestelling op ${nieuw}`;
      }
    }

    await db.from("mollie_meldingen")
      .update({ verwerkt_op: new Date().toISOString(), uitkomst })
      .eq("id", melding.data?.id);

    res.status(200).send("ok");
  }catch(e){
    // Niet met een foutcode antwoorden: dan blijft Mollie het uren proberen
    // terwijl de fout aan onze kant zit. De melding staat vast en de dagcron
    // pikt onverwerkte meldingen op.
    await db.from("mollie_meldingen")
      .update({ uitkomst: `mislukt: ${String(e.message).slice(0, 140)}` })
      .eq("id", melding.data?.id);
    await logFout("betaling-webhook", e.message);
    res.status(200).send("ok");
  }
}
