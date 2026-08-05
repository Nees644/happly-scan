// api/afmelden.js — Vercel serverless function
// De afmeldlink onder elke mail van de opvolgreeks: /api/afmelden?r=<reeks-id>.
// Zet afgemeld=true op de reeks (het onvoorspelbare uuid is het token) en toont
// een sobere bevestigingspagina in de huisstijl. Idempotent: nogmaals klikken
// geeft dezelfde pagina.
// Vereist env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pagina(kop, tekst){
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Afmelden · Zelfkracht Index</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"DM Sans",sans-serif;background:#1A0B2E;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:#fff;border-radius:12px;max-width:480px;width:100%;padding:44px 40px;text-align:center}
h1{font-family:"DM Serif Display",serif;font-weight:400;font-size:26px;color:#1A0B2E;margin-bottom:12px}
p{font-size:14px;font-weight:300;color:#4A3C56;line-height:1.7}
a{color:#D6026F;font-weight:500;text-decoration:none}
</style></head><body>
<div class="card"><h1>${kop}</h1><p>${tekst}</p></div>
</body></html>`;
}

export default async function handler(req, res){
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  try{
    const r = (req.query && req.query.r) || "";
    if (!UUID.test(r)){
      res.status(400).send(pagina("Deze link werkt niet", "De afmeldlink is onvolledig. Kopieer de volledige link uit de mail, of mail <a href='mailto:hallo@happly.nl'>hallo@happly.nl</a>."));
      return;
    }
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    await db.from("opvolgreeks").update({ afgemeld: true }).eq("id", r);
    res.status(200).send(pagina("Je bent afgemeld", "Je ontvangt geen verdere mail over deze meting. Je uitslagmail mag je gewoon bewaren; dat blijft je nulpunt."));
  }catch(e){
    res.status(500).send(pagina("Dat ging mis", "Afmelden lukte nu niet. Probeer het later nog eens, of mail <a href='mailto:hallo@happly.nl'>hallo@happly.nl</a>."));
  }
}
