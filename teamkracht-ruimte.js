// teamkracht-ruimte.js
// Leesregels L1 tot en met L6 uit briefing/teamkracht/briefing_code_doel_ruimte_v1.md:
// het doel van de klant bepaalt hoe de scores worden gelezen, nooit wat de
// scores zijn. Alles hier is rekenwerk op scores, norm en profielcodes die de
// aanroeper meegeeft; geen database, geen netwerk, geen taalmodel. Daardoor
// draaien de tests zonder Supabase en gebruikt de serverroute exact dezelfde
// code als de test.
//
// Wat hier NIET gebeurt: index, dimensiescores, profielen, teamlijn, breuk en
// de regels R1 tot en met R13 worden hier niet aangeraakt. Die komen uit
// teamkracht-logica.js en blijven zoals ze zijn.
//
// Drempels staan in teamkracht-leesregels-config.js, niet hier.

import { LEESREGELS_CONFIG } from "./teamkracht-leesregels-config.js";

/* De keten, in deze volgorde: Zien gaat voor Sturen, Sturen gaat voor Doen. */
export const KETEN = ["zien", "sturen", "doen"];
export const LABEL = { zien: "Zien", sturen: "Sturen", doen: "Doen" };

export const DOELTYPEN = ["zien", "sturen", "doen", "onbekend"];

/* De termijn van het doel (besluit 17 september 2026: een datum die de klant
   zelf invult, geen vaste tien weken). Uit het formulier komt jjjj-mm-dd; het
   moet een echte dag zijn, anders null. */
