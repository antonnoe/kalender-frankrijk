import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maanVoor, momentenRond, parijsDag, FASEN } from '../lib/maan.js';
import { route } from '../lib/api.js';

const fix = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', 'maanfasen.json'), 'utf8'));
const Q = ['nieuwe-maan', 'eerste-kwartier', 'volle-maan', 'laatste-kwartier'];
const plus = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);

test('de fixture heeft twee onafhankelijke bronnen die op elke hoofdfase dezelfde UTC-dag geven', () => {
  assert.equal(fix.fasen.length, 58);
  for (const f of fix.fasen) assert.equal(f.imcce_dag_utc, f.utc.slice(0, 10), `${f.fase} ${f.utc}`);
});

test('elk berekend hoofdfasemoment ligt binnen 2 minuten van de USNO (op de minuut afgerond)', () => {
  for (const f of fix.fasen) {
    const m = momentenRond(f.utc.slice(0, 10)).filter((x) => Q[x.q] === f.fase).map((x) => Math.abs(x.tijd - new Date(f.utc)) / 60000);
    assert.ok(Math.min(...m) < 2, `${f.fase} ${f.utc}`);
  }
});

test('op elke officiële hoofdfasedatum (Franse tijd) komt de juiste hoofdfase uit', () => {
  for (const f of fix.fasen) {
    const dag = parijsDag(new Date(f.utc));
    assert.equal(maanVoor(dag)?.fase, f.fase, `${f.fase} ${f.utc} = ${dag}`);
  }
});

test('de dagen tussen twee hoofdfasen krijgen de tussenfase, nooit een gat of een sprong', () => {
  const volgorde = ['nieuwe-maan', 'wassende-sikkel', 'eerste-kwartier', 'wassende-maan', 'volle-maan', 'afnemende-maan', 'laatste-kwartier', 'afnemende-sikkel'];
  let vorig = null;
  for (let d = '2026-11-01'; d <= '2027-12-31'; d = plus(d, 1)) {
    const f = maanVoor(d);
    assert.ok(f && FASEN[f.fase] === f.naam, d);
    const i = volgorde.indexOf(f.fase);
    assert.ok(i >= 0, d);
    if (vorig !== null) assert.ok([0, 1, 2].includes((i - vorig + 8) % 8), `${d}: ${volgorde[vorig]} naar ${f.fase}`);
    vorig = i;
  }
});

test('steekproef: 9 november 2026 is nieuwe maan, 24 november volle maan, 17 november eerste kwartier', () => {
  assert.deepEqual(maanVoor('2026-11-09'), { fase: 'nieuwe-maan', naam: 'Nieuwe maan' });
  assert.equal(maanVoor('2026-11-24').fase, 'volle-maan');
  assert.equal(maanVoor('2026-11-17').fase, 'eerste-kwartier');
  assert.equal(maanVoor('2026-11-12').fase, 'wassende-sikkel');
  assert.equal(maanVoor('2026-11-20').fase, 'wassende-maan');
  assert.equal(maanVoor('2026-11-27').fase, 'afnemende-maan');
  assert.equal(maanVoor('2026-12-05').fase, 'afnemende-sikkel');
});

test('ongeldige datum geeft null, nooit een fout', () => {
  for (const d of [undefined, null, '', 'abc', '2026-13-45x', '1800-01-01', 12]) assert.equal(maanVoor(d), null);
});

test('/api/vandaag heeft het additieve veld maan en laat de rest zoals het was', async () => {
  const r = await route('/api/vandaag', { datum: '2026-11-09' });
  const b = JSON.parse(r.body);
  assert.deepEqual(b.maan, { fase: 'nieuwe-maan', naam: 'Nieuwe maan' });
  assert.ok('naamdag' in b && 'regels' in b && 'datum' in b);
});
