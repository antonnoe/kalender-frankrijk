// Haalt de automatische bronnen op en bewaart de laatste kopie in data/bron/.
// Valt een bron uit, dan blijft de vorige kopie staan en komt er een waarschuwing in data/bron/status.json.
// Gebruik: npm run bronnen   (lokaal achter een proxy: NODE_USE_ENV_PROXY=1 npm run bronnen)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leesIcs } from '../lib/bronnen.js';
import { vandaagParijs } from '../lib/datum.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BRON = join(ROOT, 'data', 'bron');
mkdirSync(BRON, { recursive: true });

const vandaag = vandaagParijs();
const jaar = Number(vandaag.slice(0, 4));
const statusPad = join(BRON, 'status.json');
const status = existsSync(statusPad) ? JSON.parse(readFileSync(statusPad, 'utf8')) : {};

async function haal(url, { pogingen = 6, wacht = 1500, timeout = 40000 } = {}) {
  let laatste;
  for (let i = 1; i <= pogingen; i++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ac.signal, headers: { 'user-agent': 'kalender-frankrijk (+https://github.com/antonnoe/kalender-frankrijk)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      laatste = e;
      await new Promise((r) => setTimeout(r, wacht * i));
    } finally { clearTimeout(t); }
  }
  throw new Error(`${url}: ${laatste?.cause?.code ?? laatste?.message ?? laatste}`);
}

const leesBestand = (naam) => { const p = join(BRON, naam); return existsSync(p) ? readFileSync(p, 'utf8') : null; };

/** Schrijft alleen als de inhoud echt anders is. Geeft true bij een wijziging. */
function bewaar(naam, tekst) {
  const oud = leesBestand(naam);
  if (oud === tekst) return false;
  writeFileSync(join(BRON, naam), tekst);
  return true;
}

const zonderStempel = (ics) => ics.replace(/\r\n/g, '\n').split('\n').filter((l) => !/^(DTSTAMP|CREATED)[:;]/.test(l)).join('\n');

const bronnen = [];

function icsBron(sleutel, bestand, url, minimaal) {
  bronnen.push({
    sleutel, bestand,
    async ophalen() {
      const tekst = zonderStempel(await haal(url));
      if (!tekst.includes('BEGIN:VCALENDAR')) throw new Error('geen iCal ontvangen');
      const n = leesIcs(tekst).length;
      if (n < minimaal) throw new Error(`slechts ${n} items ontvangen (minimaal ${minimaal} verwacht), kopie niet vervangen`);
      const oud = leesBestand(bestand);
      if (oud && leesIcs(oud).length > 20 && n < leesIcs(oud).length * 0.5) throw new Error(`aantal items gedaald van ${leesIcs(oud).length} naar ${n}, kopie niet vervangen`);
      return { tekst, aantal: n };
    },
  });
}
icsBron('fiscaal-particulier', 'fiscaal-particulier.ics', 'https://infofrankrijk.com/?if_fc_ical=particulier', 10);
icsBron('fiscaal-professionnel', 'fiscaal-professionnel.ics', 'https://infofrankrijk.com/?if_fc_ical=professionnel', 50);
icsBron('fiscaal-nederland', 'fiscaal-nederland.ics', 'https://infofrankrijk.com/?if_fc_ical=nederland', 5);
icsBron('google-fr', 'google-fr.ics', 'https://calendar.google.com/calendar/ical/nl.french%23holiday%40group.v.calendar.google.com/public/basic.ics', 20);
icsBron('google-nl', 'google-nl.ics', 'https://calendar.google.com/calendar/ical/nl.dutch%23holiday%40group.v.calendar.google.com/public/basic.ics', 20);

bronnen.push({
  sleutel: 'feestdagen', bestand: 'feestdagen.json',
  async ophalen() {
    const oud = leesBestand('feestdagen.json');
    const uit = oud ? JSON.parse(oud) : {};
    let aantal = 0;
    const fouten = [];
    for (const gebied of ['metropole', 'alsace-moselle']) {
      uit[gebied] ??= {};
      for (let j = jaar; j <= jaar + 2; j++) {
        try {
          const d = JSON.parse(await haal(`https://calendrier.api.gouv.fr/jours-feries/${gebied}/${j}.json`));
          if (!d || typeof d !== 'object' || !Object.keys(d).length) throw new Error('leeg antwoord');
          uit[gebied][j] = d;
          aantal += Object.keys(d).length;
        } catch (e) { fouten.push(`${gebied} ${j}: ${e.message}`); }
      }
    }
    if (!aantal) throw new Error(`niets opgehaald (${fouten.join('; ')})`);
    return { tekst: JSON.stringify(uit, null, 2) + '\n', aantal, waarschuwing: fouten.length ? `deels mislukt: ${fouten.join('; ')}` : null };
  },
});

