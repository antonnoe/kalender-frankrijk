import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { route, vergeetData } from '../lib/api.js';
import { naamdagVoor, bonneFete, laadNaamdagen, controleerNaamdagen } from '../lib/naamdag.js';
import { dagUitLabel, wikiTekst, leesWikipedia, eersteNaam } from '../scripts/maak-naamdagen.js';

const ROOT = join(import.meta.dirname, '..');
const nd = laadNaamdagen(ROOT);
const feest = new Set(['2026-11-11', '2026-08-15']);

test('het echte bestand heeft 366 goede dagen en de controle meldt niets', () => {
  assert.deepEqual(controleerNaamdagen(nd), []);
  assert.equal(Object.keys(nd.dagen).length, 366);
  assert.ok(nd.dagen['02-29']);
  assert.match(nd.kop.bron, /Wikidata/);
  assert.match(nd.kop.bron, /oldid=\d+/);
});

test('steekproef: 9 november Théodore, feestdagen geen naamdag', () => {
  assert.deepEqual(naamdagVoor('2026-11-09', nd, feest), { namen: ['Théodore'], tekst: 'Bonne fête aux Théodore' });
  assert.equal(naamdagVoor('2026-11-11', nd, feest), null);
  assert.equal(naamdagVoor('2026-08-15', nd, feest), null);
  assert.equal(naamdagVoor('2026-01-02', nd, feest).tekst, 'Bonne fête aux Basile et Grégoire');
});

test('tekst: een, twee, drie namen; hooguit drie', () => {
  assert.equal(bonneFete(['A']), 'Bonne fête aux A');
  assert.equal(bonneFete(['A', 'B']), 'Bonne fête aux A et B');
  assert.equal(bonneFete(['A', 'B', 'C']), 'Bonne fête aux A, B et C');
  const vier = { dagen: { '05-19': { namen: ['Yves', 'Erwan', 'Erwana', 'Yvonne'], bron: 'wikidata' } } };
  assert.deepEqual(naamdagVoor('2026-05-19', vier, new Set()).namen, ['Yves', 'Erwan', 'Erwana']);
});

test('geen bestand of kapotte data: stil null', () => {
  assert.equal(naamdagVoor('2026-11-09', null, feest), null);
  assert.equal(naamdagVoor('2026-11-09', { dagen: null }, feest), null);
  assert.equal(naamdagVoor('2026-11-09', { dagen: { '11-09': { namen: 'Théodore' } } }, feest), null);
  assert.equal(naamdagVoor('2026-11-09', { dagen: { '11-09': { namen: [] } } }, feest), null);
  assert.equal(laadNaamdagen(join(ROOT, 'bestaat-niet')), null);
});

test('geen lange streepjes in de naamdagen', () => {
  assert.ok(!/[–—]/.test(JSON.stringify(nd)));
});

test('/api/vandaag geeft het veld naamdag, op een feestdag null', () => {
  vergeetData();
  const a = route('/api/vandaag', { datum: '2026-11-09' }, { host: 'x.test' });
  assert.equal(a.status, 200);
  assert.equal(JSON.parse(a.body).naamdag.tekst, 'Bonne fête aux Théodore');
  assert.equal(JSON.parse(route('/api/vandaag', { datum: '2026-11-11' }, { host: 'x.test' }).body).naamdag, null);
  assert.equal(JSON.parse(route('/api/vandaag', { datum: '2026-08-15' }, { host: 'x.test' }).body).naamdag, null);
  assert.equal(JSON.parse(route('/api/vandaag', { datum: '2027-05-01' }, { host: 'x.test' }).body).naamdag, null, '1 mei is een feestdag');
});

test('/api/vandaag werkt zonder naamdagenbestand: naamdag null, rest blijft', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'kfr-'));
  cpSync(join(ROOT, 'test', 'fixtures', 'root', 'data'), join(tmp, 'data'), { recursive: true });
  const r = route('/api/vandaag', { datum: '2026-11-09' }, { host: 'x.test' }, { root: tmp });
  const j = JSON.parse(r.body);
  assert.equal(r.status, 200);
  assert.equal(j.naamdag, null);
  assert.ok(Array.isArray(j.regels));
  vergeetData();
});

test('script: datumlabels en Wikipedia-regels', () => {
  assert.equal(dagUitLabel('1er janvier'), '01-01');
  assert.equal(dagUitLabel('29 février'), '02-29');
  assert.equal(dagUitLabel('30 février'), null);
  assert.equal(wikiTekst("[[Ananie de Damas|Ananie]], [[Conversion de Paul]]<ref name=\"x\" />"), 'Ananie, Conversion de Paul');
  assert.equal(eersteNaam('Ananie, Conversion de Paul'), 'Ananie');
  const w = leesWikipedia('== Janvier ==\n# [[Marie (mère de Jésus)|Marie, mère de Dieu]]<ref>x</ref>\n# Basile et Grégoire\n== Février ==\n# Ella');
  assert.deepEqual(w, { '01-01': 'Marie, mère de Dieu', '01-02': 'Basile et Grégoire', '02-01': 'Ella' });
});
