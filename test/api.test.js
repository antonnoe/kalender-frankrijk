import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { route, vergeetData } from '../lib/api.js';
import { bouwIcs, vouw, itemsVoorIcal } from '../lib/ical.js';
import { laadAlles } from '../lib/laden.js';
import { RUBRIEKEN } from '../lib/model.js';
import { existsSync, readFileSync } from 'node:fs';

const ROOT = join(import.meta.dirname, 'fixtures', 'root');
const NU = new Date('2026-11-02T10:00:00Z');
const vraag = (pad, q = {}, h = { host: 'kalender.example' }) => route(pad, q, h, { root: ROOT, nu: NU });

test('/api/items filtert op rubriek, doelgroep en bereik en rekent de concrete data uit', () => {
  const r = vraag('/api/items', { van: '2026-11-01', tot: '2026-11-30', rubriek: 'genieten' });
  const d = JSON.parse(r.body);
  assert.equal(r.status, 200);
  const b = d.items.find((i) => i.id === 'beaujolais-nouveau');
  assert.deepEqual(b.voorkomens, [{ van: '2026-11-19', tot: '2026-11-19' }]);
  assert.equal(b.beeld_url, 'https://kalender.example/beeld/genieten.png');
  assert.ok(d.items.every((i) => i.rubriek === 'genieten'));
  const h = JSON.parse(vraag('/api/items', { van: '2026-11-01', tot: '2026-11-30', doelgroep: 'huiseigenaar' }).body);
  assert.ok(h.items.some((i) => /IFI/.test(i.titel)));
  assert.ok(h.items.some((i) => i.doelgroepen.includes('iedereen')), 'iedereen telt voor elke doelgroep mee');
  assert.ok(!h.items.some((i) => i.doelgroepen.length === 1 && i.doelgroepen[0] === 'ondernemer'));
  const n = JSON.parse(vraag('/api/items', { van: '2026-11-01', tot: '2026-11-30', toon_in: 'nieuwsbrief' }).body);
  assert.ok(n.items.every((i) => i.toon_in.includes('nieuwsbrief')));
});

test('/api/items: periode over de jaargrens verschijnt met zijn volledige duur', () => {
  const d = JSON.parse(vraag('/api/items', { van: '2027-01-10', tot: '2027-01-20', rubriek: 'wonen' }).body);
  assert.deepEqual(d.items[0].voorkomens, [{ van: '2026-11-01', tot: '2027-03-31' }]);
});

test('/api/vandaag geeft de vorm uit het ontwerp', () => {
  const r = vraag('/api/vandaag', { datum: '2026-11-02' });
  const d = JSON.parse(r.body);
  assert.deepEqual(Object.keys(d), ['datum', 'banner', 'regels', 'weggelaten']);
  assert.equal(d.datum, '2026-11-02');
  assert.equal(d.banner, null);
  for (const regel of d.regels) {
    for (const k of ['soort', 'kop', 'tekst', 'link', 'rubriek', 'beeld_url', 'gesprek', 'forum_url']) assert.ok(k in regel, k);
    assert.match(regel.beeld_url, /^https:\/\/kalender\.example\/beeld\/[a-z]+\.png$/);
  }
});

test('/api/vandaag zonder datum gebruikt vandaag in Europe/Paris', () => {
  assert.equal(JSON.parse(vraag('/api/vandaag').body).datum, '2026-11-02');
  assert.equal(JSON.parse(route('/api/vandaag', {}, {}, { root: ROOT, nu: new Date('2026-11-02T23:30:00Z') }).body).datum, '2026-11-03');
});

test('foute invoer geeft een duidelijke melding en geen crash', () => {
  const r = vraag('/api/vandaag', { datum: '2026-13-45' });
  assert.equal(r.status, 400);
  assert.match(JSON.parse(r.body).fout, /echte datum/);
  assert.equal(vraag('/api/onzin').status, 404);
  assert.equal(vraag('/ical/onzin.ics').status, 404);
});

test('CORS is open en de cache is een uur', () => {
  const r = vraag('/api/items');
  assert.equal(r.headers['access-control-allow-origin'], '*');
  assert.match(r.headers['cache-control'], /s-maxage=3600/);
  assert.equal(route('/api/items', {}, { __methode: 'OPTIONS' }, { root: ROOT }).status, 204);
});

