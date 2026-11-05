// api/zelfstarters-partners.js, Vercel serverless function
// Beheer van partners en hun kortingscodes. Beschermd met ZS_BEHEER_SLEUTEL.
//
// GET  ?s=<sleutel>                      alle partners, met aantal betalingen via hun code
// POST { s, naam, code?, korting_pct?, soort?, email? }   nieuwe partner; code wordt gemaakt als hij ontbreekt
// POST { s, id, actief }                 partner aan of uit

import { serviceClient, logFout } from "../teamkracht-auth.js";
import { codeOpschonen, codeVoorNaam } from "../zelfstarters-korting.js";

function toegang(req, body){
  const sleutels = [process.env.ZS_BEHEER_SLEUTEL, process.env.CRON_SECRET].filter(Boolean);
  const s = String(body?.s || req.query?.s || "");
  return sleutels.length > 0 && sleutels.includes(s);
}

export default async function handler(req, res){
  res.setHeader("Cache-Control", "no-store");
  const body = req.method === "POST" ? (typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {})) : {};
  if (!toegang(req, body)){ res.status(401).json({ error: "unauthorized" }); return; }
  const db = serviceClient();

  if (req.method === "GET"){
    const p = await db.from("zelfstarters_partners").select("*").order("aangemaakt_op", { ascending: false });
    const r = await db.from("zelfstarters").select("partner_id, status, betaling_status, korting_cent, bedrag_cent").not("partner_id", "is", null);
    const telling = {};
    const leeg = () => ({ gestart: 0, betaald: 0, gratis: 0, korting_cent: 0, omzet_cent: 0 });
    for (const rij of (r.data || [])){
      const t = telling[rij.partner_id] || (telling[rij.partner_id] = leeg());
      t.gestart++;
      if (rij.status !== "betaald") continue;
      if (rij.betaling_status === "gratis"){ t.gratis++; continue; }
      t.betaald++; t.korting_cent += rij.korting_cent || 0; t.omzet_cent += rij.bedrag_cent || 0;
    }
    res.status(200).json({ partners: (p.data || []).map(x => ({ ...x, ...(telling[x.id] || leeg()) })) });
    return;
  }
  if (req.method !== "POST"){ res.status(405).json({ error: "method" }); return; }

  if (body.id){
    const upd = await db.from("zelfstarters_partners").update({ actief: body.actief !== false }).eq("id", body.id).select("*").maybeSingle();
    res.status(upd.data ? 200 : 404).json(upd.data ? { partner: upd.data } : { error: "onbekende partner" });
    return;
  }

  const naam = String(body.naam || "").trim().slice(0, 120);
  if (naam.length < 2){ res.status(400).json({ error: "Vul de naam van de partner in." }); return; }
  const pct = Math.max(0, Math.min(100, parseInt(body.korting_pct, 10) || 25));
  const soort = body.soort === "founding" ? "founding" : "open";
  const email = String(body.email || "").trim().toLowerCase() || null;
  let code = codeOpschonen(body.code);
  if (body.code && !code){ res.status(400).json({ error: "Een code bestaat uit letters, cijfers en streepjes, 3 tot 24 tekens." }); return; }
  for (let poging = 0; poging < 5; poging++){
    const kandidaat = code || codeVoorNaam(naam);
    const ins = await db.from("zelfstarters_partners").insert({ naam, code: kandidaat, korting_pct: pct, soort, email }).select("*").maybeSingle();
    if (ins.data){ res.status(200).json({ partner: ins.data }); return; }
    if (code){ res.status(409).json({ error: "Deze code bestaat al." }); return; }
  }
  await logFout("zelfstarters-partners", "geen vrije code gevonden");
  res.status(500).json({ error: "geen vrije code gevonden" });
}
