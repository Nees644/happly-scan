// volhoudkracht-duiding.js — de teksten van de uitslag, apart van de code
// zodat Maarten ze kan redigeren zonder de rekenregels te raken. Ze staan
// letterlijk in briefings/volhoudkracht-scan.md, paragraaf 5 en 6.
//
// [programma] wordt gevuld met het woord van de invuller.

import { vulWoord, DIMENSIES, BANDEN } from "./volhoudkracht-items.js";

export const BAND_TEKST = {
  start: "Uw [programma] is gebouwd op het begin: de intake, de bijeenkomsten, de energie van de start. Dat is waar het sterk in is. Daarna houdt het op, en daar verdwijnt het resultaat. Niet omdat deelnemers niet willen, maar omdat beginnen en volhouden twee verschillende processen zijn. Het eerste heeft u georganiseerd. Het tweede nog niet.",
  bedoeld: "Uw [programma] weet dat volhouden het werk is. Het staat in uw teksten en uw begeleiders doen het op gevoel. Wat ontbreekt is de inrichting: vaste stappen die elke deelnemer krijgt, ook als de begeleider het druk heeft. Volhouden dat van een persoon afhangt, valt stil zodra die persoon wegvalt.",
  georganiseerd: "Uw [programma] organiseert volhouden. Het heeft vaste stappen voor reden, plan, ritme, weerstand en contact. De vraag die overblijft is of u het ook meet: zonder cijfer weet u niet wat werkt en kunt u het niet aantonen aan wie ervoor betaalt."
};

export const SCHAKEL_TEKST = {
  R: {
    duiding: "Deelnemers beginnen met uw reden, niet met de hunne. Wie niet in eigen woorden weet waarvoor hij het doet, heeft op het moeilijke moment niets om aan vast te houden.",
    aanbod: "De Volhoudkaart als vaste stap aan het begin, waarin de deelnemer zijn waarom, zijn gedrag en zijn als-dan vastlegt, en Zetjes dat die reden letterlijk teruggeeft als het wegzakt."
  },
  P: {
    duiding: "Uw deelnemers hebben een doel maar geen gedrag. Een doel is iets voor later; gedrag is iets voor morgenochtend. Zonder als-dan-plan beslist het moeilijke moment, en dat moment kiest altijd de oude gewoonte.",
    aanbod: "De Volhoudkaart, met het gedrag zo klein dat overslaan lastiger is dan doen."
  },
  T: {
    duiding: "Het gedrag heeft geen plek in de week. Zonder vast moment en vaste cue moet de deelnemer elke dag opnieuw beslissen, en beslissen is precies wat op een slechte dag niet lukt.",
    aanbod: "Ritme en cue als stap in de Volhoudkaart, en Zetjes op het zelfgekozen moment, tot dag 66."
  },
  W: {
    duiding: "Uw [programma] rekent op motivatie en wordt verrast door weerstand. Inertia, scepsis en reactance zijn niet hetzelfde en vragen een ander antwoord. Een deelnemer die niet gelooft dat het lukt, heeft niets aan aanmoediging.",
    aanbod: "De Zelfkracht Scan bij de start, zodat u per deelnemer weet wat hem tegenhoudt, en Zetjes dat daarop is afgestemd."
  },
  C: {
    duiding: "Dit is waar bijna elk [programma] stilvalt: tussen de bijeenkomsten en na de laatste bijeenkomst. Daar gebeurt het volhouden, en daar is niemand. Niet omdat u niet wilt, maar omdat het uren kost die er niet zijn.",
    aanbod: "Volhouden inside met Zetjes: een zetje op het moeilijke moment, tot dag 66, zonder uren van uw begeleiders."
  },
  M: {
    duiding: "U weet niet wat uw [programma] oplevert na drie maanden. Dan kunt u het niet verbeteren en niet aantonen. Elke deelnemer die u niet meet, is een resultaat dat u niet kunt claimen.",
    aanbod: "Gewoontemeting onderweg en hermeting op dag 66 tot 100, met aantallen voor u en nooit inhoud van de deelnemer; later de Progress Monitor."
  }
};

export const SLOT_TEKST = "Dit is een ontwerpscore: hij zegt wat uw [programma] belooft. Wat het doet, blijkt uit de meting bij uw deelnemers. Het kennen van de zes dimensies maakt nog geen [programma] dat ze waarmaakt; organiseren is het werk. Dat is wat Happly doet: wij meten, ontwerpen, organiseren en rapporteren volhouden.";

// Alles wat de uitslagpagina en de mail nodig hebben, in het woord van de
// invuller.
export function duiding({ woord, band, zwakste }){
  const b = BANDEN.find(x => x.code === band) || BANDEN[0];
  const d = DIMENSIES.find(x => x.code === zwakste) || DIMENSIES[4];
  const s = SCHAKEL_TEKST[d.code];
  return {
    bandNaam: b.naam,
    bandKop: vulWoord(b.kop, woord),
    bandTekst: vulWoord(BAND_TEKST[b.code], woord),
    zwaksteNaam: d.naam,
    zwaksteVraag: vulWoord(d.vraag, woord),
    zwaksteTekst: vulWoord(s.duiding, woord),
    aanbod: vulWoord(s.aanbod, woord),
    slot: vulWoord(SLOT_TEKST, woord)
  };
}
