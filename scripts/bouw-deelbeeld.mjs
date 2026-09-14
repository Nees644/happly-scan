// scripts/bouw-deelbeeld.mjs
// Bouwt het deelbeeld voor teamkrachtindex.nl: de afbeelding die LinkedIn,
// WhatsApp en mailprogramma's laten zien als iemand de link doorstuurt.
//
// 1200 bij 630, want dat is wat die platforms verwachten. De tekening komt uit
// dezelfde functie die de Teamkrachtkaart maakt, zodat het beeld klopt met wat
// iemand krijgt als hij doorklikt.
//
// Draaien met: node scripts/bouw-deelbeeld.mjs
// Daarna: bash assets/og/maak-png.sh

import { writeFileSync } from "node:fs";
import { tekenKaartSvg, KLEUR } from "../teamkracht-kaart.js";
import { VOORBEELD_TEAMBEELD } from "../teamkracht-voorbeeld-data.js";

// Alleen de teamlijn en het gemiddelde: individuele lijnen horen niet op een
// beeld dat rondgaat op LinkedIn, ook al zijn ze naamloos.
const beeld = { ...VOORBEELD_TEAMBEELD, lijnen: [] };
const svg = tekenKaartSvg(beeld, {});

const html = `<!DOCTYPE html>
<html lang="nl"><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600&family=DM+Serif+Display&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;overflow:hidden;background:${KLEUR.papier};
       font-family:"DM Sans",system-ui,sans-serif;color:${KLEUR.inkt};display:flex}
  .tekst{width:560px;padding:70px 0 70px 72px;display:flex;flex-direction:column;justify-content:center}
  .eyebrow{font-size:15px;font-weight:600;letter-spacing:3px;text-transform:uppercase;
           color:${KLEUR.magenta};margin-bottom:22px}
  h1{font-family:"DM Serif Display",Georgia,serif;font-size:56px;line-height:1.05;font-weight:400;margin-bottom:24px}
  p{font-size:21px;line-height:1.45;color:${KLEUR.gedempt};max-width:44ch}
  .beeld{flex:1;display:flex;align-items:center;justify-content:center;padding-right:96px}
  .beeld svg{width:100%;height:auto;max-height:470px}
  .voet{position:absolute;left:72px;bottom:46px;font-size:16px;letter-spacing:1px;color:${KLEUR.gedempt}}
</style></head>
<body>
  <div class="tekst">
    <div class="eyebrow">Teamkracht Index</div>
    <h1>Zien, kiezen,<br>en het dan ook doen</h1>
    <p>Eén beeld van waar een team staat op eigenaarschap, en wat er is verschoven als je opnieuw meet.</p>
    <div class="voet">teamkrachtindex.nl</div>
  </div>
  <div class="beeld">${svg}</div>
</body></html>`;

writeFileSync(new URL("../assets/og/deelbeeld.html", import.meta.url), html);
console.log("assets/og/deelbeeld.html geschreven");
