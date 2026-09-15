// api/leidersbeeld.js — Vercel serverless function
// Het gratis Leidersbeeld op /leidersbeeld. Slaat de invulling op, stuurt de
// resultaatmail, en geeft niets terug behalve dat het gelukt is: de scores
// staan bewust alleen in de mail en achter de knop (paragraaf 4 en K8 van
// briefings/leidersbeeld.md). Dat valideert het mailadres en maakt van elke
// invulling een lead, ook een die niet koopt.
//
// De rij wordt via de service role weggeschreven; de anon-rol komt niet bij
// deze tabel. De browser bepaalt niets: de scores worden hier uitgerekend uit
// de antwoorden.
//
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { maakInzending } from "../leidersbeeld.js";
import { resultaatMail } from "../leidersbeeld-mail.js";

const AFZENDER = "Happly <hallo@happly.nl>";

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({ error: "method" }); return; }

  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const uit = maakInzending(body);
    if (!uit.ok){ res.status(400).json({ error: "ongeldige invoer", fouten: uit.fouten }); return; }

    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // partner_id komt uit de URL en kan van alles zijn. Bestaat de gebruiker
    // niet, dan gaat de lead er zonder partner in: een typefout in een link
    // mag nooit een invulling kosten.
    let partner = uit.rij.partner_id;
    if (partner){
      const p = await db.from("teamkracht_gebruikers").select("user_id").eq("user_id", partner).maybeSingle();
      if (p.error || !p.data) partner = null;
    }

    const ingevoegd = await db.from("teamkracht_leidersbeeld")
      .insert({ ...uit.rij, partner_id: partner })
      .select("id, leider_token, index_score, leider_naam, leider_email")
      .single();
    if (ingevoegd.error) throw ingevoegd.error;
    const rij = ingevoegd.data;

    // De mail is het product van deze pagina. Lukt hij niet, dan is de lead er
    // wel en hoort de bezoeker dat te weten, want hij ziet verder niets.
    const mail = resultaatMail({ naam: rij.leider_naam, index: rij.index_score, token: rij.leider_token });
    const resend = new Resend(process.env.RESEND_API_KEY);
    const verstuurd = await resend.emails.send({
      from: AFZENDER, to: rij.leider_email, subject: mail.subject, html: mail.html
    });
    if (verstuurd && verstuurd.error){
      res.status(502).json({ error: "mail mislukt" });
      return;
    }

    await db.from("teamkracht_leidersbeeld")
      .update({ mail_verzonden_op: new Date().toISOString() })
      .eq("id", rij.id);

    res.status(200).json({ ok: true });
  }catch(e){
    res.status(500).json({ error: "opslaan mislukt" });
  }
}
