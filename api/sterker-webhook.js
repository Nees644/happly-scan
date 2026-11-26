// api/sterker-webhook.js, Vercel serverless function
// Mollie meldt hier een betaling van Sterker op je werk. Zelfde regels als
// api/betaling-webhook.js: de melding is een seintje, wij halen de stand zelf
// op, en we antwoorden altijd 200 zodra de melding is vastgelegd.

import { serviceClient, logFout } from "../teamkracht-auth.js";
import { haalBetaling } from "../mollie.js";
import { verwerkMollieId } from "../sterker.js";

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
