// api/badge.js — Vercel serverless function
// De badge bij een certificaat, als svg.
//
// GET /api/badge?code=<verificatiecode>
//
// Openbaar, net als de verificatiepagina: een badge die alleen met een inlog
// te zien is, kan niemand op LinkedIn zetten. Er staat niets op wat niet ook
// op de openbare pagina staat.
//
// De png maakt de browser uit deze svg; zie badge.html. Zo hoeft er op de
// server geen tekenprogramma te draaien voor een plaatje dat al vector is.

import { createClient } from "@supabase/supabase-js";
import { bouwBadgeSvg } from "../badge.js";
import { registerRij } from "../register.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }

  const code = String(req.query?.code || "");
  if (!UUID.test(code)){ res.status(404).json({ error: "onbekende code" }); return; }

  try{
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const c = await db.from("certificaten")
      .select("gebruiker_id, naam_op_certificaat, niveau, uitgegeven_op, status, verificatiecode")
      .eq("verificatiecode", code).maybeSingle();
    if (c.error || !c.data){ res.status(404).json({ error: "onbekende code" }); return; }

    const g = await db.from("teamkracht_gebruikers")
      .select("naam, register_toestemming, register_slug, licentie_actief, licentie_tot")
      .eq("user_id", c.data.gebruiker_id).maybeSingle();

    // Dezelfde regel als op de pagina: zonder toestemming geen openbare badge.
    const rij = registerRij({ certificaat: c.data, gebruiker: g.data || {} });
    if (!rij){ res.status(404).json({ error: "onbekende code" }); return; }

    const svg = bouwBadgeSvg({
      naam: rij.naam, niveau: rij.niveau, datum: rij.sinds, verificatiecode: rij.verificatiecode
    });
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).send(svg);
  }catch(e){
    res.status(500).json({ error: "badge maken mislukt" });
  }
}
