// api/zelfstarters-verifieer.js, Vercel serverless function
// De betaalde stap van het Zelfstartregister: een geregistreerde maakt zijn
// registratie geverifieerd. Kan alleen na een meting; de betaling hangt aan
// de bestaande rij en de klant komt terug op zijn uitslagpagina.
//
// POST { z: <registratie_id>, type: 'standaard' | 'plus', code?: <kortingscode van de intermediair> }
// Antwoord: { betaalpagina }

import { serviceClient, logFout } from "../teamkracht-auth.js";
import { startBetaling, partnerBijCode } from "./zelfstarters-start.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({ error: "method" }); return; }
  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const id = String(body.z || "");
  const type = body.type === "plus" ? "plus" : "standaard";
  if (!UUID.test(id)){ res.status(400).json({ error: "onbekende registratie" }); return; }

  const db = serviceClient();
  const q = await db.from("zelfstarters").select("*").eq("id", id).maybeSingle();
  if (!q.data){ res.status(404).json({ error: "onbekende registratie" }); return; }
  const rij = q.data;
  if (rij.status === "betaald"){ res.status(409).json({ error: "Je registratie is al geverifieerd." }); return; }
  if (!rij.eerste_meting_op){ res.status(409).json({ error: "Doe eerst je meting." }); return; }

  try{
    const partner = await partnerBijCode(db, body.code);
    const b = await startBetaling({ db, req, rij, type, terug: "/zelfstarters-uitslag", partner });
    res.status(200).json(b.gratis ? { ...b, betaalpagina: b.terug } : b);
  }catch(e){
    await logFout("zelfstarters-verifieer", e.message);
    res.status(e.status || 502).json({ error: e.status ? e.message : "de betaling kon niet worden gestart" });
  }
}
