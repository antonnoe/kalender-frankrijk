import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { leesIcs, ontstreep, fiscaleItems, feestdagItems, googleItems, schoolvakantieItems, verenigingItems, cafeJeudiVandaag, decodeer } from '../lib/bronnen.js';
import { laadVerrijking } from '../lib/verrijking.js';
import { laadAlles, ROOT } from '../lib/laden.js';

const FIX = join(import.meta.dirname, 'fixtures', 'root', 'data');
const lees = (n) => readFileSync(join(FIX, 'bron', n), 'utf8');
const verrijking = laadVerrijking(join(ROOT, 'data', 'verrijking-fiscaal.yaml'));

test('de verrijkingsregels zijn zelf geldig', () => {
  assert.deepEqual(verrijking.fouten, []);
  assert.ok(verrijking.regels.length >= 20);
});

test('lange streepjes in titels worden komma\'s', () => {
  assert.equal(ontstreep('Taxe foncière — uiterste betaaldatum'), 'Taxe foncière, uiterste betaaldatum');
  assert.equal(ontstreep('A – B — C'), 'A, B, C');
});

test('iCal: ontvouwen, ontsnappen en hele dagen', () => {
  const ev = leesIcs('BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261116\r\nDTEND;VALUE=DATE:20261117\r\nSUMMARY:Een\\, twee\r\n  en drie\r\nEND:VEVENT\r\n');
  assert.equal(ev[0].titel, 'Een, twee en drie');
  assert.equal(ev[0].start, '2026-11-16');
  assert.equal(ev[0].einde, '2026-11-16');
});

test('fiscale feed: verrijking, groep, streepjes en samenvoegen van dubbelen', () => {
  const r = fiscaleItems('particulier', lees('fiscaal-particulier.ics'), verrijking);
  assert.equal(r.ingelezen, 3);
  const ifi = r.items.find((i) => i.titel.includes('uiterste betaaldatum'));
  assert.equal(ifi.titel, 'Vermogensbelasting vastgoed (IFI), uiterste betaaldatum');
  assert.deepEqual(ifi.doelgroepen, ['huiseigenaar']);
  assert.deepEqual(ifi.aftellen, [14, 7, 1]);
  assert.equal(ifi.groep, 'ifi-2026');
  assert.match(ifi.link, /^https:\/\/infofrankrijk\.com\//);
  const online = r.items.find((i) => i.titel.includes('online'));
  assert.deepEqual(online.aftellen, []);
  assert.equal(online.groep, 'ifi-2026');
  const pas = r.items.find((i) => /maandafschrijving/.test(i.titel));
  assert.deepEqual(pas.aftellen, []);

  const pro = fiscaleItems('professionnel', lees('fiscaal-professionnel.ics'), verrijking);
  assert.equal(pro.ingelezen, 3);
  assert.equal(pro.samengevoegd, 1, 'twee keer "Btw-plichtige ondernemingen" op 13 november worden één item');
  assert.equal(pro.items.length, 2);
  for (const i of pro.items) {
    assert.deepEqual(i.doelgroepen, ['ondernemer']);
    assert.ok(!i.toon_in.includes('nieuwsbrief'), 'ondernemersitems staan standaard niet in de nieuwsbrief');
    assert.equal(i.rubriek, 'fiscaal');
  }
});

test('fiscale feed Nederland: AOW gaat naar rubriek uitkeringen', () => {
  const r = fiscaleItems('nederland', lees('fiscaal-nederland.ics'), verrijking);
  assert.equal(r.items[0].rubriek, 'uitkeringen');
  assert.deepEqual(r.items[0].doelgroepen, ['gepensioneerde']);
  assert.equal(r.items[0].gebied, 'Nederland');
});

test('id\'s van ingelezen items zijn stabiel en uniek', () => {
  const a = fiscaleItems('particulier', lees('fiscaal-particulier.ics'), verrijking).items.map((i) => i.id);
  const b = fiscaleItems('particulier', lees('fiscaal-particulier.ics'), verrijking).items.map((i) => i.id);
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, a.length);
});

