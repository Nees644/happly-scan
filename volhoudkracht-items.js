// volhoudkracht-items.js — de vragenset en de rekenregels van de Volhoudkracht
// Scan, zonder database en zonder netwerk, zodat ze te testen zijn.
//
// De scan meet hoeveel volhoudkracht er zit in een programma, training,
// traject of interventie: organiseert de impuls alleen het begin, of ook het
// gedrag tot het een gewoonte is. Zes dimensies, vier bewijsvragen per
// dimensie, vier niveaus per vraag. De teksten staan letterlijk in
// briefings/volhoudkracht-scan.md, paragraaf 2 tot en met 4.
//
// De invuller kiest eerst zijn eigen woord; [programma] in een vraag wordt
// daarmee gevuld. Impuls is een intern woord en komt hier niet voor.

export const WOORDEN = ["programma", "training", "traject", "interventie"];

export const AANBIEDERS = ["eigen", "keten"];

export const DIMENSIES = [
  { code: "R", naam: "Reden",     knop: "Willen",    vraag: "Weet elke deelnemer waarvoor hij dit doet, in eigen woorden, en komt dat terug?" },
  { code: "P", naam: "Plan",      knop: "Kunnen",    vraag: "Is het doel vertaald naar klein, herhaalbaar gedrag, met een als-dan voor de moeilijke momenten?" },
  { code: "T", naam: "Ritme",     knop: "Omgeving",  vraag: "Zijn er vaste momenten, cues en een omgeving die het gedrag makkelijk maakt?" },
  { code: "W", naam: "Weerstand", knop: "Weerstand", vraag: "Rekent het [programma] met inertia, scepsis en reactance, en is een misstap ingecalculeerd?" },
  { code: "C", naam: "Contact",   knop: "Omgeving, in de tijd", vraag: "Wat gebeurt er tussen de bijeenkomsten en in de 66 dagen na de laatste, en wie doet dat?" },
  { code: "M", naam: "Meting",    knop: "Alle vier", vraag: "Wordt het gedrag gevolgd, teruggekoppeld en hergemeten?" }
];

// Bij gelijke stand bepaalt deze volgorde de zwakste schakel: contact en
// meting wegen in de lezing het zwaarst, want daar zit in de praktijk de
// uitval (briefing, paragraaf 4).
export const VOORRANG_ZWAKSTE = ["C", "M", "P", "W", "T", "R"];

export const NIVEAUS = ["Niet aanwezig", "Benoemd", "Ingericht", "Aantoonbaar gedaan"];
export const MAX_PER_ITEM = 3;

