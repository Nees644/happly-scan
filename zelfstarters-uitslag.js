// zelfstarters-uitslag.js
// Wat een geregistreerde van zijn meting te zien krijgt, als pure functies.
//
// De gratis trede geeft de score, de sterkste kant en de twee plekken waar de
// meeste ruimte zit, elk in één zin die zegt wat het is en niet wat je eraan
// doet. De volledige duiding, het als-dan plan en de hermeting horen bij de
// verificatie. Dat is geen gierigheid maar het ontwerp: inzicht gratis,
// bewijs en volhouden betaald.
//
// Niets hierin raakt de database.

export const VAKGEBIEDEN = [
  "Advies en consultancy",
  "Projectleiding en programmamanagement",
  "Interim management",
  "IT en data",
  "Beleid en bestuur",
  "Financiën en control",
  "HR en organisatie",
  "Marketing en communicatie",
  "Techniek en engineering",
  "Anders"
];

const DIMENSIES = ["zien", "sturen", "doen"];
const NAAM = { zien: "Zien", sturen: "Sturen", doen: "Doen" };

/* Eén zin per sterkste kant: wat iemand kan, zonder voorbehoud. */
const STERKSTE = {
  zien: "Je hebt snel door wat er met je gebeurt en waarom, ook als het spannend wordt.",
  sturen: "Je bepaalt zelf je richting en wacht niet tot een ander het ermee eens is.",
  doen: "Je bent begonnen voordat anderen klaar zijn met praten, en je maakt af wat je begint."
};

/* Eén zin per plek met ruimte: wat het is, niet wat je eraan doet. */
const RUIMTE = {
  zien: "Je reacties overvallen je soms eerder dan je ze ziet aankomen.",
  sturen: "De richting wordt vaker door de omstandigheden bepaald dan je zou willen.",
  doen: "Beginnen en afmaken lukt minder goed zodra het ongemakkelijk wordt."
};

function geldigeScores(s){
  return s && DIMENSIES.every(d => typeof s[d] === "number" && Number.isFinite(s[d]));
}

/* De dimensies op volgorde van score, hoog naar laag. Bij gelijke scores
   wint de vaste volgorde Zien, Sturen, Doen, zodat de uitslag stabiel is. */
export function volgorde(scores){
  if (!geldigeScores(scores)) return DIMENSIES.slice();
  return DIMENSIES.slice().sort((a, b) => (scores[b] - scores[a]) || (DIMENSIES.indexOf(a) - DIMENSIES.indexOf(b)));
}

export function sterksteKant(scores){
  const d = volgorde(scores)[0];
  return { dimensie: d, naam: NAAM[d], zin: `Je sterkste kant is ${NAAM[d]}. ${STERKSTE[d]}` };
}

/* De twee plekken met de meeste ruimte: de twee laagste ringen. */
export function ruimtePunten(scores){
  return volgorde(scores).slice(1).reverse().map((d, i) => ({
    dimensie: d, naam: NAAM[d],
    zin: `${i === 0 ? "Je meeste ruimte zit in" : "Daarna komt"} ${NAAM[d]}. ${RUIMTE[d]}`
  }));
}

/* De momenten waarop een als-dan plan zich richt. De professional kiest er
   per ontwikkelpunt één en zegt wat hij dan doet. */
export const MOMENTEN = [
  { code: "gesprek", label: "het eerste gesprek met een opdrachtgever" },
  { code: "start", label: "de eerste week van een opdracht" },
  { code: "honderd", label: "de eerste honderd dagen" },
  { code: "tegenslag", label: "het moment dat het tegenzit" },
  { code: "evaluatie", label: "de evaluatie" },
  { code: "verlenging", label: "het gesprek over verlenging" }
];

/* Dezelfde meting, een andere lezing: voor wie in loondienst werkt zijn de
   momenten die ertoe doen anders. Sinds 6 november 2026. */
export const MOMENTEN_LOONDIENST = [
  { code: "sollicitatie", label: "het sollicitatiegesprek" },
  { code: "proeftijd", label: "de proeftijd" },
  { code: "functioneren", label: "het functioneringsgesprek" },
  { code: "verandering", label: "de reorganisatie of de nieuwe leidinggevende" },
  { code: "stap", label: "de interne vacature of de stap omhoog" },
  { code: "vertrek", label: "het moment dat je weet dat je weg wilt" }
];

export const WERKVORMEN = ["zelfstandig", "loondienst"];

export function momentenVoor(werkvorm){
  return werkvorm === "loondienst" ? MOMENTEN_LOONDIENST : MOMENTEN;
}
export function alleMomenten(){
  return [...MOMENTEN, ...MOMENTEN_LOONDIENST];
}