test('feestdagen: Elzas-Moezel krijgt zijn eigen gebied, wettelijke dagen heel Frankrijk', () => {
  const items = feestdagItems(JSON.parse(lees('feestdagen.json')), '2026-11-02');
  const per = Object.fromEntries(items.map((i) => [i.wanneer.datum, i]));
  assert.equal(per['2026-11-01'].titel, 'Allerheiligen (Toussaint)');
  assert.equal(per['2026-11-01'].gebied, 'heel Frankrijk');
  assert.equal(per['2026-12-26'].gebied, 'Elzas-Moezel');
  assert.equal(per['2026-12-26'].titel, 'Tweede kerstdag');
  assert.equal(items.length, 4, 'dezelfde dag in beide gebieden is één item');
});

test('Google: aanvulling, nooit dubbel met een wettelijke feestdag', () => {
  const fr = googleItems('fr', lees('google-fr.ics'), { bekendeFeestdagen: new Set(['2026-11-11']), gecontroleerd: '2026-11-02' });
  assert.deepEqual(fr.map((i) => i.titel), ['Eerste advent']);
  const nl = googleItems('nl', lees('google-nl.ics'), { gecontroleerd: '2026-11-02' });
  assert.equal(nl[0].gebied, 'Nederland');
  assert.ok(!nl[0].toon_in.includes('nieuwsbrief'));
});

test('schoolvakanties: zones met dezelfde data gaan samen', () => {
  const items = schoolvakantieItems(JSON.parse(lees('schoolvakanties.json')), '2026-11-02');
  assert.equal(items.length, 2);
  assert.equal(items[0].titel, 'Herfstvakantie');
  assert.deepEqual(items[0].gebied, ['zone A', 'zone B', 'zone C']);
  assert.deepEqual(items[0].wanneer, { type: 'periode', van: '2026-10-17', tot: '2026-11-02' });
  assert.equal(items[1].titel, 'Voorjaarsvakantie zone C');
});

test('verenigingen: Café Jeudi wordt overgeslagen, de banner is leidend', () => {
  const items = verenigingItems(JSON.parse(lees('verenigingen.json')), '2026-11-02');
  assert.equal(items.length, 1);
  assert.equal(items[0].titel, 'Jeu de boules');
  assert.equal(decodeer('&#34;Côté&#34; &amp; Co'), '"Côté" & Co');
});

test('Café Jeudi alleen op donderdag en alleen als de banner aan staat', () => {
  const aan = JSON.parse(lees('cafe-jeudi.json'));
  assert.ok(cafeJeudiVandaag(aan, '2026-11-05'));
  assert.equal(cafeJeudiVandaag(aan, '2026-11-04'), null);
  assert.equal(cafeJeudiVandaag(aan, '2026-11-06'), null);
  assert.equal(cafeJeudiVandaag({ ...aan, aan: false }, '2026-11-05'), null);
  assert.equal(cafeJeudiVandaag({ ...aan, overslaan: ['2026-11-05'] }, '2026-11-05'), null);
  assert.equal(cafeJeudiVandaag(null, '2026-11-05'), null);
});

test('de echte kopie in data/bron: geen lange streepjes, geen dubbelen per dag, alle fiscale items binnen', { skip: !existsSync(join(ROOT, 'data/bron/fiscaal-particulier.ics')) }, () => {
  const r = laadAlles(ROOT);
  assert.deepEqual(r.fouten.filter((f) => !/\.yaml/.test(f)), []);
  const fiscaal = r.items.filter((i) => i.herkomst.startsWith('fiscaal-'));
  assert.ok(fiscaal.every((i) => !/[—–]/.test(i.titel)), 'geen lang streepje in titels');
  const sleutels = fiscaal.map((i) => `${i.herkomst}|${JSON.stringify(i.wanneer)}|${i.titel.toLowerCase()}`);
  assert.equal(new Set(sleutels).size, sleutels.length, 'geen dubbele items op dezelfde dag');
  const t = r.tellingen.fiscaal;
  const ingelezen = t.particulier.ingelezen + t.professionnel.ingelezen + t.nederland.ingelezen;
  const samengevoegd = t.particulier.samengevoegd + t.professionnel.samengevoegd + t.nederland.samengevoegd;
  assert.equal(fiscaal.length + samengevoegd, ingelezen, 'elk ingelezen fiscaal item is aanwezig of samengevoegd');
  assert.ok(ingelezen >= 500);
});
