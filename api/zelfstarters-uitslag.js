// api/zelfstarters-uitslag.js, Vercel serverless function
// De uitslagpagina van een registratie haalt hier zijn gegevens op en legt
// hier het als-dan plan vast.
//
// GET  /api/zelfstarters-uitslag?z=<registratie_id>
//      Gratis: score, sterkste kant, ruimte, nummer. Geverifieerd: ook de
//      duiding, het plan en de momenten. Nooit meer dan de status toestaat.
// POST { z, plan: [{ dimensie, moment, actie }, ...] }
//      Alleen voor geverifieerden.
//
// Komt iemand terug van Mollie voordat de melding binnen is, dan halen we de
// stand zelf op; hij hoort niet te wachten op een seintje dat ook kan
// uitblijven.

import { serviceClient } from "../teamkracht-auth.js";
import { verwerkZelfstarterBetaling, legPlanVast } from "../zelfstarters-verwerken.js";
import { uitslagVoor, planOpschonen } from "../zelfstarters-uitslag.js";
import { prijzen } from "./zelfstarters-start.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function rijVan(db, id){
  const q = await db.from("zelfstarters").select("*").eq("id", id).maybeSingle();
  return q.data || null;
}

export default async function handler(req, res){
  const body = req.method === "POST" ? (typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {})) : {};
  const id = String(req.query?.z || body.z || "");
  if (!UUID.test(id)){ res.status(400).json({ error: "onbekende registratie" }); return; }
  const db = serviceClient();
  let rij = await rijVan(db, id);
  if (!rij){ res.status(404).json({ error: "onbekende registratie" }); return; }
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "POST"){
    if (rij.status !== "betaald"){ res.status(403).json({ error: "Het plan hoort bij een geverifieerde registratie." }); return; }
    const plan = planOpschonen(body.plan);
    if (!plan){ res.status(400).json({ error: "Kies per punt een moment en zeg wat je dan doet." }); return; }
    const na = await legPlanVast(db, rij, plan);
    res.status(200).json({ plan: na.plan });
    return;
  }
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }

  if (rij.status !== "betaald" && rij.mollie_payment_id && rij.betaling_status === "open"){
    try{ await verwerkZelfstarterBetaling(db, rij.mollie_payment_id); }catch(e){ /* de cron pakt het op */ }
    rij = await rijVan(db, id) || rij;
  }

  let scan = null;
  if (rij.scan_id){
    const s = await db.from("index_scan_results").select("id, index_score, zien, sturen, doen, duiding").eq("id", rij.scan_id).maybeSingle();
    scan = s.data || null;
  }
  const uit = uitslagVoor({ rij, scan });
  if (!uit.geverifieerd) uit.prijzen = await prijzen(db);
  res.status(200).json(uit);
}
