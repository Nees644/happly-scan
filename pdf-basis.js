// pdf-basis.js — het gereedschap dat beide pdf's delen.
//
// Er komt geen browser aan te pas. Een pdf uit een headless Chrome is zwaar,
// traag bij een koude start en breekt zodra Chrome wijzigt; dit tekent de pdf
// rechtstreeks, in vectoren. Daardoor is het formaat vrij te kiezen en blijft
// een A1 net zo scherp als een A4: er zitten geen pixels in.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/* Punten per millimeter, de eenheid van pdf. */
export const MM = 2.834645669;

export const PAPIER = {
  a4_staand:  [210 * MM, 297 * MM],
  a4:         [297 * MM, 210 * MM],
  a3:         [420 * MM, 297 * MM],
  a1:         [841 * MM, 594 * MM]
};

export const KLEUR = {
  inkt: "#1A0B2E", magenta: "#D6026F", papier: "#F7F3F0",
  lavendel: "#B9AECB", lijn: "#E2D8D2", gedempt: "#6B6472", wit: "#FFFFFF"
};

const pad = naam => fileURLToPath(new URL(`./assets/fonts/${naam}`, import.meta.url));

/* De huisletters. DM Sans is een variabele letter en wordt geladen op zijn
   eigen stand; voor nadruk gebruiken we de schreefletter en kleur, niet een
   vette snede die er niet is. */
export const LETTERS = {
  sans:  pad("DMSans-Variable.ttf"),
  serif: pad("DMSerifDisplay-Regular.ttf")
};

export function zetLetters(doc){
  for (const [naam, bestand] of Object.entries(LETTERS)){
    if (existsSync(bestand)) doc.registerFont(naam, bestand);
  }
  return doc;
}

export function logoBuffer(){
  const bestand = fileURLToPath(new URL("./assets/happly-logo.png", import.meta.url));
  return existsSync(bestand) ? readFileSync(bestand) : null;
}

/* Een pdf komt als stroom uit pdfkit; dit maakt er een buffer van, zodat een
   route hem in een keer kan terugsturen of kan opslaan. */
export function alsBuffer(doc){
  return new Promise((klaar, mis) => {
    const stukken = [];
    doc.on("data", d => stukken.push(d));
    doc.on("end", () => klaar(Buffer.concat(stukken)));
    doc.on("error", mis);
    doc.end();
  });
}

/* Een kop in kleine letters met spatiering, zoals overal in de huisstijl. */
export function label(doc, tekst, x, y, { kleur = KLEUR.magenta, grootte = 7.5 } = {}){
  doc.font("sans").fontSize(grootte).fillColor(kleur)
     .text(String(tekst).toUpperCase(), x, y, { characterSpacing: grootte * 0.18 });
  return doc.y;
}
