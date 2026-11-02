// api/zelfstarters-badge.js, Vercel serverless function
// De Zelfstarter-badge als svg, openbaar via de verificatiecode.
// GET /api/zelfstarters-badge?code=<verificatiecode>

import { serviceClient } from "../teamkracht-auth.js";
import { bouwZelfstarterBadgeSvg, geldig } from "../zelfstarters-badge.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }
  const code = String(req.query?.code || "");
  if (!UUID.test(code)){ res.status(404).json({ error: "onbekende code" }); return; }
  const db = serviceClient();
  const q = await db.from("zelfstarters").select("status, nummer, meetjaren, laatste_meting_op, plus_class_gevolgd_op")
    .eq("verificatiecode", code).maybeSingle();
  if (!q.data || q.data.status !== "betaald" || !q.data.nummer){ res.status(404).json({ error: "onbekende code" }); return; }
  const svg = bouwZelfstarterBadgeSvg({
    plus: !!q.data.plus_class_gevolgd_op,
    meetjaren: q.data.meetjaren || [],
    verlopen: !geldig({ laatsteMetingOp: q.data.laatste_meting_op }),
    maat: Number(req.query?.maat) || 120
  });
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(svg);
}