/* Wat een als-dan plan is en hoe je hem maakt. Staat op de pagina en in de
   mail, op één plek zodat beide hetzelfde zeggen. */
export const PLAN_UITLEG = {
  waarom: "Een voornemen zonder moment vervliegt. Koppel je wat je wilt doen aan een moment dat zeker komt en dat je herkent, dan hoef je op dat moment niet meer te beslissen: je doet het. Dat is het gedrag dat je meting zichtbaar maakt, op de momenten die ertoe doen.",
  als: "Kies een moment dat de komende maanden zeker in je werk voorkomt, dat je herkent als het er is, en dat raakt aan dit ruimtepunt.",
  dan: "Eén handeling, in tien minuten te doen, klein genoeg om altijd te lukken. Begin met wat je doet: bel, schrijf, stuur, vraag. Het voorbeeld mag je overnemen en aanpassen.",
  wanneer: "Weet je ongeveer wanneer dit moment komt, vul dan de datum in. Je krijgt de dag ervoor een mail met je eigen zin.",
  herinnering: "Zonder datum, en daarnaast, krijg je drie keer een korte check: na een week, na drie maanden en na vijf maanden. Is het moment geweest, wat deed je, en wil je de regel bijstellen. Na vijf maanden komt je hermeting in zicht."
};

/* Per ruimtepunt en per moment één voorbeeld van een dan. Klein, concreet,
   in de eerste persoon, beginnend met wat je doet. */
export const VOORBEELDEN = {
  zien: {
    gesprek: "schrijf ik vooraf op wat ik verwacht te voelen als het stroef loopt, en kijk ik daar na afloop naar terug",
    start: "noteer ik drie avonden lang in één regel waar ik vandaag op aansloeg",
    honderd: "zet ik op dag 30, 60 en 90 een kwartier in mijn agenda om op te schrijven wat me irriteert en wat me energie geeft",
    tegenslag: "wacht ik een uur voordat ik reageer en schrijf ik eerst op wat er precies gebeurde",
    evaluatie: "vraag ik vooraf aan één collega wat hem aan mij opviel, en lees ik dat voor het gesprek",
    verlenging: "schrijf ik voor het gesprek op wat ik wil en wat ik vrees, zodat ik mijn eigen reactie herken"
  },
  sturen: {
    gesprek: "benoem ik in de eerste tien minuten zelf wat ik als mijn bijdrage zie, in plaats van te wachten op de vraag",
    start: "stuur ik aan het eind van week één een voorstel voor de aanpak, voordat iemand erom vraagt",
    honderd: "leg ik op dag 30 zelf een korte koerscheck op tafel: wat gaat goed, wat stel ik bij",
    tegenslag: "kom ik binnen een dag met twee opties en mijn keuze, niet alleen met het probleem",
    evaluatie: "stuur ik vooraf mijn eigen agenda met drie punten die ik besproken wil hebben",
    verlenging: "doe ik zelf het voorstel voor de volgende periode, met wat ik anders wil doen"
  },
  doen: {
    gesprek: "mail ik binnen 24 uur met één concrete eerste stap die ik al heb gezet",
    start: "maak ik op dag één een lijst van drie dingen die ik in week één af heb, en meld ik vrijdag wat ervan staat",
    honderd: "kies ik elke maandag één ding dat ik uitstel, en doe ik dat vóór twaalf uur",
    tegenslag: "zet ik dezelfde dag nog de kleinste volgende stap, ook als ik hem niet af krijg",
    evaluatie: "maak ik binnen een dag na het gesprek de afspraken concreet, met datum, en stuur ik ze rond",
    verlenging: "begin ik de eerste week van de nieuwe periode met het ding dat ik vorige keer liet liggen"
  }
};

/* Voorbeelden voor loondienst, per ruimtepunt en moment. Eerste versie van
   6 november 2026, door Maarten te redigeren. */
