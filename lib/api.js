// De routes van de API als gewone functies: (verzoek) => {status, headers, body}.
// De Vercel-functies in /api en het lokale startscript gebruiken dezelfde functies.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { laadAlles, ROOT } from './laden.js';
import { RUBRIEKEN, RUBRIEK_IDS } from './model.js';
import { vandaagParijs, leesIso, plusDagen, verschilDagen } from './datum.js';
import { itemsInBereik, vandaagInHetKort, tellingKomende60, tellingTeVerifieren } from './engine.js';
import { naamdagVoor } from './naamdag.js';
import { maanVoor } from './maan.js';
import { leesDep } from './gebied.js';
import { liveBanner } from './banner.js';
import { bouwIcs, itemsVoorIcal, FISCALE_SUBFEEDS } from './ical.js';

const CACHE = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';
// /api/vandaag leest de banner live en mag dus niet een uur oud zijn
const CACHE_KORT = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'content-type' };

const json = (status, data, extra = {}) => ({
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': status === 200 ? CACHE : 'no-store', ...CORS, ...extra },
  body: JSON.stringify(data, null, 2),
});
const fout = (status, tekst) => json(status, { fout: tekst });

let geheugen = null;
/** De data wordt per koude start één keer geladen; elke nieuwe deploy heeft nieuwe bestanden. */
export function data(root = ROOT) {
  if (!geheugen || geheugen.root !== root) geheugen = { root, res: laadAlles(root) };
  return geheugen.res;
}
export function vergeetData() { geheugen = null; }

const dagTekst = (s, naam) => {
  if (s == null || s === '') return null;
  if (!leesIso(s)) throw new Error(`${naam} moet een echte datum zijn in de vorm JJJJ-MM-DD (kreeg "${s}")`);
  return s;
};

