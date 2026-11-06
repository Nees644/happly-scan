// api/zelfstarters-dag.js, Vercel serverless function
// De dagkeuze voor de Zelfstarters Dag, en de aanmelding voor de Zelfstarters Alumni Dag.
// De registratie-id in de link is de sleutel, net als bij de scanlink: wie de
// mail heeft, mag kiezen.
//
// GET  /api/zelfstarters-dag?z=<id>                    dagen, plekken, huidige keuzes
// POST /api/zelfstarters-dag {z, datum}                de Dag kiezen of wijzigen (type plus)
// POST /api/zelfstarters-dag {z, terugkomdag: datum}   aanmelden voor de Alumni Dag (iedere geverifieerde)
//
// Het aantal plekken wordt pas bij het opslaan nog eens geteld. Kiezen er twee
// mensen tegelijk de laatste plek, dan kan één dag één plek te veel hebben;
// bij vijftien plekken op een dag in een zaal is dat aanvaardbaar.

import { serviceClient, logFout } from "../teamkracht-auth.js";
import { DAGEN, TERUGKOMDAGEN, beschikbaarheid, dagBestaat, terugkomdagBestaat, terugkomdagen } from "../zelfstarters-dagen.js";
import { dagMail, AFZENDER, ANTWOORD } from "../zelfstarters-mail.js";
import { Resend } from "resend";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function telling(db, kolom = "plus_class_op"){
  const q = await db.from("zelfstarters").select(kolom)
    .eq("status", "betaald").not(kolom, "is", null);
  const t = {};
  for (const r of (q.data || [])) t[r[kolom]] = (t[r[kolom]] || 0) + 1;
  return t;
}

export default async function handler(req, res){
  res.setHeader("Cache-Control", "no-store");
  const db = serviceClient();
  const body = req.method === "POST"
    ? (typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}))
    : {};
  const id = String(req.query?.z || body.z || "");
  if (!UUID.test(id)){ res.status(400).json({ error: "onbekende registratie" }); return; }

  const q = await db.from("zelfstarters").select("id, naam, email, type, status, plus_class_op, terugkomdag_op").eq("id", id).maybeSingle();
  if (!q.data){ res.status(404).json({ error: "onbekende registratie" }); return; }
  const rij = q.data;
  if (rij.status !== "betaald"){ res.status(400).json({ error: "De betaling is nog niet binnen." }); return; }

  if (req.method === "GET"){
    res.status(200).json({
      voornaam: String(rij.naam || "").split(/\s+/)[0], type: rij.type,
      keuze: rij.plus_class_op, dagen: rij.type === "plus" ? beschikbaarheid(await telling(db)) : [],
      terugkomdag: rij.terugkomdag_op, terugkomdagen: terugkomdagen(await telling(db, "terugkomdag_op"))
    });
    return;
  }
  if (req.method !== "POST"){ res.status(405).json({ error: "method" }); return; }

  if (body.terugkomdag){
    const datum = String(body.terugkomdag);
    if (!terugkomdagBestaat(datum)){ res.status(400).json({ error: "Deze Alumni Dag bestaat niet." }); return; }
    const upd = await db.from("zelfstarters").update({ terugkomdag_op: datum }).eq("id", id);
    if (upd.error){ await logFout("zelfstarters-dag", upd.error.message); res.status(500).json({ error: "opslaan mislukt" }); return; }
    res.status(200).json({ terugkomdag: datum });
    return;
  }

  if (rij.type !== "plus"){ res.status(400).json({ error: "Deze registratie is zonder de Zelfstarters Dag." }); return; }
  const datum = String(body.datum || "");
  if (!dagBestaat(datum)){ res.status(400).json({ error: "Deze dag bestaat niet." }); return; }
  if (rij.plus_class_op === datum){ res.status(200).json({ keuze: datum }); return; }

  const dag = beschikbaarheid(await telling(db)).find(d => d.datum === datum);
  if (!dag || !dag.open){ res.status(409).json({ error: "Deze dag is vol. Kies een andere." }); return; }

  const upd = await db.from("zelfstarters").update({ plus_class_op: datum }).eq("id", id);
  if (upd.error){ await logFout("zelfstarters-dag", upd.error.message); res.status(500).json({ error: "opslaan mislukt" }); return; }

  try{
    if (process.env.RESEND_API_KEY){
      const m = dagMail({ naam: rij.naam, dag: DAGEN.find(d => d.datum === datum), registratieId: id });
      await new Resend(process.env.RESEND_API_KEY).emails.send({ from: AFZENDER, to: rij.email, replyTo: ANTWOORD, subject: m.subject, html: m.html });
    }
  }catch(e){ await logFout("zelfstarters-dag", `mail: ${e.message}`); }

  res.status(200).json({ keuze: datum });
}
