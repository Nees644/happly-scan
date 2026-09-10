// api/module-voortgang.js — Vercel serverless function
// De voortgang door de Lezer-module. GET geeft terug wat iemand mag lezen en
// wat hij heeft afgerond; POST markeert een hoofdstuk als gelezen.
//
// Toegang tot hoofdstuk 3 tot en met 6 staat in lezer_module_toegang op de
// gebruiker. Dat was eerder een afleiding uit een betaalde bestelling, maar er
// zijn sinds 10-09-2026 drie wegen naar hetzelfde recht (LEZ-1, LEZ-10, en het
// beheerderschap van een organisatie) en dan hoort er een veld te zijn.
//
// Toegang is niet hetzelfde als een certificaat. niveau = 'lezer' komt pas na
// een geslaagde toets en wordt hier nergens gezet.

import { eisGebruiker, serviceClient } from "../teamkracht-auth.js";
import { isGratis } from "../module-inhoud.js";

async function heeftModule(db, userId){
  const q = await db.from("teamkracht_gebruikers")
    .select("lezer_module_toegang").eq("user_id", userId).maybeSingle();
  return !!q.data?.lezer_module_toegang;
}

export default async function handler(req, res){
  const gebruiker = await eisGebruiker(req, res);
  if (!gebruiker) return;
  const db = serviceClient();

  if (req.method === "GET"){
    const [v, gekocht] = await Promise.all([
      db.from("module_voortgang").select("hoofdstuk, afgerond_op").eq("gebruiker_id", gebruiker.user_id),
      heeftModule(db, gebruiker.user_id)
    ]);
    const afgerond = (v.data || []).map(r => r.hoofdstuk);
    res.status(200).json({
      afgerond,
      module_toegang: gekocht,
      leesdrempel_gehaald: [1, 2].every(h => afgerond.includes(h))
    });
    return;
  }

  if (req.method === "POST"){
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const hoofdstuk = Number(body.hoofdstuk);
    if (!Number.isInteger(hoofdstuk) || hoofdstuk < 1 || hoofdstuk > 6){
      res.status(400).json({ error: "ongeldig hoofdstuk" }); return;
    }
    if (!isGratis(hoofdstuk) && !(await heeftModule(db, gebruiker.user_id))){
      res.status(402).json({ error: "Dit hoofdstuk hoort bij de Lezer-module.", betalen: "LEZ-1" });
      return;
    }

    // Twee keer hetzelfde hoofdstuk afronden verandert niets; de eerste keer
    // telt, want dat is het moment dat iemand het las.
    await db.from("module_voortgang")
      .upsert({ gebruiker_id: gebruiker.user_id, hoofdstuk }, { onConflict: "gebruiker_id,hoofdstuk", ignoreDuplicates: true });

    const v = await db.from("module_voortgang").select("hoofdstuk").eq("gebruiker_id", gebruiker.user_id);
    const afgerond = (v.data || []).map(r => r.hoofdstuk);
    res.status(200).json({ afgerond, leesdrempel_gehaald: [1, 2].every(h => afgerond.includes(h)) });
    return;
  }

  res.status(405).json({ error: "method" });
}
