import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { departementVanPostcode, departementUitTekst, leesDep } from '../lib/gebied.js';
import { verenigingItems } from '../lib/bronnen.js';
import { vandaagInHetKort } from '../lib/engine.js';
import { laadAlles } from '../lib/laden.js';
import { route, vergeetData } from '../lib/api.js';

const ROOT = join(import.meta.dirname, 'fixtures', 'root');
const res = laadAlles(ROOT);

test('postcode naar departement: gewoon, overzee, Corsica, onzin', () => {
  assert.equal(departementVanPostcode('11120'), '11');
  assert.equal(departementVanPostcode('01000'), '01');
  assert.equal(departementVanPostcode('75008'), '75');
  assert.equal(departementVanPostcode('97400'), '974');
  assert.equal(departementVanPostcode('97100'), '971');
  assert.equal(departementVanPostcode('98800'), '988');
  assert.equal(departementVanPostcode('98000'), null, 'Monaco is geen departement');
  assert.equal(departementVanPostcode('20000'), '2A');
  assert.equal(departementVanPostcode('20090'), '2A'); // Ajaccio
  assert.equal(departementVanPostcode('20199'), '2A');
  assert.equal(departementVanPostcode('20200'), '2B'); // Bastia
  assert.equal(departementVanPostcode('20600'), '2B');
  assert.equal(departementVanPostcode('20699'), '2B');
  assert.equal(departementVanPostcode('20700'), null);
  assert.equal(departementVanPostcode('00100'), null);
  assert.equal(departementVanPostcode('99000'), null);
  assert.equal(departementVanPostcode('1234'), null);
});

test('departement uit tekst: alleen vijf cijfers, bij twijfel niets', () => {
  assert.equal(departementUitTekst('1 Pl. du Marché, 11120 Ginestas'), '11');
  assert.equal(departementUitTekst('Saint-Paul-de-Vence'), null);
  assert.equal(departementUitTekst('online'), null);
  assert.equal(departementUitTekst('12 rue 123456 Lyon'), null, 'zes cijfers is geen postcode');
  assert.equal(departementUitTekst('Salle des fêtes, 20000 Ajaccio'), '2A');
  assert.equal(departementUitTekst('11120 Ginestas of 24100 Bergerac'), null, 'twee departementen: onzeker');
  assert.equal(departementUitTekst('11120 Ginestas, 11120 Ginestas'), '11');
  assert.equal(departementUitTekst(null), null);
});

const bron = { meta: { laatst_bijgewerkt: '2026-11-09' }, verenigingen: [
  { id: 'nvlr', afkorting: 'NVLR', naam: 'NVLR', events: [
    { datum: '2026-11-09', titel: 'Bijpraatlunch Ginestas', plaats: '1 Pl. du Marché, 11120 Ginestas', tijd: '12:00-14:00', bron: 'https://www.nvlr.eu/_ical/public.ics' },
    { datum: '2026-11-09', titel: 'Wandeling', plaats: 'Bergerac', tijd: '10:00-12:00', bron: 'https://www.nvlr.eu/_ical/public.ics' },
    { datum: '2026-11-09', titel: 'Borrel in Ajaccio', plaats: 'Cours Napoléon, 20000 Ajaccio', tijd: '18:00-20:00', bron: 'https://www.nvlr.eu/_ical/public.ics' },
  ] },
] };
const ver = verenigingItems(bron, '2026-11-09');
const gebied = (t) => ver.find((i) => i.titel === t).gebied;

test('verenigingsitems krijgen het departement uit de postcode (Ginestas 11, Corsica 2A, zonder postcode onbekend)', () => {
  assert.deepEqual(gebied('Bijpraatlunch Ginestas'), ['11']);
  assert.deepEqual(gebied('Borrel in Ajaccio'), ['2A']);
  assert.equal(gebied('Wandeling'), 'heel Frankrijk', 'zonder postcode geen departement (bij verenigingen: onbekend)');
});

