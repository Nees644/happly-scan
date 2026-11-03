// api/zelfstarters-status.js, Vercel serverless function
// De pagina waar de klant na Mollie op terugkomt vraagt hier de stand op. Is
// de melding van Mollie nog niet binnen, dan halen we de stand zelf op: de
// klant hoort niet te wachten op een seintje dat ook kan uitblijven.
//
// GET /api/zelfstarters-status?z=<registratie_id>

import { serviceClient } from "../teamkracht-auth.js";
import { verwerkZelfstarterBetaling } from "../zelfstarters-verwerken.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }
  const id = String(req.query?.z || "");
  if (!UUID.test(id)){ res.status(400).json({ error: "onbekende registratie" }); return; }
  const db = serviceClient();
  let q = await db.from("zelfstarters").select("id, status, type, naam, mollie_payment_id, nummer, eerste_meting_op, betaling_status").eq("id", id).maybeSingle();
  if (!q.data){ res.status(404).json({ error: "onbekende registratie" }); return; }
  if (q.data.status === "open" && q.data.mollie_payment_id){
    try{ await verwerkZelfstarterBetaling(db, q.data.mollie_payment_id); }catch(e){ /* de cron pakt het op */ }
    q = await db.from("zelfstarters").select("id, status, type, naam, mollie_payment_id, nummer, eerste_meting_op, betaling_status").eq("id", id).maybeSingle();
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    status: q.data.status, type: q.data.type, voornaam: String(q.data.naam || "").split(/\s+/)[0],
    nummer: q.data.nummer || null,
    betaling_open: !!q.data.mollie_payment_id && q.data.betaling_status !== "betaald" && q.data.status !== "betaald",
    gemeten: !!q.data.eerste_meting_op, scan_url: `/scan?zs=${id}`
  });
}
