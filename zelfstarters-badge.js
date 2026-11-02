// zelfstarters-badge.js
// De Zelfstarter-badge als svg, pure functie. Zes ringen in nachtblauw en
// oranje, een plus als de Plus Class is gevolgd, en onder de ringen de
// jaartallen van de metingen. Een badge zonder recent jaartal is zichtbaar
// verlopen: de ringen vervagen.
//
// Niets hierin raakt de database. Wat erop staat, staat ook op de openbare
// controlepagina; meer niet.

export const BASIS_URL = "https://zelfstarters.nl";
export const CHECK_URL = "https://scan.happly.nl/zs";

const NAVY = "#0f1f3d", NAVY2 = "#16294f", ORANJE = "#ff6a2b";

/* Een registratie is geldig als de laatste meting hoogstens twaalf maanden
   geleden is. Zonder meting is er nog geen badge: dan is er betaald, meer niet. */
export function geldig({ laatsteMetingOp, nu = new Date() }){
  if (!laatsteMetingOp) return false;
  const laatste = new Date(laatsteMetingOp);
  const grens = new Date(nu);
  grens.setMonth(grens.getMonth() - 12);
  return laatste >= grens;
}

export function nummerIsGeldig(nummer){
  return /^ZS-\d{4}-\d{5}$/.test(String(nummer || ""));
}

/* Het svg. maat is de breedte in pixels; de hoogte volgt (ringen plus ruimte
   voor de jaartallen). */
export function bouwZelfstarterBadgeSvg({ plus = false, meetjaren = [], verlopen = false, maat = 120 }){
  const jaren = (meetjaren || []).slice().sort().join(" · ");
  const hoogte = jaren ? 150 : 120;
  const dim = verlopen ? ' opacity="0.45"' : "";
  const plusSvg = plus ? `
    <circle cx="98" cy="22" r="20" fill="${ORANJE}" stroke="#fff" stroke-width="5"/>
    <rect x="94.5" y="10" width="7" height="24" rx="2.5" fill="#fff"/>
    <rect x="86" y="18.5" width="24" height="7" rx="2.5" fill="#fff"/>` : "";
  const jarenSvg = jaren ? `
    <text x="60" y="142" text-anchor="middle" font-family="Outfit, Helvetica, Arial, sans-serif" font-weight="700" font-size="13" fill="${NAVY}">${jaren}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${maat}" height="${Math.round(maat * hoogte / 120)}" viewBox="0 0 120 ${hoogte}" role="img" aria-label="Zelfstarter-badge${plus ? " met plus" : ""}">
  <g${dim}>
    <circle cx="60" cy="60" r="58" fill="${NAVY2}"/>
    <circle cx="60" cy="60" r="43" fill="#fff"/>
    <circle cx="60" cy="60" r="30" fill="${ORANJE}"/>
    <circle cx="60" cy="60" r="16" fill="#fff"/>
    <circle cx="60" cy="60" r="6" fill="${NAVY}"/>${plusSvg}
  </g>${jarenSvg}
</svg>`;
}

/* Wat de openbare controle laat zien, en niets meer dan dat. Score, ringen en
   groei staan hier met opzet niet in: die deelt de professional zelf. */
export function controleRij(rij, nu = new Date()){
  if (!rij || rij.status !== "betaald" || !rij.nummer) return null;
  const isGeldig = geldig({ laatsteMetingOp: rij.laatste_meting_op, nu });
  return {
    nummer: rij.nummer,
    naam: rij.openbaar ? rij.naam : null,
    type: rij.plus_class_gevolgd_op ? "plus" : "standaard",
    plus: !!rij.plus_class_gevolgd_op,
    sinds: rij.betaald_op ? String(rij.betaald_op).slice(0, 10) : null,
    laatste_meting: rij.laatste_meting_op ? String(rij.laatste_meting_op).slice(0, 10) : null,
    meetjaren: rij.meetjaren || [],
    geldig: isGeldig,
    toestand: !rij.laatste_meting_op ? "wacht op meting" : (isGeldig ? "geldig" : "verlopen"),
    verificatiecode: rij.verificatiecode
  };
}