// 24 bewijsvragen. De vier antwoorden staan altijd in de volgorde 0 tot 3.
export const ITEMS = [
  // Reden
  { id: "R1", dim: "R", vraag: "Vraagt het [programma] elke deelnemer bij de start waarvoor hij dit doet, in zijn eigen woorden?",
    niveaus: ["Nee.", "De begeleider vraagt het soms.", "Het is een vaste vraag bij de intake en het antwoord wordt bewaard.", "Het antwoord wordt bewaard en we zien het later terug in de begeleiding."] },
  { id: "R2", dim: "R", vraag: "Komt die eigen reden later in het [programma] letterlijk terug bij de deelnemer?",
    niveaus: ["Nee.", "Als de begeleider eraan denkt.", "Op vaste momenten, bijvoorbeeld bij de start van elke bijeenkomst.", "Op vaste momenten en op het moment dat de deelnemer wegzakt."] },
  { id: "R3", dim: "R", vraag: "Hoort de deelnemer onderweg wat het hem al oplevert, in iets dat hij zelf merkt (energie, slaap, geld, tijd), niet alleen in het einddoel?",
    niveaus: ["Nee.", "Als het ter sprake komt.", "Het is een vaste vraag per bijeenkomst.", "Het wordt bijgehouden en teruggegeven."] },
  { id: "R4", dim: "R", vraag: "Mag de deelnemer het doel bijstellen zonder dat het als falen telt?",
    niveaus: ["Het doel staat vast.", "In overleg kan het.", "Het is een vaste stap halverwege.", "Het is een vaste stap en we zien hoeveel deelnemers het doen."] },
  // Plan
  { id: "P1", dim: "P", vraag: "Verlaat elke deelnemer de eerste bijeenkomst met één concreet gedrag voor de komende week, zo klein dat overslaan lastiger is dan doen?",
    niveaus: ["Nee, met een doel.", "Dat vragen we.", "Het is een vaste stap met een opgeschreven eerste stap.", "Vaste stap, en we zien de week erna of het gedaan is."] },
  { id: "P2", dim: "P", vraag: "Heeft elke deelnemer een opgeschreven als-dan-plan voor zijn moeilijkste moment (als X gebeurt, dan doe ik Y)?",
    niveaus: ["Nee.", "We bespreken moeilijke momenten.", "Elke deelnemer schrijft er één op.", "Elke deelnemer schrijft er één op en het wordt bewaard en teruggegeven."] },
  { id: "P3", dim: "P", vraag: "Weet het [programma] welk moment voor deze deelnemer het moeilijkst is (het feestje, de regen, de maandag)?",
    niveaus: ["Nee.", "Het komt in gesprekken voorbij.", "Het is een vaste vraag en wordt vastgelegd.", "Vastgelegd en gebruikt om het contact te timen."] },
  { id: "P4", dim: "P", vraag: "Wordt het gedrag kleiner gemaakt als het niet lukt, in plaats van harder aangemoedigd?",
    niveaus: ["Nee, we motiveren.", "Dat doet de begeleider op gevoel.", "Het is een vaste regel: niet gelukt is te groot.", "Vaste regel, en we zien hoe vaak hij wordt toegepast."] },
  // Ritme
  { id: "T1", dim: "T", vraag: "Heeft elke deelnemer een vast moment in de week (dag en tijd) voor het gedrag, afgesproken in het [programma]?",
    niveaus: ["Nee.", "We raden het aan.", "Het is een vaste stap: dag en tijd worden vastgelegd.", "Vastgelegd en we vragen later of het nog staat."] },
  { id: "T2", dim: "T", vraag: "Is er een cue afgesproken, iets dat al in het leven van de deelnemer zit en het gedrag aankondigt (na de koffie, bij het uitlaten van de hond)?",
    niveaus: ["Nee.", "Het wordt genoemd.", "Elke deelnemer kiest er één.", "Gekozen en vastgelegd."] },
  { id: "T3", dim: "T", vraag: "Helpt het [programma] de deelnemer zijn omgeving in te richten (spullen klaar, afspraken thuis, drempels weg)?",
    niveaus: ["Nee.", "Het komt in een bijeenkomst voorbij.", "Het is een opdracht met een checklist.", "Opdracht, en we zien wie hem heeft gedaan."] },
  { id: "T4", dim: "T", vraag: "Loopt het [programma] lang genoeg door, of is er iets geregeld, tot het gedrag vanzelf gaat (gemiddeld 66 dagen na de start van het gedrag)?",
    niveaus: ["Het [programma] stopt eerder en daarna is er niets.", "We zeggen dat het 66 dagen duurt.", "Er is iets geregeld tot dag 66.", "Er is iets geregeld en we meten of het gedrag er op dag 66 nog is."] },
  // Weerstand
  { id: "W1", dim: "W", vraag: "Weet het [programma] per deelnemer wat hem het meest tegenhoudt: inertia (niet op gang komen), scepsis (niet geloven dat het lukt) of reactance (niet willen dat het moet)?",
    niveaus: ["Nee.", "De begeleider schat het in.", "Het wordt gemeten bij de start.", "Gemeten en de begeleiding verschilt ernaar."] },
  { id: "W2", dim: "W", vraag: "Is een misstap ingecalculeerd: weet de deelnemer vooraf dat hij zal overslaan en wat hij dan doet?",
    niveaus: ["Nee.", "We zeggen dat het mag.", "Het is een vaste les met een afspraak voor na de misstap.", "Vaste les, en we zien hoeveel deelnemers na een misstap doorgaan."] },
  { id: "W3", dim: "W", vraag: "Wordt scepsis (ik kan dit niet) gericht aangepakt met kleine, zichtbare successen in de eerste twee weken?",
    niveaus: ["Nee.", "We moedigen aan.", "De eerste twee weken zijn bewust klein en haalbaar ingericht.", "Ingericht en we meten het vertrouwen bij start en na twee weken."] },
  { id: "W4", dim: "W", vraag: "Mag de deelnemer kiezen (gedrag, moment, tempo), zodat het van hem wordt en niet van het [programma]?",
    niveaus: ["Het [programma] bepaalt.", "Er is wat ruimte.", "Keuze is een vaste stap.", "Vaste stap en we zien dat deelnemers verschillend kiezen."] },
  // Contact
  { id: "C1", dim: "C", vraag: "Is er contact tussen de bijeenkomsten, op initiatief van het [programma]?",
    niveaus: ["Nee.", "Als de deelnemer belt.", "Ja, een vast contactmoment per week.", "Vast contactmoment en we zien wie reageert."] },
  { id: "C2", dim: "C", vraag: "Wat gebeurt er als een deelnemer twee weken niets doet?",
    niveaus: ["Niets.", "De begeleider merkt het soms.", "Er volgt een vast signaal.", "Er volgt een vast signaal en een zetje dat past bij wat hem tegenhoudt."] },
  { id: "C3", dim: "C", vraag: "Krijgt een deelnemer binnen zeven dagen na de laatste bijeenkomst nog een persoonlijk contactmoment?",
    niveaus: ["Nee.", "Het is de bedoeling.", "Het staat ingepland.", "Het gebeurt en we zien wie reageert."] },
  { id: "C4", dim: "C", vraag: "Is er iets geregeld in de 66 dagen na de laatste bijeenkomst dat geen uren van de begeleider kost?",
    niveaus: ["Nee.", "Een nieuwsbrief.", "Een vaste reeks contactmomenten.", "Een reeks die reageert op wat de deelnemer doet."] },
  // Meting
  { id: "M1", dim: "M", vraag: "Houdt de deelnemer zelf bij of hij het gedrag heeft gedaan, en ziet hij dat terug?",
    niveaus: ["Nee.", "We raden een app of dagboek aan.", "Het is een vaste stap met een vast middel.", "Vaste stap en de begeleider ziet de aantallen."] },
  { id: "M2", dim: "M", vraag: "Wordt bij de start gemeten waar de deelnemer staat (gedrag, vertrouwen, weerstand), als nulmeting?",
    niveaus: ["Nee.", "Een intakegesprek.", "Een vaste vragenlijst.", "Vaste vragenlijst met een score die terugkomt."] },
  { id: "M3", dim: "M", vraag: "Wordt op dag 60 tot 100 na de start van het gedrag gemeten of het er nog is?",
    niveaus: ["Nee.", "We vragen het soms na.", "Het is een vaste hermeting.", "Vaste hermeting en we kennen ons percentage."] },
  { id: "M4", dim: "M", vraag: "Weet het [programma] zijn eigen cijfer: hoeveel deelnemers doen het gedrag drie maanden na afloop nog?",
    niveaus: ["Nee.", "We hebben een indruk.", "We hebben het één keer gemeten.", "We meten het elke groep en gebruiken het om het [programma] te verbeteren."] }
];

