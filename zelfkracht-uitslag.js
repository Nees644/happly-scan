// zelfkracht-uitslag.js
// De gedeelde onderdelen van de uitslag-blauwdruk: de niveaubanden, de
// rekenregel voor de ontwikkelruimte, de vaste teksten, en de splitsing van de
// gegenereerde duiding in een duidingdeel en een routedeel.
//
// Deze stonden drie keer los in de code (scan.html, api/duiding.js en
// api/lead.js) met overal de opmerking "wijzig ze samen". Voor de serverside
// code is dit nu de ene bron; scan.html en api/duiding.js houden hun eigen
// kopie, want die eerste is geen module en de tweede zit in een promptregel.

export function niveau(s){
  if (s < 30) return "Laag";
  if (s < 50) return "Beperkt";
  if (s < 70) return "Redelijk";
  if (s < 90) return "Sterk";
  return "Zeer sterk";
}

/* Adviesregel (vastgesteld door Maarten, 07-09-2026, vervangt de regel van
   23-07-2026): het advies is de eerstvolgende stap, dus het aantal punten tot
   het volgende niveau. Klein en haalbaar in plaats van een berg, en het is
   dezelfde maat waarin de coach in de sessie naar het ambitieniveau vraagt.
   Wie al op Zeer sterk staat krijgt geen advies maar onderhouden. */
const NIVEAUGRENZEN = [[30, "Beperkt"], [50, "Redelijk"], [70, "Sterk"], [90, "Zeer sterk"]];

export function ontwikkelruimte(s){
  const volgende = NIVEAUGRENZEN.find(([grens]) => s < grens);
  if (!volgende) return { onderhoud: true, plus: null, doel: null, niveau: null };
  return { onderhoud: false, plus: volgende[0] - s, doel: volgende[0], niveau: volgende[1] };
}

export const PATROON = "Het verlies van regie ontstaat niet in één moment. Het ontstaat in honderden micro-beslissingen per dag, waarbij je kleine keuzes bij anderen laat of laat afhangen van de omstandigheden. Dat voelt in het moment als de gemakkelijkste weg. Maar wat je vaak genoeg doet, wordt automatisch, en wat automatisch is, zie je niet meer.";

/* Deze zin is per 07-09-2026 uit de uitslag gehaald en wordt niet meer getoond.
   Hij staat hier alleen nog om hem weg te knippen uit duidingen die eerder zijn
   gegenereerd en in de database staan; die teksten worden niet herschreven. */
export const OUDE_SLOTZIN = "Over een jaar meet je opnieuw. Dan is dit getal geen oordeel meer, maar je nulpunt.";

/* De vaste zin onder het profiel in de eigen uitslag (briefing paragraaf 7). */
export const PATROON_VOORBEHOUD = "Een patroon beschrijft wat je nu doet in deze context, niet wie je bent. Bij de hermeting zie je wat er is verschoven.";

/* De duiding komt als lopende tekst met koppen. De kop "Wat opvalt in jouw
   antwoorden" verdwijnt, want de pagina zet er zelf al een kop boven, en
   "Waar het werk zit" is de scheiding tussen de duiding en de route.
   Ruim gematcht: [#*]-opmaak en een verhaspelde uitloop komen in de praktijk
   voor. Identiek aan scan.html; wijzig ze samen. */
const KOP_DUIDING = /(^|\n)[ \t]*[#*]*[ \t]*Wat opvalt in jouw antwoorden[^\n]*(\n|$)/i;

export function splitDuiding(text){
  const marker = /(^|\n)[ \t]*[#*]*[ \t]*Waar het werk zit[^\n]*(\n|$)/i;
  const zonderSlotzin = t => t.replace(OUDE_SLOTZIN, "").trim();
  const m = text.match(marker);
  if (m){
    return { duiding: zonderSlotzin(text.slice(0, m.index).replace(KOP_DUIDING, "$1")),
             route:   zonderSlotzin(text.slice(m.index + m[0].length)) };
  }
  return { duiding: zonderSlotzin(text.replace(KOP_DUIDING, "$1")), route: null };
}
