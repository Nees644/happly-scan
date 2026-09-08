// teamkracht-logica.js
// Profielbepaling, regelevaluatie en selectie van de drie dynamieken.
// Bron: briefing_code_teamkracht/briefing_code_teamkracht.md, paragraaf 4 en 5.
//
// Geen database, geen netwerk, geen AI. Alles is rekenwerk op de scores, de
// norm en de regelrijen die de aanroeper meegeeft. Daardoor draaien de tests
// zonder Supabase en gebruikt /api/teamkracht-bereken exact dezelfde code.
//
// Eén bron voor de vaste getallen; wijzig ze hier, niet verspreid.

export const VAARDIGHEDEN = ["zien", "sturen", "doen"];

// Onder deze daling in punten noemen we de keten niet gebroken (briefing 4).
export const BREUK_DREMPEL = 3;

// Vaste score voor teamregels; die gaan niet over een aantal deelnemers.
export const TEAMREGEL_SCORE = 0.5;

/* ------------------------------------------------------------------ profiel */

/* Ruwe letter per vaardigheid: H boven de middenband, L eronder, M erin. */
function ruweLetter(score, gemiddelde, sd, middenbandSd){
  const band = middenbandSd * sd;
  if (score > gemiddelde + band) return "H";
  if (score < gemiddelde - band) return "L";
  return "M";
}

/* Profielcode van één deelnemer, in de volgorde Zien, Sturen, Doen.
   Codes met één of twee M die niet MMM zijn worden afgerond naar het
   dichtstbijzijnde H/L-patroon: boven het gemiddelde H, eronder L. Precies op
   het gemiddelde telt als H; dat komt bij hele punten zelden voor en de keuze
   moet vastliggen. MMM blijft middenband. */
export function bepaalProfiel(scores, norm, middenbandSd){
  const ruw = VAARDIGHEDEN
    .map(v => ruweLetter(scores[v], norm[v], norm[`sd_${v}`], middenbandSd))
    .join("");
  if (!ruw.includes("M")) return { code: ruw, ruw, afgerond: false };
  if (ruw === "MMM")      return { code: ruw, ruw, afgerond: false };
  const code = VAARDIGHEDEN
    .map((v, i) => ruw[i] === "M" ? (scores[v] >= norm[v] ? "H" : "L") : ruw[i])
    .join("");
  return { code, ruw, afgerond: true };
}

/* Teamlijn: gemiddelde per vaardigheid, onafgerond. */
export function bepaalTeamlijn(deelnemers){
  const n = deelnemers.length;
  const uit = {};
  for (const v of VAARDIGHEDEN){
    uit[v] = n ? deelnemers.reduce((som, d) => som + d[v], 0) / n : 0;
  }
  return uit;
}

/* Waar zakt de keten? Kijk naar de verschillen met de norm en naar de plek
   waar dat verschil het sterkst daalt. Bij een gelijkspel wint de eerste
   overgang, omdat de keten daar begint. */
export function bepaalBreuk(teamlijn, norm){
  const d = Object.fromEntries(VAARDIGHEDEN.map(v => [v, teamlijn[v] - norm[v]]));
  const dalingZienSturen = d.zien - d.sturen;
  const dalingSturenDoen = d.sturen - d.doen;
  const geenDaling = dalingZienSturen < BREUK_DREMPEL && dalingSturenDoen < BREUK_DREMPEL;
  if (geenDaling){
    const allesOnderNorm = VAARDIGHEDEN.every(v => d[v] < 0);
    return allesOnderNorm ? "begin" : "geen";
  }
  return dalingZienSturen >= dalingSturenDoen ? "zien_sturen" : "sturen_doen";
}

/* Verdeling: alleen codes die voorkomen, zodat de kaart geen nullen toont. */
export function bepaalVerdeling(profielen){
  const uit = {};
  for (const p of profielen) uit[p.code] = (uit[p.code] || 0) + 1;
  return uit;
}

/* ------------------------------------------------------------------- regels */

const TOEGESTANE_SLEUTELS = new Set([
  "min", "min_een_van", "meerderheid", "geen", "min_n", "max_n",
  "breuk", "team_boven_norm"
]);