export const VOORBEELDEN_LOONDIENST = {
  zien: {
    sollicitatie: "schrijf ik vooraf op welke vraag ik vrees, en wat ik dan voel, zodat ik hem herken als hij komt",
    proeftijd: "noteer ik elke vrijdag in één regel waar ik deze week op aansloeg en wat ik liet lopen",
    functioneren: "vraag ik een week vooraf aan één collega wat hem aan mij opvalt, en neem ik dat mee",
    verandering: "wacht ik een dag voordat ik reageer op het nieuws, en schrijf ik eerst op wat het met me doet",
    stap: "schrijf ik op waarom ik twijfel voordat ik iemand vraag of ik het moet doen",
    vertrek: "schrijf ik op wat ik mis en wat ik ontloop, voordat ik met iemand praat"
  },
  sturen: {
    sollicitatie: "stel ik in de eerste tien minuten zelf de vraag wat zij van de persoon op deze plek verwachten",
    proeftijd: "stuur ik aan het eind van week twee een korte mail met wat ik heb opgepakt en wat ik wil oppakken",
    functioneren: "stuur ik vooraf mijn eigen drie punten, zodat het gesprek ook over mijn richting gaat",
    verandering: "vraag ik binnen een week een gesprek aan met de nieuwe leidinggevende over wat ik wil bijdragen",
    stap: "zeg ik tegen mijn leidinggevende dat ik ervoor ga, voordat de vacature sluit",
    vertrek: "bepaal ik eerst waar ik heen wil, en pas daarna wanneer ik ga"
  },
  doen: {
    sollicitatie: "mail ik binnen een dag na het gesprek met één concreet idee dat ik al heb uitgewerkt",
    proeftijd: "kies ik op dag één drie dingen die ik in de eerste maand af heb, en meld ik elke vrijdag wat ervan staat",
    functioneren: "maak ik binnen een dag na het gesprek de afspraken concreet, met datum, en stuur ik ze",
    verandering: "pak ik dezelfde week één ding op dat in de nieuwe situatie blijft liggen",
    stap: "solliciteer ik de dag dat ik de vacature zie, niet de dag voor de sluiting",
    vertrek: "doe ik elke week één gesprek of sollicitatie, ook in de weken dat het werk druk is"
  }
};

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

/* Een ingevuld plan opschonen: twee regels, elk een moment en een actie, en
   als die er is een datum waarop het moment wordt verwacht. */
export function planOpschonen(invoer){
  const regels = Array.isArray(invoer) ? invoer : [];
  const uit = [];
  for (const r of regels){
    if (uit.length === 2) break;
    const moment = alleMomenten().find(m => m.code === r?.moment);
    const actie = String(r?.actie || "").trim().slice(0, 240);
    const dimensie = DIMENSIES.includes(r?.dimensie) ? r.dimensie : null;
    if (!moment || actie.length < 5) continue;
    const datum = DATUM.test(String(r?.datum || "")) && !Number.isNaN(Date.parse(r.datum)) ? r.datum : null;
    uit.push({ dimensie, moment: moment.code, actie, datum });
  }
  return uit.length ? uit : null;
}

/* De regels waarvoor morgen een herinnering uit moet: datum is morgen (of
   eerder, nog niet herinnerd en hoogstens een week geleden). */
export function regelsVoorHerinnering(plan, nu = new Date()){
  const dag = d => Math.floor(d / 86400000);
  const vandaag = dag(nu);
  return (plan || []).map((r, i) => ({ ...r, i })).filter(r => {
    if (!r.datum || r.herinnerd_op) return false;
    const verschil = dag(Date.parse(r.datum)) - vandaag;
    return verschil <= 1 && verschil >= -7;
  });
}

export function planAlsTekst(plan){
  return (plan || []).map(r => {
    const m = alleMomenten().find(x => x.code === r.moment);
    return `Als ${m ? m.label : r.moment} eraan komt, dan ${r.actie}`;
  });
}

/* Wat de uitslagpagina mag tonen. Gratis: score, sterkste kant, ruimte,
   nummer. Geverifieerd: daarbovenop de duiding en het plan. */
export function uitslagVoor({ rij, scan, nu = new Date() }){
  const scores = scan ? { zien: scan.zien, sturen: scan.sturen, doen: scan.doen } : null;
  const geverifieerd = rij.status === "betaald";
  const basis = {
    voornaam: String(rij.naam || "").trim().split(/\s+/)[0] || "",
    status: rij.status,
    geverifieerd,
    nummer: rij.nummer || null,
    vakgebied: rij.vakgebied || null,
    type: rij.type || "standaard",
    plus: !!rij.plus_class_gevolgd_op,
    plus_gekozen: rij.type === "plus",
    meetjaren: rij.meetjaren || [],
    jaar: nu.getFullYear(),
    betaling_status: rij.betaling_status || null,
    gemeten: !!rij.eerste_meting_op
  };
  if (!scores || !geldigeScores(scores)) return { ...basis, gemeten: false };
  const uit = {
    ...basis,
    score: scan.index_score,
    sterkste: sterksteKant(scores),
    ruimte: ruimtePunten(scores)
  };
  if (geverifieerd){
    uit.scores = scores;
    uit.duiding = scan.duiding || null;
    uit.plan = rij.plan || null;
    uit.plan_op = rij.plan_op || null;
    uit.momenten = momentenVoor(rij.werkvorm);
    uit.voorbeelden = rij.werkvorm === "loondienst" ? VOORBEELDEN_LOONDIENST : VOORBEELDEN;
    uit.uitleg = PLAN_UITLEG;
  }
  return uit;
}