export const MAX_TOTAAL = ITEMS.length * MAX_PER_ITEM;

// Banden op de score van 0 tot 100 (briefing, paragraaf 4).
export const BANDEN = [
  { code: "start",   van: 0,  tot: 39,  naam: "Een goede start, geen vervolg",       kop: "Jouw [programma] organiseert het begin" },
  { code: "bedoeld", van: 40, tot: 69,  naam: "Volhouden is bedoeld, niet ingericht", kop: "Jouw [programma] wil volhouden, maar heeft het niet georganiseerd" },
  { code: "georganiseerd", van: 70, tot: 100, naam: "Volhouden is georganiseerd",  kop: "Jouw [programma] organiseert volhouden" }
];

// Vanaf hoeveel scans het gemiddelde wordt getoond. Daarvoor geen referentie,
// en nooit een ranglijst.
export const MINIMUM_VOOR_GEMIDDELDE = 30;

// Het lidwoord gaat mee met het woord: het programma, de training, het
// traject, de interventie. Ook "elk programma" wordt "elke training".
export const LIDWOORD = { programma: "het", training: "de", traject: "het", interventie: "de" };

export function vulWoord(tekst, woord){
  const w = WOORDEN.includes(woord) ? woord : "programma";
  const lid = LIDWOORD[w];
  const elk = lid === "de" ? "elke" : "elk";
  return String(tekst)
    .replace(/\bHet \[programma\]/g, `${lid[0].toUpperCase()}${lid.slice(1)} ${w}`)
    .replace(/\bhet \[programma\]/g, `${lid} ${w}`)
    .replace(/\bElk \[programma\]/g, `${elk[0].toUpperCase()}${elk.slice(1)} ${w}`)
    .replace(/\belk \[programma\]/g, `${elk} ${w}`)
    .replace(/\[programma\]/g, w);
}

export function itemsVoor(woord){
  return ITEMS.map(it => ({ ...it, vraag: vulWoord(it.vraag, woord), niveaus: it.niveaus.map(n => vulWoord(n, woord)) }));
}