/* Een teamregel kijkt naar de teamlijn, niet naar de profielverdeling. */
export function isTeamregel(voorwaarde){
  return "breuk" in voorwaarde || "team_boven_norm" in voorwaarde;
}

/* De codes waar de regel over gaat. geen-codes tellen niet mee: daar zijn er
   per definitie nul van, dus ze voegen niets toe aan het betrokken aantal. */
export function codesInVoorwaarde(voorwaarde){
  const uit = new Set();
  for (const sleutel of ["min", "min_een_van"]){
    if (voorwaarde[sleutel]) for (const code of Object.keys(voorwaarde[sleutel])) uit.add(code);
  }
  if (Array.isArray(voorwaarde.meerderheid)) for (const code of voorwaarde.meerderheid) uit.add(code);
  return [...uit];
}

/* Validatie van een voorwaarde uit de beheerpagina. Werpt bij een onbekende
   sleutel, zodat een typefout zichtbaar wordt in plaats van stil door te gaan. */
export function controleerVoorwaarde(voorwaarde){
  if (!voorwaarde || typeof voorwaarde !== "object" || Array.isArray(voorwaarde)){
    throw new Error("voorwaarde moet een object zijn");
  }
  const sleutels = Object.keys(voorwaarde);
  if (!sleutels.length) throw new Error("voorwaarde is leeg");
  for (const sleutel of sleutels){
    if (!TOEGESTANE_SLEUTELS.has(sleutel)){
      throw new Error(`onbekende sleutel in voorwaarde: ${sleutel}`);
    }
  }
  return true;
}

/* Gaat de regel af? Alle onderdelen van de voorwaarde moeten waar zijn. */
export function voorwaardeWaar(voorwaarde, ctx){
  controleerVoorwaarde(voorwaarde);
  const aantal = code => ctx.verdeling[code] || 0;

  if (voorwaarde.min){
    for (const [code, drempel] of Object.entries(voorwaarde.min)){
      if (aantal(code) < drempel) return false;
    }
  }
  if (voorwaarde.min_een_van){
    const raak = Object.entries(voorwaarde.min_een_van).some(([code, drempel]) => aantal(code) >= drempel);
    if (!raak) return false;
  }
  if (voorwaarde.meerderheid){
    const som = voorwaarde.meerderheid.reduce((t, code) => t + aantal(code), 0);
    if (!(som > ctx.n / 2)) return false;
  }
  if (voorwaarde.geen){
    for (const code of voorwaarde.geen) if (aantal(code) > 0) return false;
  }
  if (voorwaarde.min_n !== undefined && ctx.n < voorwaarde.min_n) return false;
  if (voorwaarde.max_n !== undefined && ctx.n > voorwaarde.max_n) return false;
  if (voorwaarde.breuk !== undefined && ctx.breuk !== voorwaarde.breuk) return false;
  if (voorwaarde.team_boven_norm){
    for (const v of voorwaarde.team_boven_norm){
      if (!(ctx.teamlijn[v] > ctx.norm[v])) return false;
    }
  }
  return true;
}

/* Score van een afgegane regel: het deel van het team dat erbij betrokken is,
   plus de opslag. Teamregels gaan niet over deelnemers en krijgen een vaste
   grondscore. */
export function scoreRegel(regel, ctx){
  const opslag = Number(regel.gewicht_opslag || 0);
  if (isTeamregel(regel.voorwaarde)) return TEAMREGEL_SCORE + opslag;
  const betrokken = codesInVoorwaarde(regel.voorwaarde)
    .reduce((som, code) => som + (ctx.verdeling[code] || 0), 0);
  return (ctx.n ? betrokken / ctx.n : 0) + opslag;
}

/* De drie dynamieken op de kaart. Hoogste score wint; bij gelijke score wint
   de lagere volgorde. Staat er geen versterkende regel bij terwijl er wel een
   afging, dan vervangt de hoogste versterkende de derde. */
