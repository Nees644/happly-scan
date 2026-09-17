// scripts/serveer.mjs
// Een kale statische server voor de repo, voor het bekijken van pagina's in
// de browser zonder Vercel. Geen api-routes: die vragen Supabase en draaien
// alleen op Vercel of met vercel dev. Draaien: node scripts/serveer.mjs 4321
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const WORTEL = fileURLToPath(new URL("..", import.meta.url));
const POORT = Number(process.argv[2] || 4321);
const TYPEN = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
  ".json": "application/json", ".pdf": "application/pdf", ".ttf": "font/ttf", ".woff2": "font/woff2" };

createServer(async (req, res) => {
  try{
    let pad = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (pad.endsWith("/")) pad += "index.html";
    let bestand = normalize(join(WORTEL, pad));
    if (!bestand.startsWith(WORTEL)){ res.writeHead(403); res.end(); return; }
    try{ await stat(bestand); }catch{ bestand += ".html"; }   // cleanUrls zoals op Vercel
    const data = await readFile(bestand);
    res.writeHead(200, { "Content-Type": TYPEN[extname(bestand)] || "application/octet-stream" });
    res.end(data);
  }catch(e){
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("niet gevonden");
  }
}).listen(POORT, () => console.log(`statische server op http://localhost:${POORT}`));
