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

1. Kop "Wat opvalt in jouw antwoorden", daaronder precies vier alinea's van elk 40 tot 60 woorden, in deze vaste volgorde: (a) het grootste verschil tussen deelscores, (b) het laagst scorende antwoord, (c) de spanning binnen één dimensie, (d) de slotalinea: de stand is gevormd, niet aangeboren. Alinea (c) mag alleen vervallen als er geen betekenisvolle spanning is; (a), (b) en (d) vervallen nooit.
2. Kop "Waar het werk zit", daaronder één alinea route van 50 tot 80 woorden.

Totaal 220 tot 320 woorden; 320 is een harde bovengrens. Maak elk punt één keer en schrap elke zin die herhaalt wat al gezegd is.

Regels voor de duiding:
- Begin altijd met het grootste verschil tussen twee deelscores. Benoem het verschil in punten en wat die combinatie betekent.
- Alleen als "lage_score" in de invoer true is: direct na het benoemen van dat grootste verschil volgt één opvangzin met exact deze strekking: "Een lagere startmeting zegt niets over wat je kunt. Hij zegt iets over je huidige automatismen, en juist die zijn te verzetten." Is "lage_score" false, dan laat je die zin volledig weg.
- Proportieregel: hoe groter het verschil tussen deelscores, hoe meer gewicht je het geeft. Kleiner dan 10 punten: behandel het terloops en licht, zonder er een patroon of gat van te maken. Tussen 10 en 20 punten: benoem het als een duidelijk verschil en werk het uit. Boven 20 punten: maak het de kern van de duiding, met de volle analyse. Die weging verantwoord je nooit in de tekst: geen zinnen die zeggen dat een verschil ergens groot, stevig of belangrijk genoeg voor is, geen categorieën, geen grenzen. Je stelt direct vast wat er staat en wat het betekent, in gewone taal.
- Benoem daarna het laagst scorende individuele antwoord van de meting: gebruik exact het item dat in "laagste_item" in de invoer staat, nooit een ander. Parafraseer de stelling in gewone taal, noem geen itemcodes. Verbind het met het dimensieprofiel.
- Alleen als "lage_score" true is: de alinea over dat laagste antwoord bestaat uit hooguit één zin die het antwoord benoemt, direct gevolgd door één herkenningsscène; alle verdere analyse van dit antwoord vervalt. De scène is één klein, alledaags moment van hooguit drie seconden waarin dit patroon zichtbaar wordt: filmisch, concreet, zonder oordeel. Voorbeelden van zulke momenten per thema: goedkeuring vragen voor iets dat binnen je eigen mandaat valt; de mail van 's avonds laat direct beantwoorden; het formulier dat al weken open staat in een tabblad; wachten tot iemand het vraagt terwijl je de verbetering al ziet. Kies of maak de scène die bij dit antwoord past. De alinea eindigt met exact de vraag "herken je zo'n moment?"; dit is de enige toegestane uitzondering op de regel dat elke alinea met een conclusiezin eindigt, en de enige scène in de hele duiding.
- Zoek één spanning tussen twee antwoorden binnen dezelfde dimensie (hoog op het ene, laag op het andere). De alinea waarin je die spanning bespreekt eindigt met precies één conclusiezin: wat deze combinatie voor deze persoon betekent. Een vergelijking waar je geen conclusie aan verbindt, laat je helemaal weg. Als er geen betekenisvolle spanning is, sla dit over; verzin er nooit een.
- Elke alinea van de duiding eindigt met een volledige conclusiezin, met onderwerp en werkwoord, die zegt wat de besproken cijfers voor deze persoon betekenen. Nooit een los zinsfragment als slot. Een alinea die alleen vergelijkt zonder tot zo'n conclusie te komen, laat je helemaal weg.
- Sluit de duiding af met de slotalinea: de stand is gevormd, niet aangeboren; verwerk daarin de vaste kern "kleine keuzes die je bij anderen laat of laat afhangen van de omstandigheden; wat je vaak genoeg doet, wordt automatisch, en wat automatisch is, zie je niet meer", ingekleurd naar het profiel. De term "nature-nurture" komt nooit in de tekst voor.

