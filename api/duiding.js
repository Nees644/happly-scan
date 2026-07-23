// api/duiding.js — Vercel serverless function
// Genereert de persoonlijke duiding bij een Zelfkracht Index-meting.
// Model: Claude Sonnet (claude-sonnet-5). Systeeminstructie: document 4 (AI-instructie).
// Vereist env var: ANTHROPIC_API_KEY

import Anthropic from "@anthropic-ai/sdk";

// Itemdefinities (vragenset v1). rev = omgekeerde stelling.
const ITEM_META = {
  Z1:{dim:"Zien",  rev:false, stelling:"Ik heb meestal snel door wat een gevoel bij mij veroorzaakt."},
  Z2:{dim:"Zien",  rev:false, stelling:"Ik herken de vaste patronen in hoe ik reageer, ook als ze me niet helpen."},
  Z3:{dim:"Zien",  rev:true,  stelling:"Mijn eigen reacties overvallen me regelmatig; ik begrijp ze pas later, of niet."},
  Z4:{dim:"Zien",  rev:false, stelling:"Ik weet welke situaties of mensen mij uit balans brengen."},
  S1:{dim:"Sturen",rev:false, stelling:"Hoe mijn leven loopt, hangt vooral af van wat ik zelf doe."},
  S2:{dim:"Sturen",rev:true,  stelling:"Bij belangrijke keuzes beslis ik pas echt als anderen het ermee eens zijn."},
  S3:{dim:"Sturen",rev:false, stelling:"Ik bepaal zelf mijn richting, ook als mijn omgeving iets anders verwacht."},
  S4:{dim:"Sturen",rev:true,  stelling:"Wat ik bereik, is vooral een kwestie van omstandigheden en geluk."},
  D1:{dim:"Doen",  rev:false, stelling:"Als ik iets besloten heb, begin ik snel, ook als het ongemakkelijk is."},
  D2:{dim:"Doen",  rev:false, stelling:"Ook bij onverwachte problemen vertrouw ik erop dat ik het kan oplossen."},
  D3:{dim:"Doen",  rev:true,  stelling:"Dingen die ik belangrijk vind, stel ik vaak uit tot het moment goed voelt."},
  D4:{dim:"Doen",  rev:false, stelling:"Wat ik begin, maak ik af, ook als de motivatie wegzakt."}
};

// Ontwikkelruimte identiek aan de scanpagina (scan.html); wijzig ze samen.
// Plus-regel (vastgesteld door Maarten, 23-07-2026): één stap omhoog, plafond 90.
// - score < 80  -> richtgetal 80 (stevig in Sterk)
// - 80 tot 90   -> richtgetal 90 (Zeer sterk halen)
// - 90 en hoger -> geen plus, "onderhouden"
function ontwikkelruimte(s){
  if (s >= 90) return {onderhoud:true, plus:null, doel:null};
  if (s >= 80) return {onderhoud:false, plus:90 - s, doel:90};
  return {onderhoud:false, plus:80 - s, doel:80};
}

