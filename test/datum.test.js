import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pasen, ndeWeekdag, leesRegel, regelInJaar, datumsVanRegel, plusDagen, weekdag, isoWeek, formatNL, zomertijdBegin, wintertijdBegin } from '../lib/datum.js';
import { leesWanneer, voorkomens } from '../lib/model.js';

const regel = (tekst, jaar) => regelInJaar(leesRegel(tekst), jaar);

test('Pasen 2026 tot en met 2028', () => {
  assert.equal(pasen(2026), '2026-04-05');
  assert.equal(pasen(2027), '2027-03-28');
  assert.equal(pasen(2028), '2028-04-16');
});

test('pasen +1 (Paasmaandag), pasen -2 (Goede Vrijdag), Hemelvaart en Pinksteren', () => {
  assert.equal(regel('pasen +1', 2026), '2026-04-06');
  assert.equal(regel('pasen -2', 2026), '2026-04-03');
  assert.equal(regel('pasen +1', 2027), '2027-03-29');
  assert.equal(regel('pasen -2', 2027), '2027-03-26');
  assert.equal(regel('pasen +39', 2027), '2027-05-06'); // Hemelvaart, ook in de data van calendrier.api.gouv.fr
  assert.equal(regel('pasen +1', 2028), '2028-04-17');
  assert.equal(regel('pasen', 2028), '2028-04-16');
});

test('derde donderdag van november (Beaujolais nouveau)', () => {
  assert.equal(regel('derde donderdag van november', 2026), '2026-11-19');
  assert.equal(regel('derde donderdag van november', 2027), '2027-11-18');
  assert.equal(regel('derde donderdag van november', 2028), '2028-11-16');
});

test('laatste zondag van maart en oktober (zomertijd en wintertijd)', () => {
  assert.equal(regel('laatste zondag van maart', 2026), '2026-03-29');
  assert.equal(regel('laatste zondag van maart', 2027), '2027-03-28');
  assert.equal(regel('laatste zondag van maart', 2028), '2028-03-26');
  assert.equal(wintertijdBegin(2026), '2026-10-25');
  assert.equal(zomertijdBegin(2027), '2027-03-28');
});

test('eerste maandag van september en andere telwoorden', () => {
  assert.equal(regel('eerste maandag van september', 2026), '2026-09-07');
  assert.equal(regel('eerste maandag van september', 2027), '2027-09-06');
  assert.equal(regel('eerste maandag van september', 2028), '2028-09-04');
  assert.equal(regel('tweede zondag van mei', 2026), '2026-05-10');
  assert.equal(regel('laatste zondag van mei', 2026), '2026-05-31');
});

test('jaarlijks DD-MM, en 29 februari valt in gewone jaren weg', () => {
  assert.equal(regel('jaarlijks 11-11', 2027), '2027-11-11');
  assert.equal(regel('jaarlijks 29-02', 2028), '2028-02-29');
  assert.equal(regel('jaarlijks 29-02', 2027), null);
  assert.throws(() => leesRegel('jaarlijks 31-11'), /datum die niet bestaat/);
});

test('regels worden in gewoon Nederlands afgekeurd', () => {
  assert.throws(() => leesRegel('om de week'), /niet te lezen/);
  assert.throws(() => leesRegel('vijftiende donderdag van november'), /niet te lezen/);
});

test('elke donderdag geeft alle donderdagen in een bereik', () => {
  const d = datumsVanRegel(leesRegel('elke donderdag'), '2026-11-01', '2026-11-30');
  assert.deepEqual(d, ['2026-11-05', '2026-11-12', '2026-11-19', '2026-11-26']);
});

test('periode over de jaargrens: jaarlijks 01-11 tot 31-03', () => {
  const w = leesWanneer('jaarlijks 01-11 tot 31-03');
  assert.deepEqual(voorkomens(w, '2027-01-10', '2027-01-20'), [{ start: '2026-11-01', end: '2027-03-31' }]);
  assert.deepEqual(voorkomens(w, '2027-06-01', '2027-06-30'), []);
  assert.deepEqual(voorkomens(w, '2027-10-30', '2027-11-03'), [{ start: '2027-11-01', end: '2028-03-31' }]);
});

test('periode met regels: Pasen van Goede Vrijdag tot Paasmaandag', () => {
  const w = leesWanneer('pasen -2 tot pasen +1');
  assert.deepEqual(voorkomens(w, '2027-03-01', '2027-04-30'), [{ start: '2027-03-26', end: '2027-03-29' }]);
});

test('wanneer in alle vormen', () => {
  assert.equal(leesWanneer({ datum: '2026-11-16' }).type, 'datum');
  assert.equal(leesWanneer({ van: '2026-11-01', tot: '2027-03-31' }).type, 'periode');
  assert.equal(leesWanneer({ regel: 'jaarlijks 11-11' }).type, 'regel');
  assert.equal(leesWanneer({ van: '01-11', tot: '31-03' }).type, 'periode-regel');
  assert.equal(leesWanneer({ datums: ['2027-03-01', '2026-11-16'] }).datums[0], '2026-11-16');
  assert.match(leesWanneer({ datum: '2026-11-31' }).fout, /31-11-2026 bestaat niet/);
  assert.match(leesWanneer({ van: '2027-03-31', tot: '2026-11-01' }).fout, /vóór/);
});

test('weekdagen, weeknummers en opmaak', () => {
  assert.equal(weekdag('2026-11-02'), 1);
  assert.equal(plusDagen('2026-11-30', 1), '2026-12-01');
  assert.deepEqual(isoWeek('2026-11-02'), { jaar: 2026, week: 45 });
  assert.equal(formatNL('2026-11-16'), 'maandag 16 november');
});