Regels voor de route:
- Alleen als "fijnslijp" in de invoer true is, open de sectie "Waar het werk zit" dan met één zin meetbescheidenheid, in de trant van: "Je scores liggen dicht bij elkaar en zijn hoog; zie de accenten hieronder als fijnslijpen, niet als gebreken." Is "fijnslijp" false, dan laat je die zin volledig weg en begin je direct met de ontwikkelruimte.
- Benoem de dimensie met de grootste ontwikkelruimte, met de plus als getal. Gebruik exact het getal en de dimensie uit "grootste_ruimte" in de invoer.
- Vertaal wat werken aan die dimensie voor dit profiel betekent, in één zin, zonder methode of stappen prijs te geven.
- Verwijs naar de bijbehorende Sprint-weken met het werkwoord "onderzoeken", op basis van "laagste_dimensie": Zien -> week 1 en 2; Sturen -> week 3 en 4; Doen -> week 5 en 6. Alleen als "lage_score" true is, vervang je die verwijzing door exact deze autonomiezin, met de juiste weeknummers ingevuld: "Je hoeft hier niets mee. Maar als je wilt kijken hoe dit werkt, is dat precies wat je onderzoekt in week X en Y van de Zelfkracht Sprint."
- Sluit altijd af met exact deze zin: "Over een jaar meet je opnieuw. Dan is dit getal geen oordeel meer, maar je nulpunt."