bronnen.push({
  sleutel: 'schoolvakanties', bestand: 'schoolvakanties.json',
  async ophalen() {
    const url = 'https://data.education.gouv.fr/explore/dataset/fr-en-calendrier-scolaire/download/?format=json&timezone=Europe/Paris';
    const records = JSON.parse(await haal(url, { pogingen: 8, timeout: 90000 })).map((x) => x.fields ?? x);
    const jaren = new Set([`${jaar - 1}-${jaar}`, `${jaar}-${jaar + 1}`, `${jaar + 1}-${jaar + 2}`, `${jaar + 2}-${jaar + 3}`]);
    const uit = new Map();
    for (const r of records) {
      if (!jaren.has(r.annee_scolaire) || !/^Zone [ABC]$/.test(r.zones ?? '') || /^Enseignants/.test(r.population ?? '')) continue;
      const k = [r.zones, r.description, r.start_date?.slice(0, 10), r.end_date?.slice(0, 10)].join('|');
      if (!uit.has(k)) uit.set(k, { zones: r.zones, description: r.description, start_date: r.start_date.slice(0, 10), end_date: r.end_date.slice(0, 10), annee_scolaire: r.annee_scolaire });
    }
    const lijst = [...uit.values()].sort((a, b) => (a.start_date + a.zones + a.description).localeCompare(b.start_date + b.zones + b.description));
    if (lijst.length < 20) throw new Error(`slechts ${lijst.length} vakanties ontvangen, kopie niet vervangen`);
    return { tekst: JSON.stringify(lijst, null, 1) + '\n', aantal: lijst.length };
  },
});

bronnen.push({
  sleutel: 'verenigingen', bestand: 'verenigingen.json',
  async ophalen() {
    const d = JSON.parse(await haal('https://antonnoe.github.io/verenigingen-kalender/data/verenigingen.json'));
    if (!Array.isArray(d.verenigingen)) throw new Error('onverwachte opbouw');
    return { tekst: JSON.stringify(d, null, 1) + '\n', aantal: d.verenigingen.reduce((n, v) => n + (v.events?.length ?? 0), 0) };
  },
});

bronnen.push({
  sleutel: 'cafe-jeudi', bestand: 'cafe-jeudi.json',
  async ophalen() {
    const d = JSON.parse(await haal('https://nlfr-menu.vercel.app/api/banner'));
    if (typeof d.aan !== 'boolean') throw new Error('onverwachte opbouw (veld aan ontbreekt)');
    // alleen wat we gebruiken, zodat een tijdstempel niet elke dag een commit veroorzaakt
    const kort = { aan: d.aan, aanTot: d.aanTot ?? null, datum: d.datum ?? null, volgende: d.volgende ?? null, wekelijks: d.wekelijks ?? null, overslaan: d.overslaan ?? [], knop: d.knop ?? null };
    return { tekst: JSON.stringify(kort, null, 2) + '\n', aantal: 1 };
  },
});

let gewijzigd = 0;
let mislukt = 0;
for (const b of bronnen) {
  const s = status[b.sleutel] ?? {};
  try {
    const { tekst, aantal, waarschuwing } = await b.ophalen();
    const veranderd = bewaar(b.bestand, tekst);
    if (veranderd) gewijzigd++;
    status[b.sleutel] = { bestand: b.bestand, laatst_geslaagd: vandaag, laatst_gewijzigd: veranderd ? vandaag : (s.laatst_gewijzigd ?? vandaag), aantal, melding: waarschuwing ?? null };
    console.log(`ok       ${b.sleutel}: ${aantal} items${veranderd ? ' (gewijzigd)' : ''}${waarschuwing ? ` [${waarschuwing}]` : ''}`);
  } catch (e) {
    mislukt++;
    status[b.sleutel] = { ...s, bestand: b.bestand, laatst_geslaagd: s.laatst_geslaagd ?? null, laatste_poging: vandaag, melding: `ophalen mislukt: ${e.message}` };
    console.log(`MISLUKT  ${b.sleutel}: ${e.message} (de laatste kopie blijft staan)`);
  }
}
const gesorteerd = Object.fromEntries(Object.entries(status).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(statusPad, JSON.stringify(gesorteerd, null, 2) + '\n');
console.log(`Klaar: ${bronnen.length - mislukt} van ${bronnen.length} bronnen vernieuwd, ${gewijzigd} met nieuwe inhoud.`);
// Een bron die uitvalt maakt de run niet rood: de laatste kopie blijft werken en /api/status meldt het.
