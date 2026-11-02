import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AFNEMERS } from '../lib/afnemers.js';
import { RUBRIEKEN } from '../lib/model.js';
import { startpaginaHtml } from '../scripts/maak-startpagina.js';

const html = startpaginaHtml();

test('startpagina bevat beide bestemmingen en de knoptekst', () => {
  for (const a of Object.values(AFNEMERS)) {
    assert.ok(html.includes(`href="${a.url}"`), a.url);
    assert.ok(html.includes(a.knop), a.knop);
    assert.ok(html.includes(a.uitleg), a.uitleg);
  }
});

test('startpagina heeft een iCal-link voor elke rubriek en voor alles', () => {
  for (const r of RUBRIEKEN) assert.ok(html.includes(`href="/ical/${r.id}.ics"`), r.id);
  assert.ok(html.includes('href="/ical/alles.ics"'));
});

test('startpagina heeft kop, voet en geen verboden tekst', () => {
  assert.ok(html.includes('<h1>Kalender Frankrijk</h1>'));
  assert.ok(html.includes('href="https://www.communitiesabroad.com"'));
  assert.ok(!/[–—]/.test(html), 'lang streepje');
  assert.ok(!/ecosysteem/i.test(html), 'ecosysteem');
});

test('public/index.html is gelijk aan de gegenereerde pagina (draai npm run bouw)', () => {
  assert.equal(readFileSync(new URL('../public/index.html', import.meta.url), 'utf8'), html);
});
