import test from 'node:test';
import assert from 'node:assert/strict';
import { maandDagen, weekDagen, filterPerRubriek, dagenMetItems, rubriekenMetItems, schakelRubriek, bepaalWeergave, paneelNaIndex, leesMeerTekst } from '../public/kalender/kalender-weergave.js';

test('maandDagen: november 2026 begint op zondag 1 en dekt hele weken', () => {
  const dagen = maandDagen('2026-11-16');
  assert.equal(dagen.length % 7, 0);
  assert.equal(dagen[0].datum, '2026-10-26'); // maandag van de week van 1 november
  assert.equal(dagen[dagen.length - 1].datum, '2026-12-06'); // zondag van de week van 30 november
  assert.equal(dagen.find((d) => d.datum === '2026-11-01').inMaand, true);
  assert.equal(dagen.find((d) => d.datum === '2026-10-26').inMaand, false);
  assert.equal(dagen.find((d) => d.datum === '2026-12-01').inMaand, false);
});

test('maandDagen: februari 2027 (28 dagen, begint op maandag) heeft precies 28 of 35 dagen in rooster', () => {
  const dagen = maandDagen('2027-02-10');
  assert.equal(dagen.length % 7, 0);
  assert.equal(dagen.filter((d) => d.inMaand).length, 28);
  assert.equal(dagen[0].datum, '2027-02-01'); // 1 februari 2027 is een maandag
});

test('maandDagen: februari 2028 (schrikkeljaar, 29 dagen)', () => {
  const dagen = maandDagen('2028-02-14');
  assert.equal(dagen.filter((d) => d.inMaand).length, 29);
  assert.ok(dagen.some((d) => d.datum === '2028-02-29' && d.inMaand));
});

test('maandDagen: jaarovergang december naar januari', () => {
  const dagen = maandDagen('2026-12-24');
  assert.ok(dagen.some((d) => d.datum === '2026-12-01' && d.inMaand));
  assert.ok(dagen.some((d) => d.datum === '2026-12-31' && d.inMaand));
  assert.ok(dagen.some((d) => d.datum === '2027-01-01' && !d.inMaand));
});

test('weekDagen: altijd zeven dagen, van maandag tot en met zondag', () => {
  const dagen = weekDagen('2026-11-19'); // donderdag
  assert.equal(dagen.length, 7);
  assert.equal(dagen[0].datum, '2026-11-16'); // maandag
  assert.equal(dagen[6].datum, '2026-11-22'); // zondag
  assert.ok(dagen.every((d) => d.inMaand === true));
});

test('weekDagen: een zondag telt als laatste dag van de eigen week, niet als eerste van de volgende', () => {
  const dagen = weekDagen('2026-11-22'); // zondag
  assert.equal(dagen[0].datum, '2026-11-16');
  assert.equal(dagen[6].datum, '2026-11-22');
});

test('filterPerRubriek: lege of ontbrekende rubriek laat alles staan', () => {
  const items = [{ id: 'a', rubriek: 'genieten' }, { id: 'b', rubriek: 'fiscaal' }];
  assert.deepEqual(filterPerRubriek(items, ''), items);
  assert.deepEqual(filterPerRubriek(items, undefined), items);
});

test('filterPerRubriek: houdt alleen items van de gekozen rubriek over', () => {
  const items = [{ id: 'a', rubriek: 'genieten' }, { id: 'b', rubriek: 'fiscaal' }, { id: 'c', rubriek: 'genieten' }];
  const gefilterd = filterPerRubriek(items, 'genieten');
  assert.deepEqual(gefilterd.map((i) => i.id), ['a', 'c']);
});

test('filterPerRubriek: een rubriek zonder items geeft een lege lijst, geen fout', () => {
  const items = [{ id: 'a', rubriek: 'genieten' }];
  assert.deepEqual(filterPerRubriek(items, 'moestuin'), []);
});

const perDag = {
  '2026-11-03': [{ item: { id: 'a', rubriek: 'fiscaal' } }, { item: { id: 'b', rubriek: 'genieten' } }],
  '2026-11-10': [{ item: { id: 'c', rubriek: 'genieten' } }],
  '2026-11-24': [{ item: { id: 'd', rubriek: 'fiscaal' } }],
};
const novemberDatums = maandDagen('2026-11-16').filter((d) => d.inMaand).map((d) => d.datum);

test('dagenMetItems: de maandlijst bevat alleen dagen met items, op volgorde', () => {
  assert.equal(novemberDatums.length, 30);
  assert.deepEqual(dagenMetItems(novemberDatums, perDag, ''), ['2026-11-03', '2026-11-10', '2026-11-24']);
});

test('dagenMetItems: het rubriekfilter laat alleen dagen met die rubriek over', () => {
  assert.deepEqual(dagenMetItems(novemberDatums, perDag, 'fiscaal'), ['2026-11-03', '2026-11-24']);
  assert.deepEqual(dagenMetItems(novemberDatums, perDag, 'stemmen'), []);
});

test('rubriekenMetItems: een rubriek zonder items in de periode ontbreekt (grijze knop)', () => {
  const heeft = rubriekenMetItems(perDag);
  assert.equal(heeft.fiscaal, true);
  assert.equal(heeft.genieten, true);
  assert.equal(heeft.stemmen, undefined);
  assert.deepEqual(rubriekenMetItems({}), {});
  assert.deepEqual(rubriekenMetItems(undefined), {});
});