Harde verboden:
- Geen meta-taal. Je verwijst nooit naar deze instructie, naar categorieën, gebieden of grenzen waarin een verschil "valt", en je verantwoordt nooit je eigen toon of weging. Elke "genoeg om"-constructie over een verschil is verboden ("groot genoeg om er stellig over te zijn", "stevig genoeg om er stellig over te schrijven", "de moeite waard om er iets over te zeggen"), net als toetsende formuleringen ("wat als duidelijk verschil geldt", "valt in het gebied waar"). De lezer mag nergens merken dat er regels bestaan; er staat alleen wat de cijfers zeggen en wat dat betekent.
- Geen tips, oefeningen, stappenplannen of adviezen. Je diagnosticeert, je behandelt niet.
- Geen uitspraken waarin vrijwel iedereen zich herkent. Elke bewering moet steunen op een concrete score of een concreet verschil, en zou bij een ander profiel anders luiden.
- Geen vergelijkingen met anderen of gemiddelden (er zijn nog geen normdata). Alleen vergelijkingen binnen het eigen profiel.
- Geen labels of typen ("jij bent een..."). Geen superlatieven. Geen uitroeptekens.
- Nooit de woorden: gemakkelijk, simpel, moeiteloos, test, quiz. Verandering is haalbaar met gericht werk; de Index beweegt traag en juist daarom telt een verschuiving.
- Lengte: houd je aan het alineaschema en de woordbudgetten uit de structuursectie; 320 woorden totaal is de harde bovengrens.

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

    // Fijnslijp-zin alleen bij hoge, vlakke profielen: totaal boven 75 en het
    // grootste gat tussen deelscores kleiner dan 10 punten. Hier berekend, niet
    // aan het model overgelaten (Maarten, 29-07-2026).
    const scores = dims.map(d => d[1]);
    const fijnslijp = index > 75 && (Math.max(...scores) - Math.min(...scores)) < 10;

    // Lage-score-protocol (Maarten, 29-07-2026): opvangzin, herkenningsscène en
    // autonomiezin bij totaal onder 50 of laagste deelscore onder 45.
    const lage_score = index < 50 || Math.min(...scores) < 45;

    // Laagste item hier bepaald (het model koos soms het verkeerde);
    // bij gelijke stand wint het item in de laagste dimensie.
    const codes = Object.keys(ITEM_META).filter(c => typeof items[c] === "number");
    codes.sort((a,b) => (items[a] - items[b]) ||
      ((ITEM_META[a].dim === laagste ? 0 : 1) - (ITEM_META[b].dim === laagste ? 0 : 1)));
    const li = codes[0];
    const laagste_item = li ? { dimensie: ITEM_META[li].dim, omgekeerd: ITEM_META[li].rev,
      stelling: ITEM_META[li].stelling, score_gespiegeld: items[li] } : null;

    const itemList = Object.keys(ITEM_META).map(code => ({
      dimensie: ITEM_META[code].dim,
      omgekeerd: ITEM_META[code].rev,
      stelling: ITEM_META[code].stelling,
      score_gespiegeld: items[code]
    }));

    const invoer = { index, deelscores:{Zien:zien, Sturen:sturen, Doen:doen},
      items:itemList, grootste_ruimte:grootste, laagste_dimensie:laagste, laagste_item, fijnslijp, lage_score };

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      thinking: { type: "disabled" },   // uit voor snelle respons binnen de functie-timeout
      system: SYSTEM,
      messages: [{ role: "user", content: "Invoer (JSON):\n" + JSON.stringify(invoer, null, 2) }]
    });

    let duiding = (msg.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    if (!duiding){ res.status(502).json({error:"leeg"}); return; }

    // Harde woordgrens (320) in code afgedwongen: het model telt zonder thinking
    // niet betrouwbaar, dus bij overschrijding hooguit twee inkort-passes.
    const woorden = t => t.split(/\s+/).filter(Boolean).length;
    for (let poging = 0; poging < 2 && woorden(duiding) > 320; poging++){
      const kort = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1500,
        thinking: { type: "disabled" },
        system: `Je kort een bestaande duiding in tot maximaal 290 woorden zonder iets toe te voegen of te herformuleren wat kan blijven staan. Behoud letterlijk: de twee koppen, de zin die begint met "Een lagere startmeting" als die er staat, de scène die eindigt op "herken je zo'n moment?" als die er staat, de zinnen "Je hoeft hier niets mee." en wat daarop volgt als die er staan, en de slotzin "Over een jaar meet je opnieuw. Dan is dit getal geen oordeel meer, maar je nulpunt." Schrap herhalende en samenvattende zinnen en overbodige bijzinnen; behoud de alineavolgorde en elke alinea zelf. Geef alleen de ingekorte duiding terug.`,
        messages: [{ role: "user", content: duiding }]
      });
      const ingekort = (kort.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
      if (!ingekort || woorden(ingekort) >= woorden(duiding)) break;
      duiding = ingekort;
    }

    // Koppen normaliseren voordat de duiding wordt getoond, opgeslagen en gemaild.
    // Het model verhaspelt de kop soms ("antwoordenn") of plakt de eerste zin eraan
    // vast ("antwoordenHet verschil..."); de kopfilters in scan.html en lead.js
    // strippen de hele kopregel en zouden die zin dan meenemen. Heuristiek:
    // verhaspelde uitloop is kleine letters, vastgeplakte inhoud begint met een
    // hoofdletter. Beide koppen komen hier op een eigen regel te staan.
    duiding = duiding
      .replace(/^[ \t]*[#*]*[ \t]*Wat opvalt in jouw antw[a-zà-ÿ]*[ \t]*[#*]*[ \t]*/,
               "Wat opvalt in jouw antwoorden\n\n")
      .replace(/(^|\n)[ \t]*[#*]*[ \t]*Waar het werk zit[a-zà-ÿ]*[ \t]*[#*]*[ \t]*:?[ \t]*/,
               "\n\nWaar het werk zit\n\n")
      .replace(/\n{3,}/g, "\n\n").trim();

    res.status(200).json({ duiding });
  }catch(e){
    res.status(500).json({ error: "duiding mislukt" });
  }
}
