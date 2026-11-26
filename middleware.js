// middleware.js
// Welke voordeur je krijgt, hangt af van het domein waarmee je binnenkomt.
//
// scan.happly.nl toont de Zelfkracht Index (index.html).
// teamkrachtindex.nl toont de Teamkracht Index (teamkrachtindex.html).
//
// Dit kan niet met een rewrite in vercel.json. Vercel werkt zijn routering af in
// de volgorde redirects, bestanden, rewrites. Een verzoek op / vindt daar
// index.html en komt dus nooit bij de rewrite aan. Middleware draait ervoor, en
// is de enige plek waar dit onderscheid gemaakt kan worden.
//
// De rest van de routering blijft in vercel.json staan: de redirects van de
// app-paden werken wel, want redirects gaan wel vóór het bestandssysteem.

export const config = {
  // Alleen de voordeur. Elk ander pad loopt langs deze functie niet, zodat een
  // fout hier nooit de hele site kan raken.
  matcher: "/"
};

const TEAMKRACHTINDEX = /^(www\.)?teamkrachtindex\.nl$/i;
const STERKEROPJEWERK = /^(www\.)?sterkeropjewerk\.nl$/i;

// sterkeropjewerk.nl is alleen een doorverwijzing naar happly.nl (26 november
// 2026). De regel in vercel.json doet dat voor elk pad; deze regel vangt de
// voordeur op, want daar kwam de bezoeker anders op de Zelfkracht Scan uit.
export const DOEL_STERKER = "https://happly.nl/?src=sterkeropjewerk";

export default function middleware(request){
  const host = request.headers.get("host") || "";
  if (STERKEROPJEWERK.test(host)) return Response.redirect(DOEL_STERKER, 307);
  if (!TEAMKRACHTINDEX.test(host)) return;          // scan.happly.nl blijft zoals hij was

  // Zonder .html: cleanUrls staat aan in vercel.json, dus Vercel serveert de
  // pagina op /teamkrachtindex en stuurt /teamkrachtindex.html daarheen door.
  // Rewriten naar het bestand zelf geeft een 404.
  //
  // Rewriten en niet doorsturen: het adres in de balk blijft
  // www.teamkrachtindex.nl, de bezoeker ziet geen pad.
  const doel = new URL("/teamkrachtindex", request.url);
  return new Response(null, {
    headers: { "x-middleware-rewrite": doel.toString() }
  });
}
