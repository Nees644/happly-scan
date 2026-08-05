// api/deelzin.js — Vercel serverless function
// Kiest de meest markante losse zin uit een al gegenereerde duiding, voor het
// deelbeeld op de uitslagpagina ("Deel wat je herkende"). Aparte korte AI-stap
// ná de duiding-generatie; de client roept dit parallel aan de duiding-render
// aan, dus de deelnemer wacht er niet op. De zin wordt met de meting opgeslagen
// (kolom deel_zin, migratie 05-08-2026) zodat hij één keer wordt gegenereerd.
// Servertoets op de regels (geen getallen, geen dimensienamen, max 100 tekens)
// met één herkansing; daarna 502 en valt de client terug op de vaste canonzin.
// Vereist env var: ANTHROPIC_API_KEY

import Anthropic from "@anthropic-ai/sdk";

const INSTRUCTIE = `Kies uit onderstaande duiding de ene zin die het meest herkenbaar, concreet en aangrijpend is voor de lezer zelf, geschikt om los te delen. Vermijd zinnen met getallen, dimensienamen (Zien/Sturen/Doen) of vergelijkende taal. De zin moet op zichzelf kunnen staan zonder de rest van de duiding. Maximaal 100 tekens; her-formuleer licht indien nodig zonder de betekenis te veranderen, output alleen de zin.`;

/* Dimensienamen alleen met hoofdletter toetsen: "zien" en "doen" zijn gewone
   werkwoorden en mogen; de kapitaalvorm is in de duiding altijd de dimensie. */
function toets(zin){
  if (!zin) return "leeg";
  if (zin.length > 100) return "langer dan 100 tekens";
  if (/\d/.test(zin)) return "bevat een getal";
  if (/\b(Zien|Sturen|Doen)\b/.test(zin)) return "bevat een dimensienaam";
  return null;
}

function schoon(t){
  return (t || "").trim()
    .replace(/^["'“”‘’]+/, "").replace(/["'“”‘’]+$/, "")   // aanhalingstekens van het model
    .replace(/\s+/g, " ").trim();
}

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({error:"method"}); return; }
  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const duiding = (body.duiding || "").trim();
    if (duiding.length < 80){ res.status(400).json({error:"ongeldige invoer"}); return; }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let melding = null;
    for (let poging = 0; poging < 3; poging++){
      const content = poging === 0
        ? `${INSTRUCTIE}\n\nDuiding:\n${duiding}`
        : `${INSTRUCTIE}\n\nJe vorige keuze werd afgekeurd: ${melding}. Herformuleer de meest herkenbare gedachte tot één zelfstandige zin die aan alles voldoet: geen cijfers, nooit de woorden Zien, Sturen of Doen (omschrijf in gewone taal wat ze betekenen), maximaal 100 tekens. Output alleen de zin.\n\nDuiding:\n${duiding}`;
      const msg = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 200,
        thinking: { type: "disabled" },
        messages: [{ role: "user", content }]
      });
      const zin = schoon((msg.content || []).filter(b => b.type === "text").map(b => b.text).join(" "));
      melding = toets(zin);
      if (!melding){ res.status(200).json({ zin }); return; }
    }
    res.status(502).json({ error: "geen geldige zin" });
  }catch(e){
    res.status(500).json({ error: "deelzin mislukt" });
  }
}
