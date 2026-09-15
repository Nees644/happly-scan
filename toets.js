// toets.js — de regels van de toets, zonder database.
//
// Twintig vragen uit een pool van veertig, zestien goed om te slagen, en
// hoogstens drie pogingen per dertig dagen. Die getallen staan in
// briefings/certificering.md en staan hier op een plek, zodat ze niet in drie
// bestanden uit elkaar kunnen lopen.
//
// Het nakijken gebeurt op de server en nergens anders. De browser krijgt de
// vragen zonder het juiste antwoord; wie de netwerkverkeer meeleest, vindt er
// niets in.

export const AANTAL_VRAGEN = 20;
export const LAT = 16;
export const MAX_POGINGEN = 3;
export const VENSTER_DAGEN = 30;

// Een begonnen poging die niet is afgerond blijft zo lang geldig. Daarna telt
// hij als verbruikt. Zonder die grens kan iemand een poging openen, de vragen
// bekijken, en morgen met de antwoorden terugkomen.
export const POGING_GELDIG_UREN = 2;

export function venstergrens(nu = new Date()){
  return new Date(nu.getTime() - VENSTER_DAGEN * 86400000);
}

/* Mag deze gebruiker nu aan een poging beginnen? pogingen zijn de rijen uit
   toets_pogingen van deze gebruiker, nieuwste eerst. */
export function magStarten(pogingen = [], nu = new Date()){
  const grens = venstergrens(nu);
  const binnenVenster = pogingen.filter(p => new Date(p.gestart_op) >= grens);

  if (pogingen.some(p => p.geslaagd === true)){
    return { mag: false, reden: "geslaagd", tekst: "Je hebt de toets al gehaald." };
  }

  // Een poging die nog loopt hervat je; die telt niet als een nieuwe.
  const lopend = openPoging(pogingen, nu);
  if (lopend) return { mag: true, reden: "hervatten", poging: lopend };

  if (binnenVenster.length >= MAX_POGINGEN){
    const oudste = binnenVenster[binnenVenster.length - 1];
    const weer = new Date(new Date(oudste.gestart_op).getTime() + VENSTER_DAGEN * 86400000);
    return {
      mag: false, reden: "te veel pogingen", vanaf: weer,
      tekst: `Je hebt ${MAX_POGINGEN} pogingen gedaan in dertig dagen. Je kunt het weer proberen vanaf ${weer.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}.`
    };
  }

  return { mag: true, reden: "nieuw", over: MAX_POGINGEN - binnenVenster.length };
}

/* De poging die nog loopt: begonnen, niet afgerond, en nog niet verlopen. */
export function openPoging(pogingen = [], nu = new Date()){
  const grens = nu.getTime() - POGING_GELDIG_UREN * 3600000;
  return pogingen.find(p => !p.afgerond_op && new Date(p.gestart_op).getTime() >= grens) || null;
}

/* Twintig vragen trekken uit de pool. Eerlijk verdeeld over de hoofdstukken,
   want twintig vragen die toevallig allemaal uit hoofdstuk vier komen, toetsen
   hoofdstuk vier en niet de module.

   willekeurig is meegegeven zodat een test hem vast kan zetten. */
export function trekVragen(pool = [], aantal = AANTAL_VRAGEN, willekeurig = Math.random){
  const actief = pool.filter(v => v.actief !== false);
  if (actief.length <= aantal) return husselen(actief, willekeurig);

  const perHoofdstuk = new Map();
  for (const vraag of actief){
    const h = vraag.hoofdstuk;
    if (!perHoofdstuk.has(h)) perHoofdstuk.set(h, []);
    perHoofdstuk.get(h).push(vraag);
  }
  for (const [h, lijst] of perHoofdstuk) perHoofdstuk.set(h, husselen(lijst, willekeurig));

  // Om de beurt een vraag uit elk hoofdstuk, tot er twintig zijn. Zo is het
  // verschil tussen het hoofdstuk met de meeste en de minste vragen hoogstens
  // een.
  const hoofdstukken = [...perHoofdstuk.keys()].sort((a, b) => a - b);
  const uit = [];
  let ronde = 0;
  while (uit.length < aantal){
    let gepakt = false;
    for (const h of hoofdstukken){
      const lijst = perHoofdstuk.get(h);
      if (ronde < lijst.length){
        uit.push(lijst[ronde]);
        gepakt = true;
        if (uit.length === aantal) break;
      }
    }
    if (!gepakt) break;
    ronde++;
  }
  return husselen(uit, willekeurig);
}

export function husselen(lijst, willekeurig = Math.random){
  const uit = [...lijst];
  for (let i = uit.length - 1; i > 0; i--){
    const j = Math.floor(willekeurig() * (i + 1));
    [uit[i], uit[j]] = [uit[j], uit[i]];
  }
  return uit;
}

/* De vraag zoals de browser hem krijgt: zonder het juiste antwoord. */
export function zonderAntwoord(vraag){
  return { id: vraag.id, vraag: vraag.vraag, opties: vraag.opties, hoofdstuk: vraag.hoofdstuk };
}

/* Nakijken. gegeven is {vraag_id: gekozen index}. Een vraag die niet is
   beantwoord telt als fout; er wordt niet geraden namens de kandidaat. */
export function nakijken(vragen = [], gegeven = {}){
  const antwoorden = vragen.map(v => {
    const gekozen = Number.isInteger(gegeven[v.id]) ? gegeven[v.id] : null;
    return { vraag_id: v.id, hoofdstuk: v.hoofdstuk, gekozen, goed: gekozen === v.juist };
  });
  const score = antwoorden.filter(a => a.goed).length;

  // Per hoofdstuk, zodat iemand die zakt weet waar hij terug moet lezen.
  const perHoofdstuk = {};
  for (const a of antwoorden){
    if (!perHoofdstuk[a.hoofdstuk]) perHoofdstuk[a.hoofdstuk] = { goed: 0, totaal: 0 };
    perHoofdstuk[a.hoofdstuk].totaal++;
    if (a.goed) perHoofdstuk[a.hoofdstuk].goed++;
  }

  return { score, totaal: vragen.length, geslaagd: score >= LAT, antwoorden, perHoofdstuk };
}

/* Waar iemand die zakt het beste terug kan lezen: de hoofdstukken waar hij de
   meeste vragen miste. Nooit meer dan twee, anders is het geen advies. */
export function leesadvies(perHoofdstuk = {}){
  return Object.entries(perHoofdstuk)
    .map(([h, r]) => ({ hoofdstuk: Number(h), gemist: r.totaal - r.goed }))
    .filter(r => r.gemist > 0)
    .sort((a, b) => b.gemist - a.gemist || a.hoofdstuk - b.hoofdstuk)
    .slice(0, 2)
    .map(r => r.hoofdstuk);
}
