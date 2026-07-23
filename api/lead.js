// api/lead.js — Vercel serverless function
// Leadcapture na de uitslag: koppelt e-mail (verplicht), naam en bedrijf (optioneel)
// aan de meting, en stuurt de profielmail via Resend vanaf hallo@happly.nl.
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function niveau(s){
  if (s < 30) return "Laag";
  if (s < 50) return "Beperkt";
  if (s < 70) return "Redelijk";
  if (s < 90) return "Sterk";
  return "Zeer sterk";
}

function mailHtml({ index, zien, sturen, doen, name }){
  const row = (n,s) => `<tr>
    <td style="padding:8px 0;font-size:14px;color:#1A0B2E;font-weight:600">${n}</td>
    <td style="padding:8px 0;font-size:14px;color:#1A0B2E;text-align:right">${s}</td>
    <td style="padding:8px 0 8px 16px;font-size:13px;color:#6A5A78;text-align:right">${niveau(s)}</td>
  </tr>`;
  const hi = name ? `Hallo ${name},` : "Hallo,";
  return `<div style="font-family:Georgia,'Times New Roman',serif;background:#FBEFF5;padding:32px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
      <div style="background:#1A0B2E;padding:22px 30px;color:#fff;font-size:12px;letter-spacing:.12em;text-transform:uppercase">Zelfkracht Index</div>
      <div style="padding:30px">
        <p style="font-size:15px;color:#3A2E46;line-height:1.6;margin:0 0 18px">${hi}</p>
        <p style="font-size:15px;color:#3A2E46;line-height:1.6;margin:0 0 24px">Zelfkracht heeft nu een eigen getal. Dit is jouw meting.</p>
        <div style="text-align:center;margin:8px 0 24px">
          <div style="font-size:64px;color:#1A0B2E;line-height:1">${index}</div>
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6A5A78;margin-top:6px">Zelfkracht Index</div>
        </div>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #E7DCEC">
          ${row("Zien", zien)}${row("Sturen", sturen)}${row("Doen", doen)}
        </table>
        <p style="font-size:14px;color:#3A2E46;line-height:1.65;margin:24px 0 8px;font-style:italic">Over een jaar meet je opnieuw. Dan is dit getal geen oordeel meer, maar je nulpunt.</p>
        <p style="font-size:13px;color:#6A5A78;line-height:1.6;margin:20px 0 0">De Index wijst de plek aan. De Zelfkracht Sprint onderzoekt wat en hoe je kunt veranderen. <a href="https://happly.nl" style="color:#D6026F">Meer over de Sprint</a>.</p>
      </div>
    </div>
  </div>`;
}

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({error:"method"}); return; }
  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { id, email, name, company, index, zien, sturen, doen } = body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      res.status(400).json({error:"ongeldig e-mailadres"}); return;
    }

    // 1. Koppel de lead aan de meting (of maak een minimale rij als de opslag eerder faalde).
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (id){
      await db.from("index_scan_results")
        .update({ email, name: name || null, company: company || null })
        .eq("id", id);
    } else {
      await db.from("index_scan_results").insert({
        index_score: index, zien, sturen, doen,
        email, name: name || null, company: company || null
      });
    }

    // 2. Stuur de profielmail (best effort; mag de flow niet blokkeren).
    try{
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Happly <hallo@happly.nl>",
        to: email,
        subject: "Jouw Zelfkracht Index",
        html: mailHtml({ index, zien, sturen, doen, name })
      });
    }catch(mailErr){ /* stil */ }

    res.status(200).json({ ok: true });
  }catch(e){
    res.status(500).json({ error: "lead mislukt" });
  }
}
