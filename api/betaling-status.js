// api/betaling-status.js — Vercel serverless function
// De stand van een bestelling, voor de pagina waar de klant na het betalen op
// terugkomt. Mollie stuurt de klant vaak terug voordat de melding binnen is,
// dus die pagina vraagt het een paar keer opnieuw.

import { eisGebruiker, serviceClient } from "../teamkracht-auth.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }
  const gebruiker = await eisGebruiker(req, res);
  if (!gebruiker) return;

  const id = String(req.query?.b || "");
  if (!UUID.test(id)){ res.status(400).json({ error: "ongeldig bestelling-id" }); return; }

  const db = serviceClient();
  const q = await db.from("bestellingen")
    .select("id, product_code, bedrag_cent, status, betaald_op, team_id, gebruiker_id")
    .eq("id", id).single();
  if (q.error || !q.data){ res.status(404).json({ error: "onbekende bestelling" }); return; }
  if (q.data.gebruiker_id !== gebruiker.user_id && gebruiker.rol !== "beheerder"){
    res.status(403).json({ error: "geen toegang" }); return;
  }

  const p = await db.from("producten").select("naam").eq("code", q.data.product_code).single();
  const { gebruiker_id, ...rest } = q.data;
  res.status(200).json({ ...rest, product: p.data?.naam || q.data.product_code });
}
