// api/factuur.js — Vercel serverless function
// De pdf van een factuur ophalen. De bak in Supabase Storage is niet openbaar,
// dus wie zijn factuur wil, krijgt hier een tijdelijke link. Een pad raden
// levert niets op: zonder handtekening laat de opslag niets los.
//
// GET /api/factuur?id=<factuur-id>
//
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { eisGebruiker, serviceClient, logFout } from "../teamkracht-auth.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GELDIG_SECONDEN = 300;

export default async function handler(req, res){
  if (req.method !== "GET"){ res.status(405).json({ error: "method" }); return; }
  const gebruiker = await eisGebruiker(req, res, ["lezer", "coach", "beheerder"]);
  if (!gebruiker) return;

  const id = String(req.query?.id || "");
  if (!UUID.test(id)){ res.status(400).json({ error: "ongeldig id" }); return; }

  try{
    const db = serviceClient();
    const f = await db.from("facturen")
      .select("id, nummer, gebruiker_id, pdf_pad").eq("id", id).maybeSingle();
    if (f.error || !f.data){ res.status(404).json({ error: "onbekende factuur" }); return; }

    // Alleen je eigen factuur, of alles als je de omgeving beheert.
    if (gebruiker.rol !== "beheerder" && f.data.gebruiker_id !== gebruiker.user_id){
      res.status(403).json({ error: "geen toegang" }); return;
    }
    if (!f.data.pdf_pad){
      res.status(404).json({ error: "van deze factuur is geen pdf bewaard" }); return;
    }

    const link = await db.storage.from("facturen")
      .createSignedUrl(f.data.pdf_pad, GELDIG_SECONDEN, { download: `factuur-${f.data.nummer}.pdf` });
    if (link.error || !link.data?.signedUrl){ res.status(500).json({ error: "link maken mislukt" }); return; }

    res.status(200).json({ url: link.data.signedUrl, nummer: f.data.nummer, geldig_seconden: GELDIG_SECONDEN });
  }catch(e){
    await logFout("factuur", e.message);
    res.status(500).json({ error: "ophalen mislukt" });
  }
}
