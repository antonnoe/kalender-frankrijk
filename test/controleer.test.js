import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, appendFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { laadAlles, STANDAARD_BANNER } from '../lib/laden.js';
import { cafeJeudiVandaag } from '../lib/bronnen.js';

const FIX = join(import.meta.dirname, 'fixtures', 'root');
const SCRIPT = join(import.meta.dirname, '..', 'scripts', 'controleer.js');

function draai(root) {
  return spawnSync(process.execPath, [SCRIPT], { env: { ...process.env, KALENDER_ROOT: root }, encoding: 'utf8' });
}

test('npm run controleer: goede data geeft exitcode 0', () => {
  const r = draai(FIX);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /Alles in orde/);
});

test('npm run controleer: een fout blok geeft exitcode 1 met bestand en regelnummer', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'kf-'));
  try {
    cpSync(FIX, tmp, { recursive: true });
    appendFileSync(join(tmp, 'data', 'rubrieken', 'genieten.yaml'), `
- id: kapot
  titel: Kapotte datum
  rubriek: genieten
  doelgroepen: [iedereen]
  wanneer: {datum: 2026-11-31}
  tekst: Een zin.
  bron: {url: https://example.org/, gecontroleerd: 2026-11-02}
  status: vastgesteld
`);
    const r = draai(tmp);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /FOUT: genieten\.yaml regel \d+: datum 31-11-2026 bestaat niet/);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('zonder kopie van de banner geldt de vaste regel: elke donderdag', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'kf-'));
  try {
    cpSync(FIX, tmp, { recursive: true });
    rmSync(join(tmp, 'data', 'bron', 'cafe-jeudi.json'));
    const r = laadAlles(tmp);
    assert.deepEqual(r.banner, STANDAARD_BANNER);
    assert.ok(r.waarschuwingen.some((w) => /cafe-jeudi\.json ontbreekt/.test(w)));
    assert.ok(cafeJeudiVandaag(r.banner, '2026-11-05'));
    assert.equal(cafeJeudiVandaag(r.banner, '2026-11-06'), null);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
