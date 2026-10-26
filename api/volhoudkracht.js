// api/volhoudkracht.js — Vercel serverless function
// De gratis Volhoudkracht Scan op /volhoudkracht. Slaat de invulling op,
// rekent de score hier uit (nooit in de browser), stuurt de resultaatmail en
// geeft niets terug behalve dat het gelukt is: de uitslag staat in de mail en
// achter de knop. Zelfde opzet als het Leidersbeeld.
//
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { maakInzending } from "../volhoudkracht-items.js";
import { resultaatMail } from "../volhoudkracht-mail.js";

const AFZENDER = "Happly <hallo@happly.nl>";

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({ error: "method" }); return; }

  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const uit = maakInzending(body);
    if (!uit.ok){ res.status(400).json({ error: "ongeldige invoer", fouten: uit.fouten }); return; }

    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const ingevoegd = await db.from("volhoudkracht")
      .insert(uit.rij)
      .select("id, token, score, band, zwakste, woord, programma_naam, naam, email")
      .single();
    if (ingevoegd.error) throw ingevoegd.error;
    const rij = ingevoegd.data;

    // Elke invulling is een lead. De opvolging begint op nieuw; de rij is de
    // geschiedenis, nooit overschrijven.
    await db.from("opvolging").insert({ bron: "volhoudkracht", volhoudkracht_id: rij.id, opvolgstatus: "nieuw" });

    const mail = resultaatMail(rij);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const verstuurd = await resend.emails.send({ from: AFZENDER, to: rij.email, subject: mail.subject, html: mail.html });
    if (verstuurd && verstuurd.error){ res.status(502).json({ error: "mail mislukt" }); return; }

    await db.from("volhoudkracht").update({ mail_verzonden_op: new Date().toISOString() }).eq("id", rij.id);

    res.status(200).json({ ok: true });
  }catch(e){
    res.status(500).json({ error: "opslaan mislukt" });
  }
}