export function kiesDynamieken(regels, ctx, aantal = 3){
  const afgegaan = regels
    .filter(r => r.actief !== false)
    .filter(r => voorwaardeWaar(r.voorwaarde, ctx))
    .map(r => ({
      code: r.code,
      richting: r.richting,
      score: scoreRegel(r, ctx),
      volgorde: r.volgorde ?? Number.MAX_SAFE_INTEGER,
      regel: r
    }))
    .sort((a, b) => b.score - a.score || a.volgorde - b.volgorde);

  const gekozen = afgegaan.slice(0, aantal);
  if (gekozen.length === aantal && !gekozen.some(r => r.richting === "versterkt")){
    const versterkend = afgegaan.find(r => r.richting === "versterkt");
    if (versterkend) gekozen[aantal - 1] = versterkend;
  }
  return gekozen;
}

/* ----------------------------------------------------------- placeholders */

const TELWOORDEN = ["geen", "één", "twee", "drie", "vier", "vijf", "zes",
                    "zeven", "acht", "negen", "tien", "elf", "twaalf"];

export function telwoord(n){
  return n >= 0 && n < TELWOORDEN.length ? TELWOORDEN[n] : String(n);
}

/* Vult {n_HLL} en {n} met een telwoord en zet de eerste letter groot, zodat
   een kop leest als "Vier Zieners en twee Aanpakkers". */
export function vulPlaceholders(tekst, verdeling, n){
  if (!tekst) return tekst;
  const uit = tekst
    .replace(/\{n_([A-Z]{3})\}/g, (_, code) => telwoord(verdeling[code] || 0))
    .replace(/\{n\}/g, telwoord(n));
  return uit.charAt(0).toUpperCase() + uit.slice(1);
}

/* -------------------------------------------------------------- teambeeld */

/* Individuele lijnen zijn [zien, sturen, doen, afgerond]. Geen id, geen naam,
   geen volgorde die iets over de deelnemer verraadt: er wordt volledig
   gesorteerd op de drie scores, zodat de plek in de SVG onafhankelijk is van
   het moment van invullen. De vierde waarde is 1 als de profielcode is
   afgerond vanuit de middenband (briefing paragraaf 4). */
function bouwLijnen(deelnemers, profielen){
  return deelnemers
    .map((d, i) => [
      Math.round(d.zien), Math.round(d.sturen), Math.round(d.doen),
      profielen[i].afgerond ? 1 : 0
    ])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
}

const rond1 = x => Math.round(x * 10) / 10;
const rond2 = x => Math.round(x * 100) / 100;

/* Het volledige teambeeld, klaar om in teamkracht_teambeeld te zetten.
   deelnemers: [{zien, sturen, doen}, ...]
   norm:       {zien, sturen, doen, sd_zien, sd_sturen, sd_doen}
   config:     rij uit teamkracht_config
   regels:     rijen uit teamkracht_regels, voorwaarde al als object */