export function basisUrl(headers = {}) {
  const host = headers['x-forwarded-host'] ?? headers.host;
  if (!host) return '';
  const proto = headers['x-forwarded-proto'] ?? (/^(localhost|127\.)/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
}

/**
 * Zoals `route`, maar leest voor /api/vandaag eerst de banner van nlfr-menu live (timeout 3 seconden, terugval op de
 * nachtelijke kopie). Dit is wat Vercel en het lokale startscript gebruiken. `opties.haal` en `opties.timeout` zijn
 * voor tests. De header x-cafe-jeudi zegt of de banner 'live' kwam of uit de 'kopie'.
 */
export async function routeLive(pad, query = {}, headers = {}, opties = {}) {
  if (pad !== '/api/vandaag' || headers.__methode === 'OPTIONS') return route(pad, query, headers, opties);
  const { root = ROOT } = opties;
  const { banner, bron } = await liveBanner(data(root).banner, { haal: opties.haal, timeout: opties.timeout });
  const r = route(pad, query, headers, { ...opties, banner });
  r.headers['x-cafe-jeudi'] = bron;
  if (r.status === 200) r.headers['cache-control'] = CACHE_KORT;
  return r;
}

export function route(pad, query = {}, headers = {}, { root = ROOT, nu = new Date(), banner = null } = {}) {
  if (headers.__methode === 'OPTIONS') return { status: 204, headers: { ...CORS }, body: '' };
  const basis = basisUrl(headers);
  const { res } = { res: data(root) };
  const vandaag = vandaagParijs(nu);
  try {
    if (pad === '/api/items' && query.id != null && query.id !== '') {
      // Een item op id, met dezelfde velden en dezelfde filter als de lijst (vastgesteld; rubriek, doelgroep en toon_in
      // werken ook). Het bereik is standaard een week terug tot ruim twee jaar vooruit, zodat ook een datum ver weg
      // (een gedeelde link) zijn voorkomens krijgt. Onbekend, verborgen of helemaal voorbij: 404.
      const id = String(query.id);
      const van = dagTekst(query.van, 'van') ?? plusDagen(vandaag, -7);
      const tot = dagTekst(query.tot, 'tot') ?? plusDagen(van, 800);
      const items = /^[a-z0-9-]{1,100}$/.test(id) ? itemsInBereik(res.items.filter((i) => i.id === id), van, tot, query, basis) : [];
      if (!items.length) return fout(404, `onbekend item "${id.slice(0, 100)}"`);
      return json(200, { van, tot, aantal: 1, items });
    }
    if (pad === '/api/items') {
      const van = dagTekst(query.van, 'van') ?? vandaag;
      const tot = dagTekst(query.tot, 'tot') ?? plusDagen(van, 60);
      if (tot < van) return fout(400, 'tot ligt vóór van');
      if (verschilDagen(tot, van) > 800) return fout(400, 'vraag hooguit ongeveer twee jaar tegelijk op');
      const items = itemsInBereik(res.items, van, tot, query, basis);
      return json(200, { van, tot, aantal: items.length, items });
    }
    if (pad === '/api/vandaag') {
      const datum = dagTekst(query.datum, 'datum') ?? vandaag;
      const nieuwsLinks = query.nieuws_links ? String(query.nieuws_links).split(',').map((s) => s.trim()).filter(Boolean) : [];
      const kort = vandaagInHetKort(res.items, banner ?? res.banner, datum, { basis, nieuwsLinks, dep: leesDep(query.dep) });
      return json(200, { ...kort, naamdag: naamdagVoor(datum, res.naamdagen, res.feestdatums), maan: maanVoor(datum) });
    }
    if (pad === '/api/status') return json(200, statusRapport(res, vandaag));
    if (pad === '/api/rubrieken') return json(200, RUBRIEKEN.map((r) => ({ ...r, beeld_png: `${basis}/beeld/${r.id}.png`, beeld_svg: `${basis}/beeld/${r.id}.svg` })));
    let m = /^\/ical\/([a-z0-9-]+?)(?:\.ics)?$/.exec(pad);
    if (pad === '/api/ical') m = [null, String(query.naam ?? '').replace(/\.ics$/, '')];
    if (m) {
      const naam = m[1];
      if (!(naam === 'alles' || RUBRIEK_IDS.includes(naam) || FISCALE_SUBFEEDS.includes(naam))) return fout(404, `onbekende agenda "${naam}". Kies uit: alles, ${RUBRIEK_IDS.join(', ')}, ${FISCALE_SUBFEEDS.join(', ')}`);
      const jaar = Number(vandaag.slice(0, 4));
      const stempel = Object.values(res.status).map((s) => s.laatst_geslaagd).filter(Boolean).sort().pop() ?? vandaag;
      const info = RUBRIEKEN.find((r) => r.id === naam);
      const titel = naam === 'alles' ? 'Kalender Frankrijk' : info ? `Kalender Frankrijk, ${info.naam.toLowerCase()}` : `Kalender Frankrijk, ${naam.replace('-', ' ')}`;
      const ics = bouwIcs(itemsVoorIcal(res.items, naam), {
        naam: titel, omschrijving: 'Data die ertoe doen voor Nederlanders en Belgen in Frankrijk. Een uitgave van Communities Abroad.',
        van: `${jaar}-01-01`, tot: `${jaar + 2}-12-31`, stempel,
      });
      return { status: 200, headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': CACHE, 'content-disposition': `inline; filename="${naam}.ics"`, ...CORS }, body: ics };
    }
  } catch (e) {
    return fout(400, e.message);
  }
  return fout(404, 'onbekende route');
}

export function statusRapport(res, vandaag) {
  const bronnen = {};
  for (const [sleutel, s] of Object.entries(res.status)) {
    const leeftijd = s.laatst_geslaagd ? verschilDagen(vandaag, s.laatst_geslaagd) : null;
    bronnen[sleutel] = {
      laatst_geslaagd: s.laatst_geslaagd ?? null,
      leeftijd_dagen: leeftijd,
      laatst_gewijzigd: s.laatst_gewijzigd ?? null,
      aantal: s.aantal ?? null,
      melding: s.melding ?? null,
      verouderd: leeftijd == null || leeftijd > 3,
    };
  }
  const telling = tellingKomende60(res.items, vandaag);
  const teVerifieren = tellingTeVerifieren(res.items, vandaag);
  const waarschuwingen = [];
  for (const [sleutel, b] of Object.entries(bronnen)) {
    if (b.verouderd) waarschuwingen.push(`Bron ${sleutel}: de kopie is ${b.leeftijd_dagen == null ? 'nooit opgehaald' : `${b.leeftijd_dagen} dagen oud`}; de laatste kopie wordt gebruikt.`);
    if (b.melding) waarschuwingen.push(`Bron ${sleutel}: ${b.melding}`);
  }
  for (const [r, n] of Object.entries(telling)) if (n < 5) waarschuwingen.push(`Rubriek ${r} heeft slechts ${n} item(s) in de komende 60 dagen.`);
  for (const w of res.waarschuwingen) waarschuwingen.push(`Data: ${w}`);
  return {
    datum: vandaag,
    ok: !res.fouten.length,
    items_totaal: res.items.length,
    fiscaal_ingelezen: res.tellingen.fiscaal,
    bronnen,
    items_komende_60_dagen_per_rubriek: telling,
    items_komende_60_dagen_te_verifieren: teVerifieren,
    ontdubbeld: res.tellingen.ontdubbeld ?? 0,
    waarschuwingen,
    fouten: res.fouten,
  };
}