export function bandVoor(score){
  return BANDEN.find(b => score >= b.van && score <= b.tot) || BANDEN[0];
}

// antwoorden: { R1: 0..3, ... }. Geeft null als er een ontbreekt of ongeldig
// is; de server rekent, de browser nooit.
export function scoreVolhoudkracht(antwoorden){
  if (!antwoorden || typeof antwoorden !== "object") return null;
  const per = {};
  let totaal = 0;
  for (const it of ITEMS){
    const v = antwoorden[it.id];
    if (!Number.isInteger(v) || v < 0 || v > MAX_PER_ITEM) return null;
    per[it.dim] = (per[it.dim] || 0) + v;
    totaal += v;
  }
  const dimensies = {};
  for (const d of DIMENSIES) dimensies[d.code] = Math.round(per[d.code] / (4 * MAX_PER_ITEM) * 100);
  const score = Math.round(totaal / MAX_TOTAAL * 100);
  const laagste = Math.min(...Object.values(dimensies));
  const zwakste = VOORRANG_ZWAKSTE.find(c => dimensies[c] === laagste);
  const items = {};
  for (const it of ITEMS) items[it.id] = antwoorden[it.id];
  return { score, totaal, dimensies, zwakste, band: bandVoor(score).code, items };
}

const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function controleerGegevens(g = {}){
  const fouten = [];
  const tekst = v => String(v ?? "").trim();
  if (!WOORDEN.includes(g.woord)) fouten.push({ veld: "woord", tekst: "Kies wat je aanbiedt." });
  if (tekst(g.programma_naam).length < 2 || tekst(g.programma_naam).length > 120) fouten.push({ veld: "programma_naam", tekst: "Vul de naam van je programma in." });
  if (!AANBIEDERS.includes(g.aanbieder)) fouten.push({ veld: "aanbieder", tekst: "Kies of het een eigen product is of een keten." });
  if (tekst(g.naam).length < 2) fouten.push({ veld: "naam", tekst: "Vul je naam in." });
  if (!MAIL.test(tekst(g.email))) fouten.push({ veld: "email", tekst: "Vul een e-mailadres in waar je bij kunt." });
  if (tekst(g.organisatie).length < 2) fouten.push({ veld: "organisatie", tekst: "Vul de naam van je organisatie in." });
  if (g.privacy !== true) fouten.push({ veld: "privacy", tekst: "Zonder akkoord op de privacyverklaring kunnen we je de uitslag niet mailen." });
  return { ok: fouten.length === 0, fouten };
}

export function voornaam(naam){
  return String(naam || "").trim().split(/\s+/)[0] || "";
}

// Alleen letters, cijfers, streepjes; anders niets. Zelfde regel als bij het
// Leidersbeeld: een vreemde herkomst mag nooit een invulling kosten.
export function schoonHerkomst(src){
  const s = String(src || "").trim().slice(0, 40);
  return /^[a-z0-9_-]+$/i.test(s) ? s : null;
}

// De rij die wordt weggeschreven. De scores komen uit de antwoorden, nooit uit
// de browser.
export function maakInzending(body = {}){
  const controle = controleerGegevens(body);
  if (!controle.ok) return { ok: false, fouten: controle.fouten };
  const gemeten = scoreVolhoudkracht(body.antwoorden);
  if (!gemeten) return { ok: false, fouten: [{ veld: "antwoorden", tekst: "Beantwoord alle 24 vragen." }] };
  const t = v => String(v ?? "").trim();
  return {
    ok: true,
    rij: {
      woord: body.woord,
      programma_naam: t(body.programma_naam).slice(0, 120),
      aanbieder: body.aanbieder,
      naam: t(body.naam).slice(0, 120),
      email: t(body.email).toLowerCase().slice(0, 200),
      organisatie: t(body.organisatie).slice(0, 120),
      antwoorden: gemeten.items,
      score: gemeten.score,
      dim_reden: gemeten.dimensies.R,
      dim_plan: gemeten.dimensies.P,
      dim_ritme: gemeten.dimensies.T,
      dim_weerstand: gemeten.dimensies.W,
      dim_contact: gemeten.dimensies.C,
      dim_meting: gemeten.dimensies.M,
      zwakste: gemeten.zwakste,
      band: gemeten.band,
      herkomst_src: schoonHerkomst(body.src),
      privacy_akkoord_op: new Date().toISOString()
    }
  };
}

export function mailOnderwerp(score){
  return `Jouw volhoudkrachtscore: ${score}`;
}