test('filterPerRubriek: werkt ook op kalenderregels met het item erin', () => {
  const regels = [{ item: { id: 'a', rubriek: 'fiscaal' }, vk: {} }, { item: { id: 'b', rubriek: 'genieten' }, vk: {} }];
  assert.deepEqual(filterPerRubriek(regels, 'genieten').map((r) => r.item.id), ['b']);
});

test('bepaalWeergave: een gewone laptop of desktop verandert niet', () => {
  assert.deepEqual(bepaalWeergave(1300, 1920), { smal: false, schaal: 1 });
  assert.deepEqual(bepaalWeergave(925, 1440), { smal: false, schaal: 1 });
  assert.deepEqual(bepaalWeergave(701, 1920), { smal: false, schaal: 1 });
});

test('bepaalWeergave: een smal venster is smal zonder schaal', () => {
  assert.deepEqual(bepaalWeergave(390, 390), { smal: true, schaal: 1 });
  assert.deepEqual(bepaalWeergave(699, 1920), { smal: true, schaal: 1 });
});

test('bepaalWeergave: telefoon in een brede pagina (iframe van 925 px, scherm 390 px) is smal met schaal', () => {
  const w = bepaalWeergave(925, 390);
  assert.equal(w.smal, true);
  assert.ok(Math.abs(w.schaal - 925 / 390) < 1e-9);
  // tablet of liggende telefoon met scherm vanaf 700 px: geen telefoon
  assert.equal(bepaalWeergave(925, 768).smal, false);
  // venster minder dan anderhalf keer het scherm: geen schaal
  assert.equal(bepaalWeergave(560, 390).schaal, 1);
});

test('schakelRubriek: Alles, erbij, eraf en terug naar Alles', () => {
  assert.deepEqual(schakelRubriek([], 'fiscaal'), ['fiscaal']); // Alles aan: alleen die rubriek
  assert.deepEqual(schakelRubriek(['fiscaal'], 'school'), ['fiscaal', 'school']);
  assert.deepEqual(schakelRubriek(['fiscaal', 'school'], 'fiscaal'), ['school']);
  assert.deepEqual(schakelRubriek(['school'], 'school'), []); // niets meer aan: terug naar Alles
  assert.deepEqual(schakelRubriek(['fiscaal', 'school'], ''), []); // klik op Alles
});

test('filterPerRubriek: meerdere rubrieken tegelijk laten de items van beide over', () => {
  const items = [{ id: 'a', rubriek: 'fiscaal' }, { id: 'b', rubriek: 'school' }, { id: 'c', rubriek: 'zorg' }];
  assert.deepEqual(filterPerRubriek(items, ['fiscaal', 'school']).map((i) => i.id), ['a', 'b']);
  assert.deepEqual(filterPerRubriek(items, []).map((i) => i.id), ['a', 'b', 'c']);
  const regels = items.map((item) => ({ item }));
  assert.deepEqual(filterPerRubriek(regels, ['zorg', 'school']).map((r) => r.item.id), ['b', 'c']);
});

test('paneelNaIndex: het paneel komt na de laatste cel van de weekrij van de gekozen dag', () => {
  const dagen = maandDagen('2026-11-16'); // 26 oktober tot en met 6 december, zes weken
  assert.equal(paneelNaIndex(dagen, '2026-10-26'), 6);
  assert.equal(paneelNaIndex(dagen, '2026-11-01'), 6); // zondag is de laatste dag van zijn rij
  assert.equal(paneelNaIndex(dagen, '2026-11-02'), 13);
  assert.equal(paneelNaIndex(dagen, '2026-11-20'), 27);
  assert.equal(paneelNaIndex(dagen, '2026-12-06'), 41);
  assert.equal(paneelNaIndex(weekDagen('2026-11-18'), '2026-11-18'), 6);
});

test('paneelNaIndex: zonder gekozen dag (na bladeren) of een dag buiten het rooster geen paneel', () => {
  const dagen = maandDagen('2026-12-01');
  assert.equal(paneelNaIndex(dagen, null), -1);
  assert.equal(paneelNaIndex(dagen, undefined), -1);
  assert.equal(paneelNaIndex(dagen, '2026-11-16'), -1);
});

test('opmaak: weergave via klasse en schaalvariabele, geen media query op de breedte', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../public/kalender/kalender.css', import.meta.url), 'utf8');
  const js = readFileSync(new URL('../public/kalender/kalender.js', import.meta.url), 'utf8');
  assert.ok(!/@media[^{]*(min|max)-width/.test(css), 'geen media query op de breedte');
  assert.ok(css.includes('.kal-breed .kal-rooster') && css.includes('--kal-s'));
  assert.ok(js.includes("'kal-breed'") && js.includes('--kal-s') && js.includes("type: 'kalender-hoogte'"));
});

test('linktekst: vercel.app-host met naam, zonder naam, en gewone host', () => {
  assert.equal(leesMeerTekst('https://moestuin-fr.vercel.app/x'), 'Lees meer op de moestuintool ↗');
  assert.equal(leesMeerTekst('https://kalender-frankrijk.vercel.app/'), 'Lees meer op Kalender Frankrijk ↗');
  assert.equal(leesMeerTekst('https://iets-anders.vercel.app/a'), 'Lees meer ↗');
  assert.equal(leesMeerTekst('https://www.service-public.fr/p'), 'Lees meer op service-public.fr ↗');
});
