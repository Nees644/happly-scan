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
import { verwerkMollieBetaling } from "../betaling-verwerken.js";

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
    const { uitkomst } = await verwerkMollieBetaling(db, mollieId);
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
