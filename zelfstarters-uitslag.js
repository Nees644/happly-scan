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

/* Een ingevuld plan opschonen: twee regels, elk een moment en een actie. */
export function planOpschonen(invoer){
  const regels = Array.isArray(invoer) ? invoer : [];
  const uit = [];
  for (const r of regels){
    if (uit.length === 2) break;
    const moment = MOMENTEN.find(m => m.code === r?.moment);
    const actie = String(r?.actie || "").trim().slice(0, 240);
    const dimensie = DIMENSIES.includes(r?.dimensie) ? r.dimensie : null;
    if (!moment || actie.length < 5) continue;
    uit.push({ dimensie, moment: moment.code, actie });
  }
  return uit.length ? uit : null;
}

export function planAlsTekst(plan){
  return (plan || []).map(r => {
    const m = MOMENTEN.find(x => x.code === r.moment);
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
    uit.momenten = MOMENTEN;
  }
  return uit;
}
