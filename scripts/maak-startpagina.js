// Genereert public/index.html (de keuzepagina) uit lib/afnemers.js en de rubrieken in lib/model.js.
// Draait met `npm run bouw`. Zonder netwerk en zonder extra afhankelijkheden.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AFNEMERS } from '../lib/afnemers.js';
import { RUBRIEKEN } from '../lib/model.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function startpaginaHtml() {
  const knoppen = Object.values(AFNEMERS).map((a) => `<a class="knop" href="${esc(a.url)}">${esc(a.knop)}</a>
<p class="uitleg">${esc(a.uitleg)}</p>`).join('\n');
  const ical = [...RUBRIEKEN.map((r) => ({ href: `/ical/${r.id}.ics`, naam: r.naam })), { href: '/ical/alles.ics', naam: 'Alles' }]
    .map((l) => `<a href="${esc(l.href)}">${esc(l.naam)}</a>`).join(' · ');
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kalender Frankrijk</title>
<meta name="description" content="Alle data die ertoe doen voor Nederlanders en Belgen in Frankrijk: belastingen, uitkeringen, feestdagen, schoolvakanties, seizoen en verenigingen.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;700&family=Poppins:wght@500;600&display=swap">
<style>
*{box-sizing:border-box}
body{margin:0;background:#f5f0eb;color:#333;font:16px/1.7 Mulish,'Segoe UI',Arial,sans-serif}
main{max-width:520px;margin:0 auto;padding:32px 16px}
.kop{display:flex;align-items:center;gap:14px;margin:0 0 12px}
.kop img{width:56px;height:56px;flex:none}
h1{font-family:Poppins,'Segoe UI',Arial,sans-serif;font-weight:600;color:#800000;font-size:28px;line-height:1.2;margin:0}
.kaart{background:#faf5f5;border:1px solid #ecd9d9;border-radius:8px;padding:16px;margin:20px 0}
.knop{display:flex;align-items:center;justify-content:center;min-height:48px;width:100%;background:#800000;color:#fff;border-radius:4px;font-family:Poppins,'Segoe UI',Arial,sans-serif;font-weight:500;font-size:18px;text-decoration:none;padding:10px 16px}
.knop:hover,.knop:focus{background:#660000}
.uitleg{font-size:14px;color:#666;margin:6px 0 16px;text-align:center}
.kaart .uitleg:last-child{margin-bottom:0}
.ical{font-size:14px;color:#666}
.ical a{color:#800000;text-decoration:underline}
.voet{font-size:14px;color:#666;margin-top:32px}
.voet a{color:#800000;text-decoration:underline}
</style></head><body><main>
<div class="kop"><img src="/beeld/genieten.png" width="56" height="56" alt=""><h1>Kalender Frankrijk</h1></div>
<p>Alle data die ertoe doen voor Nederlanders en Belgen in Frankrijk: belastingen, uitkeringen, feestdagen, schoolvakanties, seizoen en verenigingen.</p>
<div class="kaart">
${knoppen}
</div>
<p class="ical">Of neem een rubriek op in uw eigen agenda: ${ical}</p>
<p class="voet">Naamdagen: Wikidata (CC0), aangevuld met Wikipedia <a href="https://fr.wikipedia.org/wiki/Calendrier_des_saints_en_France">"Calendrier des saints en France"</a> (CC BY-SA 4.0).</p>
<p class="voet">Een uitgave van <a href="https://www.communitiesabroad.com">Communities Abroad</a></p>
</main></body></html>
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(new URL('../public/index.html', import.meta.url), startpaginaHtml());
  console.log('public/index.html gegenereerd uit lib/afnemers.js.');
}
