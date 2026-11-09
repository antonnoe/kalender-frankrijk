// Maakt data/naamdagen.json opnieuw uit de bronnen. Alleen met de hand draaien (npm run naamdagen), niet in de dagelijkse workflow:
// de lijst verandert niet, dus de uitkomst staat in git en de API leest alleen dat bestand.
//
// Bron 1: Wikidata, eigenschap P1750 (name day) met kwalificatie P17 = Frankrijk (Q142). CC0.
// Bron 2: fr.wikipedia "Calendrier des saints en France" (CC BY-SA 4.0), alleen voor de dagen die Wikidata mist
//         (eerste naam van de regel). Vaste versie (oldid), zodat een latere wijziging ons niet raakt.
// Gebruik: node scripts/maak-naamdagen.js   (achter een proxy: NODE_USE_ENV_PROXY=1)

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UIT = join(ROOT, 'data', 'naamdagen.json');
const OLDID = 241061561;
const WP_URL = 'https://fr.wikipedia.org/wiki/Calendrier_des_saints_en_France';
const UA = 'kalender-frankrijk (+https://github.com/antonnoe/kalender-frankrijk; info@communitiesabroad.com)';
const MAANDEN = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DAGEN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

async function haal(url, opties = {}, pogingen = 5) {
  let laatste;
  for (let i = 1; i <= pogingen; i++) {
    try {
      const r = await fetch(url, { ...opties, headers: { 'user-agent': UA, ...(opties.headers ?? {}) } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) { laatste = e; await new Promise((ok) => setTimeout(ok, 2000 * i)); }
  }
  throw laatste;
}

const sleutel = (dag, maand) => `${String(maand).padStart(2, '0')}-${String(dag).padStart(2, '0')}`;

/** "1er janvier" of "2 février" -> "01-01" */
export function dagUitLabel(label) {
  const m = /^(\d{1,2})(?:er)?\s+(\S+)$/.exec(String(label).trim());
  if (!m) return null;
  const maand = MAANDEN.indexOf(m[2].toLowerCase()) + 1;
  const dag = Number(m[1]);
  return maand && dag >= 1 && dag <= DAGEN[maand - 1] ? sleutel(dag, maand) : null;
}

/** Wikitekst van een regel naar gewone tekst: links, verwijzingen en sjablonen weg. */
export function wikiTekst(regel) {
  return regel
    .replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2').replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/** Alle regels van de Wikipedia-lijst: { 'MM-DD': 'Basile de Césarée et Grégoire de Nazianze' } */
export function leesWikipedia(tekst) {
  const uit = {};
  let maand = 0, dag = 0;
  for (const regel of tekst.split('\n')) {
    const k = /^==\s*([^=]+?)\s*==\s*$/.exec(regel);
    if (k) { const i = MAANDEN.indexOf(k[1].toLowerCase()); if (i >= 0) { maand = i + 1; dag = 0; } continue; }
    if (maand && /^#(?!#)/.test(regel)) { dag += 1; uit[sleutel(dag, maand)] = wikiTekst(regel.replace(/^#\s*/, '')); }
  }
  return uit;
}

/** De eerste naam van een Wikipedia-regel: "Ananie, Conversion de Paul" -> "Ananie" */
export const eersteNaam = (regel) => regel.split(/,| et /)[0].trim();

const schoon = (s) => s.replace(/[–—]/g, '-').trim();

async function main() {
  const sparql = 'SELECT ?dayLabel ?nameLabel WHERE { ?name p:P1750 ?st . ?st ps:P1750 ?day ; pq:P17 wd:Q142 . SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,mul,en". } }';
  const wd = JSON.parse(await haal('https://query.wikidata.org/sparql?' + new URLSearchParams({ query: sparql }), { headers: { accept: 'application/sparql-results+json' } }));
  const wp = leesWikipedia(await haal(`https://fr.wikipedia.org/w/index.php?title=Calendrier_des_saints_en_France&oldid=${OLDID}&action=raw`));

  const dagen = {};
  for (const b of wd.results.bindings) {
    const d = dagUitLabel(b.dayLabel.value);
    const naam = schoon(b.nameLabel.value);
    if (!d || !naam || /^Q\d+$/.test(naam)) continue;
    (dagen[d] ??= { namen: [], bron: 'wikidata' }).namen.push(naam);
  }
  // Volgorde bij meerdere namen: zoals in de Wikipedia-regel, de rest daarachter
  for (const [d, e] of Object.entries(dagen)) {
    const regel = (wp[d] ?? '').toLowerCase();
    const pos = (n) => { const i = regel.indexOf(n.toLowerCase()); return i < 0 ? 1e9 : i; };
    e.namen = [...new Set(e.namen)].sort((a, b) => pos(a) - pos(b));
    // Heeft Wikidata een naam zonder accenten en staat hij in de Wikipedia-regel met accenten (Melaine, Mélaine), dan geldt die schrijfwijze
    const kaal = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const woorden = (wp[d] ?? '').split(/[^\p{L}'-]+/u).filter(Boolean);
    e.namen = e.namen.map((n) => woorden.find((w) => /^[A-Za-z'-]+$/.test(n) && kaal(w) === n.toLowerCase() && w !== n && w[0] === w[0].toUpperCase()) ?? n);
  }
  let aangevuld = 0;
  for (let m = 1; m <= 12; m++) for (let dd = 1; dd <= DAGEN[m - 1]; dd++) {
    const d = sleutel(dd, m);
    if (dagen[d]) continue;
    const naam = schoon(eersteNaam(wp[d] ?? ''));
    if (!naam) throw new Error(`${d}: geen naam in Wikidata en niet in Wikipedia`);
    dagen[d] = { namen: [naam], bron: 'wikipedia' };
    aangevuld += 1;
  }
  const gesorteerd = Object.fromEntries(Object.keys(dagen).sort().map((k) => [k, dagen[k]]));
  if (Object.keys(gesorteerd).length !== 366) throw new Error('verwacht 366 dagen');
  if (JSON.stringify(gesorteerd).match(/[–—]/)) throw new Error('lang streepje in de uitkomst');
  const kop = {
    bron: `Wikidata, eigenschap P1750 (name day) met kwalificatie P17 = Frankrijk (Q142), CC0, opgevraagd ${new Date().toISOString().slice(0, 10)}; ${aangevuld} dagen aangevuld uit ${WP_URL}, versie oldid=${OLDID}, CC BY-SA 4.0 (alleen losse feiten: de eerste naam van de regel).`,
    licentie: 'Wikidata CC0; Wikipedia CC BY-SA 4.0',
    wikipedia: { url: WP_URL, oldid: OLDID },
    maken: 'node scripts/maak-naamdagen.js (met de hand, niet in de dagelijkse workflow)',
  };
  writeFileSync(UIT, JSON.stringify({ kop, dagen: gesorteerd }, null, 1) + '\n');
  console.log(`naamdagen.json: 366 dagen, ${366 - aangevuld} uit Wikidata, ${aangevuld} uit Wikipedia`);
  console.log('aangevuld:', Object.entries(gesorteerd).filter(([, e]) => e.bron === 'wikipedia').map(([d, e]) => `${d} ${e.namen[0]}`).join(', '));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