const alles = [...res.items, ...ver];
const titels = (v) => v.regels.map((r) => r.tekst).join(' | ');

test('/api/vandaag zonder dep blijft zoals het was', () => {
  const zonder = vandaagInHetKort(alles, res.banner, '2026-11-09');
  const leeg = vandaagInHetKort(alles, res.banner, '2026-11-09', {});
  assert.deepEqual(zonder, leeg);
  assert.match(titels(zonder), /Ginestas/);
  assert.match(titels(zonder), /Wandeling/);
  assert.match(titels(zonder), /Ajaccio/);
});

test('dep=11: Ginestas erin, de rest van de verenigingsregels eruit', () => {
  const t = titels(vandaagInHetKort(alles, res.banner, '2026-11-09', { dep: leesDep('11') }));
  assert.match(t, /Ginestas/);
  assert.doesNotMatch(t, /Wandeling|Ajaccio/);
});

test('dep=24 en dep=geen: geen verenigingsregel, de andere regels blijven', () => {
  const basis = vandaagInHetKort(res.items, res.banner, '2026-11-09');
  for (const dep of ['24', 'geen']) {
    const v = vandaagInHetKort(alles, res.banner, '2026-11-09', { dep: leesDep(dep) });
    assert.ok(!v.regels.some((r) => r.rubriek === 'verenigingen'), dep);
    assert.deepEqual(v.regels.map((r) => r.id), basis.regels.map((r) => r.id).filter((id) => !/^vereniging-/.test(id)), dep);
  }
});

test('dep=2A pakt Corsica, een item zonder gebied telt nooit mee', () => {
  const t = titels(vandaagInHetKort(alles, res.banner, '2026-11-09', { dep: leesDep('2a') }));
  assert.match(t, /Ajaccio/);
  assert.doesNotMatch(t, /Wandeling|Ginestas/);
});

test('Café Jeudi blijft bij elke dep, ook dep=geen', () => {
  for (const dep of ['11', 'geen']) {
    const v = vandaagInHetKort(alles, res.banner, '2026-11-05', { dep: leesDep(dep) });
    assert.ok(v.regels.some((r) => r.id === 'cafe-jeudi'), dep);
  }
});

test('leesDep: ontbreekt, geldig, ongeldig (wordt geen)', () => {
  assert.equal(leesDep(undefined), null);
  assert.deepEqual(leesDep('11'), { modus: 'dep', dep: '11' });
  assert.deepEqual(leesDep('2b'), { modus: 'dep', dep: '2B' });
  assert.deepEqual(leesDep('974'), { modus: 'dep', dep: '974' });
  assert.deepEqual(leesDep('GEEN'), { modus: 'geen' });
  for (const k of ['', '20', '99', '1', 'abc', '11120', ['11', '24']]) assert.deepEqual(leesDep(k), { modus: 'geen' }, String(k));
});

test('de route: zonder parameter exact hetzelfde antwoord, met dep=geen of een ander departement zonder Jeu de boules', () => {
  vergeetData();
  const nu = new Date('2026-11-02T10:00:00Z');
  const basis = route('/api/vandaag', { datum: '2026-11-02' }, {}, { root: ROOT, nu });
  const zonder = JSON.parse(basis.body);
  assert.match(JSON.stringify(zonder.regels), /Jeu de boules/);
  assert.deepEqual(JSON.parse(route('/api/vandaag', { datum: '2026-11-02', dep: undefined }, {}, { root: ROOT, nu }).body), zonder);
  for (const dep of ['geen', '06', 'rommel']) {
    const r = JSON.parse(route('/api/vandaag', { datum: '2026-11-02', dep }, {}, { root: ROOT, nu }).body);
    assert.doesNotMatch(JSON.stringify(r.regels), /Jeu de boules/, dep);
  }
  // de cache werkt op de volledige URL, dus met de query: de header bevat geen Vary, de query maakt de sleutel
  assert.match(basis.headers['cache-control'], /s-maxage/);
});