export function bouwTeambeeld({ deelnemers, norm, config, regels, profielen = [], soort = "start" }){
  const n = deelnemers.length;
  if (!n) throw new Error("geen deelnemers");

  const middenbandSd = Number(config.middenband_sd ?? 0.25);
  const minLijnen    = Number(config.min_deelnemers_lijnen ?? 10);

  const deelnemerprofielen = deelnemers.map(d => bepaalProfiel(d, norm, middenbandSd));
  const verdeling = bepaalVerdeling(deelnemerprofielen);
  const teamlijn  = bepaalTeamlijn(deelnemers);
  const breuk     = bepaalBreuk(teamlijn, norm);

  const ctx = { verdeling, n, breuk, teamlijn, norm };
  const gekozen = kiesDynamieken(regels, ctx);
  const dynamieken = gekozen.map(d => ({ code: d.code, score: rond2(d.score) }));

  /* De teksten zoals ze nu zijn, bevroren bij het beeld. Zonder dit zou een
     latere wijziging in de beheerpagina ook kaarten veranderen die al bij een
     team op tafel liggen, en dan klopt niet meer wat dat team heeft gezien.
     Alleen wat op deze kaart komt: de drie regels en de profielen die in de
     verdeling voorkomen. */
  const teksten = {
    regels: Object.fromEntries(gekozen.map(d => {
      const r = d.regel;
      return [r.code, {
        titel: r.titel, titel_geteld: r.titel_geteld ?? null, richting: r.richting,
        dynamiek: r.dynamiek, interventie: r.interventie, gespreksvraag: r.gespreksvraag
      }];
    })),
    profielen: Object.fromEntries(Object.keys(verdeling).map(code => {
      const p = profielen.find(x => x.code === code);   // de bibliotheek, niet de deelnemers
      return [code, p ? p.naam : code];
    }))
  };

  return {
    soort,
    n,
    team_zien:   rond1(teamlijn.zien),
    team_sturen: rond1(teamlijn.sturen),
    team_doen:   rond1(teamlijn.doen),
    norm_zien:   norm.zien,
    norm_sturen: norm.sturen,
    norm_doen:   norm.doen,
    verdeling,
    breuk,
    dynamieken,
    teksten,
    lijnen: n >= minLijnen ? bouwLijnen(deelnemers, deelnemerprofielen) : null,
    config_snapshot: {
      middenband_sd: middenbandSd,
      min_deelnemers_lijnen: minLijnen,
      norm_bron: config.norm_bron ?? "vast",
      // Waar de norm op rustte toen dit beeld werd berekend. Hoort erbij: een
      // norm zonder aantal is een getal zonder gewicht.
      norm_n: config.norm_n ?? null,
      norm_gemeten_op: config.norm_gemeten_op ?? null,
      norm_versie: config.norm_versie ?? null
    },
    // Niet voor opslag: de aanroeper heeft de codes nodig om profiel_code per
    // deelnemer weg te schrijven. Zit bewust niet in teamkracht_teambeeld.
    profielen: deelnemerprofielen
  };
}

/* ------------------------------------------------------------- doelbeeld */

/* De gevraagde verschuiving per vaardigheid, omgerekend naar punten per jaar,
   zodat een doel over zes maanden en een doel over twee jaar met dezelfde
   meetlat worden beoordeeld. */
export function verschuiving(teambeeld, doel, horizonMaanden = 12){
  const jaren = Math.max(horizonMaanden, 1) / 12;
  const uit = {};
  for (const v of VAARDIGHEDEN){
    const punten = doel[v] - teambeeld[`team_${v}`];
    uit[v] = { punten: Math.round(punten * 10) / 10, per_jaar: Math.round((punten / jaren) * 10) / 10 };
  }
  return uit;
}

/* Beoordeelt een doel tegen teamkracht_doelregels. De regels kijken naar de
   sterkst gevraagde stijging per jaar; die bepaalt de band. Een daling telt
   niet mee als ambitie, maar wordt wel apart gemeld. */
export function beoordeelDoel(teambeeld, doel, doelregels, horizonMaanden = 12){
  const delta = verschuiving(teambeeld, doel, horizonMaanden);
  const stijgingen = VAARDIGHEDEN.map(v => delta[v].per_jaar);
  const zwaarste = Math.max(...stijgingen, 0);
  // Alleen een echte daling melden. De teamlijn is onafgerond en het doel staat
  // in hele punten, dus een verschil van een paar tienden is afronding, geen
  // keuze van de coach.
  const dalers = VAARDIGHEDEN.filter(v => delta[v].punten <= -1);

  const passend = (doelregels || [])
    .filter(r => r.actief !== false)
    .filter(r => {
      const w = r.voorwaarde || {};
      if (w.min_stijging !== undefined && !(zwaarste >= w.min_stijging)) return false;
      if (w.max_stijging !== undefined && !(zwaarste < w.max_stijging)) return false;
      return true;
    })
    .sort((a, b) => (b.volgorde ?? 0) - (a.volgorde ?? 0));

  const regel = passend[0] || null;
  return {
    verschuiving: delta,
    zwaarste_per_jaar: Math.round(zwaarste * 10) / 10,
    horizon_maanden: horizonMaanden,
    code: regel?.code ?? null,
    titel: regel?.titel ?? null,
    oordeel: regel?.oordeel ?? null,
    melding: regel?.melding ?? null,
    dalingen: dalers
  };
}
