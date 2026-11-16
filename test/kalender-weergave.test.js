import test from 'node:test';
import assert from 'node:assert/strict';
import { maandDagen, weekDagen, filterPerRubriek } from '../public/kalender/kalender-weergave.js';

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