test('/api/status: leeftijd per bron, telling per rubriek, waarschuwing bij weinig items en bij een bron die uitvalt', () => {
  const d = JSON.parse(vraag('/api/status').body);
  assert.equal(d.ok, true, 'een bron die uitvalt maakt de build niet rood');
  assert.equal(d.bronnen['google-fr'].leeftijd_dagen, 13);
  assert.equal(d.bronnen['google-fr'].verouderd, true);
  assert.equal(d.bronnen['feestdagen'].leeftijd_dagen, 0);
  assert.ok(d.waarschuwingen.some((w) => /google-fr.*13 dagen oud/.test(w)));
  assert.ok(d.waarschuwingen.some((w) => /google-fr.*HTTP 503/.test(w)));
  assert.ok(d.waarschuwingen.some((w) => /Rubriek zorg heeft slechts 0/.test(w)));
  assert.equal(typeof d.items_komende_60_dagen_per_rubriek.fiscaal, 'number');
  assert.equal(d.fiscaal_ingelezen.professionnel.samengevoegd, 1);
});

test('iCal: geldig, gevouwen en met stabiele UID\'s na een nieuwe build', () => {
  vergeetData();
  const a = vraag('/ical/genieten.ics');
  vergeetData();
  const b = vraag('/ical/genieten.ics');
  assert.equal(a.status, 200);
  assert.match(a.headers['content-type'], /text\/calendar/);
  assert.equal(a.body, b.body, 'twee builds geven dezelfde feed');
  const uids = [...a.body.matchAll(/^UID:(.*)$/gm)].map((m) => m[1]);
  assert.ok(uids.includes('beaujolais-nouveau-2026-11-19@kalender-frankrijk'));
  assert.equal(new Set(uids).size, uids.length);
  assert.match(a.body, /^BEGIN:VCALENDAR\r\n/);
  assert.match(a.body, /END:VCALENDAR\r\n$/);
  assert.match(a.body, /DTSTART;VALUE=DATE:20261119\r\nDTEND;VALUE=DATE:20261120/);
  assert.match(a.body, /STATUS:TENTATIVE/, 'status te verifiëren komt met label en als voorlopig');
  assert.match(a.body, /SUMMARY:truffelseizoen \(te verifiëren\)/);
  for (const regel of a.body.split('\r\n')) assert.ok(Buffer.byteLength(regel) <= 75, `regel te lang: ${regel}`);
});

test('iCal alles, fiscale subfeeds en de wekelijkse Café Jeudi met tijdzone', () => {
  const alles = vraag('/ical/alles.ics').body;
  assert.ok(alles.includes('BEGIN:VTIMEZONE'));
  assert.ok(alles.includes('DTSTART;TZID=Europe/Paris:20261105T180000'));
  const nl = vraag('/ical/fiscaal-nederland.ics').body;
  assert.ok(nl.includes('AOW') === false, 'AOW is rubriek uitkeringen, geen fiscale NL-afspraak');
  const part = vraag('/ical/fiscaal-particulier.ics').body;
  assert.match(part, /IFI/);
  assert.ok(!/Btw-plichtige/.test(part));
  assert.match(vraag('/ical/fiscaal-ondernemer.ics').body, /Btw-plichtige/);
  assert.match(vraag('/ical/uitkeringen.ics').body, /AOW wordt uitbetaald/);
});

test('iCal: vouwen knipt niet midden in een teken', () => {
  const regel = vouw(`SUMMARY:${'é'.repeat(80)}`);
  for (const d of regel.split('\r\n ')) assert.ok(Buffer.byteLength(d) <= 75);
  assert.equal(regel.replace(/\r\n /g, ''), `SUMMARY:${'é'.repeat(80)}`);
});

test('themabeelden: PNG en SVG per rubriek', { skip: !existsSync(join(import.meta.dirname, '..', 'public', 'beeld', 'fiscaal.png')) }, () => {
  for (const r of RUBRIEKEN) {
    const png = readFileSync(join(import.meta.dirname, '..', 'public', 'beeld', `${r.id}.png`));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), 112);
    assert.equal(png.readUInt32BE(20), 112);
    assert.match(readFileSync(join(import.meta.dirname, '..', 'public', 'beeld', `${r.id}.svg`), 'utf8'), new RegExp(r.kleur));
  }
});