export function doelDatum(waarde){
  const t = String(waarde ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T00:00:00Z`);
  return (Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === t) ? t : null;
}

/* ------------------------------------------------------------------- L1 */

/* De keuzezinnen, letterlijk uit de briefing en in deze volgorde. De klant
   kiest er zelf een; er is geen classificatie op de vrije tekst. */
export const KEUZEZINNEN_TEAM = Object.freeze([
  { doeltype: "zien",     zin: "Dat we hetzelfde beeld hebben van wat er speelt en wat er moet gebeuren" },
  { doeltype: "sturen",   zin: "Dat we knopen doorhakken en verantwoordelijkheid nemen" },
  { doeltype: "doen",     zin: "Dat we afmaken wat we afspreken" },
  { doeltype: "onbekend", zin: "Weet ik nog niet" }
]);

export const KEUZEZINNEN_INDIVIDU = Object.freeze([
  { doeltype: "zien",     zin: "Dat ik scherp heb wat er speelt en wat er moet gebeuren" },
  { doeltype: "sturen",   zin: "Dat ik knopen doorhak en verantwoordelijkheid neem" },
  { doeltype: "doen",     zin: "Dat ik afmaak wat ik me voorneem" },
  { doeltype: "onbekend", zin: "Weet ik nog niet" }
]);

export function keuzezin(doeltype, vorm = "team"){
  const lijst = vorm === "individu" ? KEUZEZINNEN_INDIVIDU : KEUZEZINNEN_TEAM;
  return (lijst.find(k => k.doeltype === doeltype) || {}).zin ?? null;
}

/* Een voorbeeld van een doel, per dimensie. Komt lichtgrijs in het lege
   tekstvak te staan, zodat "waar moet dit team staan" geen leeg vel is. Het
   is een voorbeeld en geen invulling: een placeholder wordt nooit verstuurd,
   en het doeltype kiest de klant nog steeds zelf met de keuzezinnen. Zo blijft
   regel L1 overeind: er is geen classificatie op de vrije tekst.

   Elke zin is een doel zoals het bedoeld is: gedrag dat je kunt zien, in de
   woorden van een team, met een moment erin. */
export const VOORBEELDDOEL = Object.freeze({
  zien:   "Bijvoorbeeld: over drie maanden benoemen we in elk overleg wat er speelt, voordat het een probleem is.",
  sturen: "Bijvoorbeeld: over drie maanden heeft elk besluit in ons overleg een eigenaar en een datum.",
  doen:   "Bijvoorbeeld: over drie maanden ronden we af wat we afspreken, zonder dat iemand erachteraan hoeft."
});

/* Welk voorbeeld past bij deze meting: dat van de dimensie met de meeste
   ruimte, volgens dezelfde fallback als de leesregels. Zonder bruikbare scores
   het voorbeeld van Sturen; daar zit volgens het onderzoek meestal de ruimte. */
export function voorbeelddoel(scores){
  const bruikbaar = scores && KETEN.every(d => Number.isFinite(Number(scores[d])));
  return VOORBEELDDOEL[bruikbaar ? ketenFallback(scores) : "sturen"];
}

/* Fallback bij onbekend of zonder doel: de laagste dimensiescore in de
   volgorde Zien, Sturen, Doen. Bij gelijke stand wint de vroegste in de keten;
   daarom een strikte vergelijking en de keten van voor naar achter. */
export function ketenFallback(scores){
  let laagste = KETEN[0];
  for (const d of KETEN.slice(1)){
    if (Number(scores[d]) < Number(scores[laagste])) laagste = d;
  }
  return laagste;
}

/* Welke dimensie leidend is en waar dat vandaan komt. */
export function bepaalLeidendeDimensie({ doeltype, scores }){
  if (doeltype === "zien" || doeltype === "sturen" || doeltype === "doen"){
    return { leidende_dimensie: doeltype, doeltype_bron: "klant" };
  }
  return { leidende_dimensie: ketenFallback(scores), doeltype_bron: "keten" };
}

/* ------------------------------------------------------------------- L2 */

/* Een dimensie eerder in de keten die minstens KETEN_DREMPEL punten lager
   scoort dan de leidende dimensie wordt de eerste stap. Bij twee die voldoen
   wint de vroegste in de keten, dus de keten wordt van voor naar achter
   doorlopen en de eerste treffer telt. */
export function ketencheck(leidende, scores, config = LEESREGELS_CONFIG){
  const plek = KETEN.indexOf(leidende);
  for (const d of KETEN.slice(0, plek)){
    if (Number(scores[leidende]) - Number(scores[d]) >= config.keten_drempel){
      return { eerste_stap_dimensie: d, ketencheck_actief: true };
    }
  }
  return { eerste_stap_dimensie: leidende, ketencheck_actief: false };
}

/* ------------------------------------------------------------------- L3 */

/* De grens van de bovenste helft van het landelijk beeld voor één dimensie.
   Zie de toelichting bij LANDELIJK_BOVENSTE_HELFT_SD in de config. */
export function landelijkBovensteHelft(dimensie, norm, config = LEESREGELS_CONFIG){
  if (!norm) return null;
  const m = Number(norm[dimensie]);
  const sd = Number(norm[`sd_${dimensie}`]);
  if (!Number.isFinite(m)) return null;
  const k = Number(config.landelijk_bovenste_helft_sd || 0);
  return Number.isFinite(sd) ? m + k * sd : m;
}

/* De referentie voor één dimensie: de hoogste van de eigen sterkste dimensie
   en de landelijke grens. Zonder landelijk beeld (LOS zonder licentie, of een
   norm die ontbreekt) alleen de eigen sterkste. */
export function referentieVoor(dimensie, { scores, norm, landelijk_beeld = true, config = LEESREGELS_CONFIG }){
  const eigen = Math.max(...KETEN.map(d => Number(scores[d])));
  const landelijk = landelijk_beeld ? landelijkBovensteHelft(dimensie, norm, config) : null;
  if (landelijk !== null && landelijk > eigen){
    return { referentie_type: "landelijk_bovenste_helft", referentie_waarde: landelijk };
  }
  return { referentie_type: "eigen_sterkste", referentie_waarde: eigen };
}

const rond1 = x => Math.round(x * 10) / 10;

/* De ruimte per dimensie, met de referentie erbij. Ruimte onder
   OP_ORDE_DREMPEL heet op orde. */
export function ruimtePerDimensie(opties){
  const config = opties.config || LEESREGELS_CONFIG;
  const uit = {};
  for (const d of KETEN){
    const ref = referentieVoor(d, opties);
    const huidig = Number(opties.scores[d]);
    const ruimte = Math.max(0, ref.referentie_waarde - huidig);
    uit[d] = {
      ...ref,
      huidige_waarde: rond1(huidig),
      ruimte_punten: rond1(ruimte),
      op_orde: ruimte < config.op_orde_drempel
    };
  }
  return uit;
}

/* De volgende dimensie in de keten die niet op orde is, gerekend vanaf de
   dimensie na `vanaf`, met een sprong terug naar het begin van de keten. Geen
   gevonden: null. */
function volgendeNietOpOrde(vanaf, per){
  const start = KETEN.indexOf(vanaf);
  for (let i = 1; i <= KETEN.length; i++){
    const d = KETEN[(start + i) % KETEN.length];
    if (!per[d].op_orde) return d;
  }
  return null;
}

/* ------------------------------------------------------------ de lezing */

/* L1 tot en met L3 in één keer, in de vorm van een rij voor teamkracht_ruimte
   (zonder id, meting_id en niveau: die kent alleen de aanroeper).

   scores:          {zien, sturen, doen} van deze meting (teamlijn of persoon)
   norm:            {zien, sturen, doen, sd_zien, sd_sturen, sd_doen}, bevroren
   landelijk_beeld: false bij een kaart zonder landelijk beeld
   niveau:          "team" of "individu". In de individuele uitslag staat geen
                    vergelijking met anderen (taalregels.md, besluit Maarten
                    17 september 2026): daar is de referentie altijd de eigen
                    sterkste dimensie, wat landelijk_beeld ook zegt.
   doeltype:        zien, sturen, doen, onbekend of null */
export function bepaalRuimte({ doeltype = null, scores, norm = null, landelijk_beeld = true, niveau = "team", config = LEESREGELS_CONFIG }){
  for (const d of KETEN){
    if (!Number.isFinite(Number(scores?.[d]))) throw new Error(`score voor ${d} ontbreekt`);
  }
  if (niveau === "individu") landelijk_beeld = false;

  const { leidende_dimensie, doeltype_bron } = bepaalLeidendeDimensie({ doeltype, scores });
  const keten = ketencheck(leidende_dimensie, scores, config);
  const per = ruimtePerDimensie({ scores, norm, landelijk_beeld, config });

  const op_orde_dimensies = KETEN.filter(d => per[d].op_orde);

  // De lezing begint bij de eerste stap uit L2. Staat die al op orde, dan
  // schuift zij door naar de volgende dimensie in de keten die dat niet is.
  let eerste_stap = keten.eerste_stap_dimensie;
  let status = "ruimte";
  if (per[eerste_stap].op_orde){
    const volgende = volgendeNietOpOrde(eerste_stap, per);
    if (volgende === null){
      // Alle drie op orde: de lezing blijft bij de leidende dimensie.
      eerste_stap = leidende_dimensie;
      status = "op_orde";
    } else {
      eerste_stap = volgende;
    }
  }

  // De ketencheck-zin zegt dat de eerste stap aan de leidende dimensie
  // voorafgaat. Dat is alleen waar als de eerste stap eerder in de keten
  // staat; na een verschuiving door L3 hoeft dat niet meer zo te zijn.
  const ketencheck_actief = KETEN.indexOf(eerste_stap) < KETEN.indexOf(leidende_dimensie);

  const gekozen = per[eerste_stap];
  return {
    doeltype: doeltype || "onbekend",
    doeltype_bron,
    leidende_dimensie,
    eerste_stap_dimensie: eerste_stap,
    ketencheck_actief,
    referentie_type: gekozen.referentie_type,
    referentie_waarde: rond1(gekozen.referentie_waarde),
    huidige_waarde: gekozen.huidige_waarde,
    ruimte_punten: status === "op_orde" ? 0 : gekozen.ruimte_punten,
    status,
    op_orde_dimensies,
    per_dimensie: per,
    regelversie: config.regelversie,
    config_snapshot: { ...config, niveau, landelijk_beeld: !!landelijk_beeld }
  };
}

/* ------------------------------------------------------------------- L4 */

/* De koppeling tussen dimensie en profiel, afgeleid uit de profielcode en niet
   uit een handmatige lijst. Een code is drie letters in de volgorde Zien,
   Sturen, Doen: H is hoog, L is laag, MMM is de middenband.

     Draagprofielen van een dimensie:     alle profielen met een H op die plek
     Bewegingsprofielen van een dimensie: alle profielen met een L op die plek,
                                          plus de middenband

   Uitkomst op de seed van 07-09-2026 (teamkracht_profielen), ter controle
   tegen teamkracht_model_v4_keten.md, paragraaf 3:

     dimensie | dragen nu al                              | geven de meeste beweging
     ---------|-------------------------------------------|--------------------------------------------------------
     Zien     | Trekker, Ziener, Beslisser, Meewerker     | Aanpakker, Uitvoerder, Afbakener, Afwachter, Middenband
     Sturen   | Trekker, Beslisser, Aanpakker, Afbakener  | Ziener, Meewerker, Uitvoerder, Afwachter, Middenband
     Doen     | Trekker, Meewerker, Aanpakker, Uitvoerder | Ziener, Beslisser, Afbakener, Afwachter, Middenband

   De test in test/doel-ruimte.test.js drukt dezelfde tabel af vanuit de seed. */
export function profielkoppeling(profielen){
  const rijen = (profielen || []).filter(p => /^[HLM]{3}$/.test(p.code));
  const uit = {};
  KETEN.forEach((d, i) => {
    const draag = rijen.filter(p => p.code[i] === "H");
    const beweging = rijen.filter(p => p.code[i] === "L" || p.code === "MMM");
    uit[d] = {
      draag_codes: draag.map(p => p.code),
      draag_namen: draag.map(p => p.naam),
      beweging_codes: beweging.map(p => p.code),
      beweging_namen: beweging.map(p => p.naam)
    };
  });
  return uit;
}

/* Hoeveel teamleden in een groep zitten. verdeling is {"HLL": 4, ...}. Alleen
   aantallen, nooit wie. */
export function telProfielen(verdeling, codes){
  return (codes || []).reduce((som, code) => som + (verdeling?.[code] || 0), 0);
}

/* De namen die in dit team voorkomen binnen een groep, in de volgorde van de
   koppeling. Voor de regel "Dragen Sturen nu al: 3 teamleden (Beslisser,
   Trekker)". */
export function namenInTeam(verdeling, codes, namen){
  return codes.map((code, i) => (verdeling?.[code] || 0) > 0 ? namen[i] : null).filter(Boolean);
}

/* De anonieme verdeling van individuele ruimte op de eerste stap: hoeveel
   teamleden op of boven de referentie zitten en hoeveel eronder. Pas vanaf
   MIN_DEELNEMERS_INDIVIDUELE_VERDELING, anders null. Geen waarden per
   persoon. */
export function verdelingIndividueleRuimte({ deelnemers, dimensie, referentie_waarde, config = LEESREGELS_CONFIG }){
  const n = (deelnemers || []).length;
  if (n < config.min_deelnemers_individuele_verdeling) return null;
  let op_of_boven = 0;
  for (const d of deelnemers) if (Number(d[dimensie]) >= referentie_waarde) op_of_boven++;
  return { op_of_boven, eronder: n - op_of_boven };
}

/* ------------------------------------------------------------------- L6 */

/* Op de kaart heet de referentielijn het gemiddelde, niet het landelijk beeld
   (taalregels.md, besluit Maarten 17 september 2026). De briefing schrijft
   "de bovenste helft van het landelijk beeld"; hier staat de variant met
   gemiddelde. In de individuele uitslag komt de landelijke variant nooit voor,
   want daar is de referentie altijd de eigen sterkste dimensie. */
const REFERENTIE_OMSCHRIJVING = {
  team: {
    eigen_sterkste: "jullie eigen sterkste dimensie",
    landelijk_bovenste_helft: "de bovenste helft van het gemiddelde"
  },
  individu: {
    eigen_sterkste: "je eigen sterkste dimensie",
    landelijk_bovenste_helft: "je eigen sterkste dimensie"
  }
};

/* Het doel zoals het in zin 1 komt: de tekst van de klant, zonder punt aan het
   eind en zonder hoofdletter aan het begin, zodat hij midden in de zin past.
   Verkorten tot de kern doet de software niet; dat is woordkeus en die is
   voor de verwoording binnen het frame. */
function doelInZin(doel_tekst){
  const t = String(doel_tekst || "").trim().replace(/[.!?]+$/, "");
  if (!t) return null;
  return t.charAt(0).toLowerCase() + t.slice(1);
}

/* Punten in de zin: hele punten, want een tiende punt zegt niets over een
   eerste stap. */
const puntenWoord = p => `${Math.round(p)} punten`;

/* De drie vaste zinnen van L6, in deze volgorde. De software vult ze; een
   taalmodel mag daarna alleen woordkeus en ritme aanpassen, nooit inhoud,
   volgorde, cijfers of dimensienamen.

   vorm: "team" (jullie) of "individu" (je). */
export function vulZinnen(ruimte, { doel_tekst = null, vorm = "team" } = {}){
  const L = LABEL;
  const lei = L[ruimte.leidende_dimensie];
  const es  = L[ruimte.eerste_stap_dimensie];
  const doel = doelInZin(doel_tekst);

  // Zin 1: wat bepalend is.
  // PLACEHOLDER (harde regel 9): de briefing geeft geen zin 1 voor een meting
  // zonder doel_tekst (keten-fallback). Tot Maarten die formulering geeft
  // staat hier een neutrale variant zonder doel.
  let zin1;
  if (doel){
    zin1 = ruimte.ketencheck_actief
      ? `Voor ${doel} is ${lei} bepalend. ${es} gaat eraan vooraf, daar begint de ruimte.`
      : `Voor ${doel} is ${lei} bepalend.`;
  } else {
    zin1 = ruimte.ketencheck_actief
      ? `De kaart leest via de keten: ${lei} is bepalend. ${es} gaat eraan vooraf, daar begint de ruimte.`
      : `De kaart leest via de keten: ${lei} is bepalend.`;
  }

  // Zin 2: waar de ruimte zit.
  let zin2;
  if (ruimte.status === "op_orde"){
    zin2 = `${lei} staat op orde. De ruimte zit nu in het vasthouden en in het doel zelf scherper maken.`;
  } else {
    const ref = REFERENTIE_OMSCHRIJVING[vorm === "individu" ? "individu" : "team"][ruimte.referentie_type];
    zin2 = `De grootste ruimte zit in ${es}: ${puntenWoord(ruimte.ruimte_punten)} tot ${ref}.`;
  }

  // Zin 3: wat al op orde is.
  let zin3;
  const opOrde = (ruimte.op_orde_dimensies || []).map(d => L[d]);
  if (opOrde.length){
    zin3 = vorm === "individu"
      ? `In ${opOrde.join(", ")} laat je al zien hoe het eruitziet als het loopt.`
      : `In ${opOrde.join(", ")} laten jullie al zien hoe het eruitziet als het loopt.`;
  } else {
    zin3 = `De eerste stap is klein: ${es} een paar punten omhoog, de rest volgt in de keten.`;
  }

  return [zin1, zin2, zin3];
}

/* ------------------------------------------------------------------- L5 */

export const LABEL_GEDEELD_DOEL   = "Gedeeld beeld over wat nodig is";
export const LABEL_VERSCHIL_DOEL  = "Verschil in beeld over wat nodig is";

/* De leider koos hetzelfde doeltype als het team, of niet. Zonder een van
   beide is er geen label. */
export function vergelijkDoeltype(teamDoeltype, leiderDoeltype){
  if (!teamDoeltype || !leiderDoeltype) return null;
  const gelijk = teamDoeltype === leiderDoeltype;
  return {
    gelijk,
    label: gelijk ? LABEL_GEDEELD_DOEL : LABEL_VERSCHIL_DOEL,
    team_zin: keuzezin(teamDoeltype, "team"),
    leider_zin: keuzezin(leiderDoeltype, "team")
  };
}

/* ------------------------------------------------------------------- L7 */

/* De drie dynamieken op de kaart, met de dynamiek die de eerste stap raakt
   bovenaan. De selectie zelf verandert niet; alleen de volgorde. Een regel
   raakt een dimensie als een van zijn profielcodes die dimensie als laag of
   hoog aanmerkt, of als het een teamregel op de breuk rond die dimensie is. */
export function sorteerDynamieken(dynamieken, regels, eerste_stap){
  const i = KETEN.indexOf(eerste_stap);
  const raakt = code => {
    const r = (regels || []).find(x => x.code === code);
    if (!r || !r.voorwaarde) return false;
    const w = r.voorwaarde;
    const codes = [
      ...Object.keys(w.min || {}), ...Object.keys(w.min_een_van || {}),
      ...(Array.isArray(w.meerderheid) ? w.meerderheid : [])
    ];
    if (codes.some(c => /^[HLM]{3}$/.test(c) && c[i] !== "M")) return true;
    if (typeof w.breuk === "string" && w.breuk.split("_").includes(eerste_stap)) return true;
    return false;
  };
  return [...(dynamieken || [])]
    .map((d, idx) => ({ d, idx, raakt: raakt(d.code) ? 0 : 1 }))
    .sort((a, b) => a.raakt - b.raakt || a.idx - b.idx)
    .map(x => x.d);
}