const SYSTEM = `Je schrijft de persoonlijke duiding bij een Zelfkracht Index-meting. Je krijgt de totaalscore, drie deelscores en twaalf itemscores. Je schrijft in het Nederlands, in de je-vorm, in meettaal: cijfers en feiten dragen de tekst, niet beloftes of aanmoedigingen.

De itemscores zijn al gespiegeld naar de Zelfkracht-schaal: 4 betekent veel zelfkracht op dat punt, 0 weinig. Bij items met "omgekeerd": true betekent een lage gespiegelde score dat de persoon de oorspronkelijke stelling juist herkent. Parafraseer een laag antwoord dan in de richting van de oorspronkelijke stelling (zoals in de meegeleverde stellingtekst), noem nooit itemcodes.

Structuur van je uitvoer, altijd deze volgorde:

1. Kop "Wat opvalt in jouw antwoorden", daaronder drie tot vier alinea's duiding.
2. Kop "Waar het werk zit", daaronder één alinea route.

Regels voor de duiding:
- Begin altijd met het grootste verschil tussen twee deelscores. Benoem het verschil in punten en wat die combinatie betekent.
- Benoem daarna het laagst scorende individuele antwoord van de meting, in gewone taal (parafraseer de stelling, noem geen itemcodes). Verbind het met het dimensieprofiel.
- Zoek één spanning tussen twee antwoorden binnen dezelfde dimensie (hoog op het ene, laag op het andere) en benoem wat die spanning betekent. Als er geen betekenisvolle spanning is, sla dit over; verzin er nooit een.
- Sluit de duiding af met het nature-nurture-blok: de stand is gevormd, niet aangeboren; verwerk daarin de vaste kern "kleine keuzes die je bij anderen laat of laat afhangen van de omstandigheden; wat je vaak genoeg doet, wordt automatisch, en wat automatisch is, zie je niet meer", ingekleurd naar het profiel.

Regels voor de route:
- Benoem de dimensie met de grootste ontwikkelruimte, met de plus als getal. Gebruik exact het getal en de dimensie uit "grootste_ruimte" in de invoer.
- Vertaal wat werken aan die dimensie voor dit profiel betekent, in één zin, zonder methode of stappen prijs te geven.
- Verwijs naar de bijbehorende Sprint-weken met het werkwoord "onderzoeken", op basis van "laagste_dimensie": Zien -> week 1 en 2; Sturen -> week 3 en 4; Doen -> week 5 en 6.
- Sluit altijd af met exact deze zin: "Over een jaar meet je opnieuw. Dan is dit getal geen oordeel meer, maar je nulpunt."

Harde verboden:
- Geen tips, oefeningen, stappenplannen of adviezen. Je diagnosticeert, je behandelt niet.
- Geen uitspraken waarin vrijwel iedereen zich herkent. Elke bewering moet steunen op een concrete score of een concreet verschil, en zou bij een ander profiel anders luiden.
- Geen vergelijkingen met anderen of gemiddelden (er zijn nog geen normdata). Alleen vergelijkingen binnen het eigen profiel.
- Geen labels of typen ("jij bent een..."). Geen superlatieven. Geen uitroeptekens.
- Nooit de woorden: gemakkelijk, simpel, moeiteloos, test, quiz. Verandering is haalbaar met gericht werk; de Index beweegt traag en juist daarom telt een verschuiving.
- Lengte: 220 tot 320 woorden totaal.

Geef alleen de duiding terug, met de twee koppen als losse regels. Geen inleiding, geen afsluiting daarbuiten.`;

export default async function handler(req, res){
  if (req.method !== "POST"){ res.status(405).json({error:"method"}); return; }
  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { index, zien, sturen, doen, items } = body;
    if ([index,zien,sturen,doen].some(v => typeof v !== "number") || !items){
      res.status(400).json({error:"ongeldige invoer"}); return;
    }

    // Grootste ontwikkelruimte + laagste dimensie (consistent met de scanpagina).
    const dims = [["Zien",zien],["Sturen",sturen],["Doen",doen]];
    const ruimte = dims.map(([n,s]) => ({n,s,or:ontwikkelruimte(s)})).filter(x=>!x.or.onderhoud);
    ruimte.sort((a,b)=>b.or.plus-a.or.plus);
    const grootste = ruimte.length ? {dimensie:ruimte[0].n, plus:ruimte[0].or.plus, doel:ruimte[0].or.doel} : null;
    const laagste = [...dims].sort((a,b)=>a[1]-b[1])[0][0];

    const itemList = Object.keys(ITEM_META).map(code => ({
      dimensie: ITEM_META[code].dim,
      omgekeerd: ITEM_META[code].rev,
      stelling: ITEM_META[code].stelling,
      score_gespiegeld: items[code]
    }));

    const invoer = { index, deelscores:{Zien:zien, Sturen:sturen, Doen:doen},
      items:itemList, grootste_ruimte:grootste, laagste_dimensie:laagste };

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      thinking: { type: "disabled" },   // uit voor snelle respons binnen de functie-timeout
      system: SYSTEM,
      messages: [{ role: "user", content: "Invoer (JSON):\n" + JSON.stringify(invoer, null, 2) }]
    });

    const duiding = (msg.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    if (!duiding){ res.status(502).json({error:"leeg"}); return; }
    res.status(200).json({ duiding });
  }catch(e){
    res.status(500).json({ error: "duiding mislukt" });
  }
}
