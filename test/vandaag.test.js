import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { laadAlles } from '../lib/laden.js';
import { vandaagInHetKort, kiesBanner, MAX_REGELS } from '../lib/engine.js';
import { plusDagen } from '../lib/datum.js';

const ROOT = join(import.meta.dirname, 'fixtures', 'root');
const res = laadAlles(ROOT);

const dagen = (van, tot) => { const u = []; for (let d = van; d <= tot; d = plusDagen(d, 1)) u.push(d); return u; };
const proef = (banner = res.banner) => Object.fromEntries(dagen('2026-11-02', '2026-11-15').map((d) => [d, vandaagInHetKort(res.items, banner, d)]));
const heeft = (v, id) => v.regels.some((r) => r.id === id);

test('de proefdata is geldig', () => {
  assert.deepEqual(res.fouten, []);
});

test('proef 2 tot en met 15 november: nooit meer dan vier regels', () => {
  for (const [d, v] of Object.entries(proef())) assert.ok(v.regels.length <= MAX_REGELS, `${d}: ${v.regels.length} regels`);
});

test('IFI komt op 2, 9 en 15 november in de aftelling en niet op andere dagen', () => {
  const ifi = Object.entries(proef()).filter(([, v]) => v.regels.some((r) => /IFI/.test(r.titel))).map(([d]) => d);
  assert.deepEqual(ifi, ['2026-11-02', '2026-11-09', '2026-11-15']);
  const v = vandaagInHetKort(res.items, res.banner, '2026-11-02');
  const regel = v.regels.find((r) => /IFI/.test(r.titel));
  assert.equal(regel.soort, 'aftelling');
  assert.equal(regel.kop, 'Over 14 dagen, maandag 16 november.');
  assert.equal(vandaagInHetKort(res.items, res.banner, '2026-11-15').regels.find((r) => /IFI/.test(r.titel)).kop, 'Morgen, maandag 16 november.');
});

test('de tweede periode van 1 november (winterbanden) schuift naar 3 november', () => {
  const p = proef();
  assert.ok(heeft(p['2026-11-02'], 'treve-hivernale'));
  assert.ok(!heeft(p['2026-11-02'], 'winterbanden-loi-montagne'));
  assert.ok(heeft(p['2026-11-03'], 'winterbanden-loi-montagne'));
  assert.ok(!heeft(p['2026-11-03'], 'treve-hivernale'));
  assert.ok(!heeft(p['2026-11-04'], 'winterbanden-loi-montagne'), 'een periode meldt zich maar één keer');
  assert.equal(p['2026-11-02'].regels.find((r) => r.id === 'treve-hivernale').kop, 'Sinds zondag 1 november, tot en met 31 maart.');
});

test('het schuiven is vast berekend uit de datum, zonder geheugen: dezelfde dag geeft altijd hetzelfde', () => {
  const a = vandaagInHetKort(res.items, res.banner, '2026-11-03');
  vandaagInHetKort(res.items, res.banner, '2026-11-10');
  const b = vandaagInHetKort(res.items, res.banner, '2026-11-03');
  assert.deepEqual(a, b);
});

test('Café Jeudi alleen op donderdag en alleen bij aan=true', () => {
  const aan = proef({ ...res.banner, aan: true });
  const uit = proef({ ...res.banner, aan: false });
  for (const [d, v] of Object.entries(aan)) {
    const donderdag = d === '2026-11-05' || d === '2026-11-12';
    assert.equal(heeft(v, 'cafe-jeudi'), donderdag, `aan, ${d}`);
    assert.equal(heeft(uit[d], 'cafe-jeudi'), false, `uit, ${d}`);
  }
  const r = aan['2026-11-05'].regels.find((x) => x.id === 'cafe-jeudi');
  assert.equal(r.soort, 'vandaag');
  assert.match(r.tekst, /18\.00 tot 19\.30/);
});

test('Café Jeudi en verenigingsactiviteiten van vandaag zijn samen één regel', () => {
  const v = vandaagInHetKort(res.items, res.banner, '2026-11-05');
  assert.equal(v.regels.filter((r) => r.soort === 'vandaag').length, 1);
  const v2 = vandaagInHetKort(res.items, res.banner, '2026-11-02');
  assert.match(v2.regels[0].tekst, /Jeu de boules/);
});

test('status te verifiëren komt nooit in de nieuwsbrief', () => {
  for (const [, v] of Object.entries(proef())) assert.ok(!heeft(v, 'truffel'));
});

test('ondernemersitems staan niet in de nieuwsbrief', () => {
  for (const [, v] of Object.entries(proef())) for (const r of v.regels) assert.ok(!/Bronheffing|Btw-plichtige/.test(r.titel));
});

test('Beaujolais nouveau: aftelling 14 en 1 dag vooraf', () => {
  assert.ok(heeft(vandaagInHetKort(res.items, res.banner, '2026-11-05'), 'beaujolais-nouveau'));
  assert.ok(heeft(vandaagInHetKort(res.items, res.banner, '2026-11-18'), 'beaujolais-nouveau'));
  assert.ok(!heeft(vandaagInHetKort(res.items, res.banner, '2026-11-12'), 'beaujolais-nouveau'));
});

test('seizoenstip: hooguit één per week, op maandag, en deterministisch', () => {
  const week = dagen('2026-11-02', '2026-11-08').map((d) => vandaagInHetKort(res.items, res.banner, d).regels.filter((r) => r.soort === 'tip').length);
  assert.equal(week.reduce((a, b) => a + b, 0), 1);
  assert.equal(week[0], 1);
  const tip = vandaagInHetKort(res.items, res.banner, '2026-11-02').regels.find((r) => r.soort === 'tip');
  assert.equal(tip.id, 'jacht-seizoen');
  assert.match(tip.tekst, /je hond/, 'in de nieuwsbrief staat de je-vorm');
  assert.equal(tip.gesprek, true);
  assert.match(tip.forum_url, /nederlanders\.fr\/profiles\/blog\/new/);
});

test('een deadline heeft geen forumlink', () => {
  const r = vandaagInHetKort(res.items, res.banner, '2026-11-02').regels.find((x) => x.soort === 'aftelling');
  assert.equal(r.gesprek, false);
  assert.equal(r.forum_url, null);
});

test('een link die de nieuwsbrief al als nieuws toont, vervalt hier', () => {
  const v = vandaagInHetKort(res.items, res.banner, '2026-11-02', { nieuwsLinks: ['https://infofrankrijk.com/fiscale-kalender-frankrijk/'] });
  assert.ok(!v.regels.some((r) => /IFI/.test(r.titel)));
  assert.ok(v.weggelaten.some((w) => /zelfde link/.test(w.reden)));
});

test('niets te melden: geen regels, het blok verdwijnt (geen opvulzin)', () => {
  const v = vandaagInHetKort(res.items, res.banner, '2026-11-04');
  assert.ok(v.regels.every((r) => r.soort !== 'tip'));
  const leeg = vandaagInHetKort([], null, '2026-11-04');
  assert.deepEqual(leeg.regels, []);
  assert.equal(leeg.banner, null);
});

test('feestbanner: hooguit één, alleen binnen de periode', () => {
  assert.equal(kiesBanner(res.items, '2027-01-03').tekst_nl, 'Gelukkig nieuwjaar');
  assert.equal(kiesBanner(res.items, '2027-01-03').tekst_fr, 'Bonne année');
  assert.equal(kiesBanner(res.items, '2027-01-07'), null);
  assert.equal(kiesBanner(res.items, '2026-11-02'), null);
});

test('feestdag: aftelling 3 en 1 dag vooraf en de dag zelf', () => {
  const k = (d) => vandaagInHetKort(res.items, res.banner, d).regels.find((r) => /Wapenstilstand/.test(r.titel));
  assert.ok(k('2026-11-08'));
  assert.ok(k('2026-11-10'));
  assert.equal(k('2026-11-11').soort, 'vandaag');
  assert.ok(!k('2026-11-09'));
});

test('niet meer dan vier regels, ook als alles tegelijk valt', () => {
  const veel = res.items.flatMap((i) => [i]);
  const extra = [];
  for (let n = 0; n < 6; n++) extra.push({ ...res.items.find((i) => i.id === 'beaujolais-nouveau'), id: `extra-${n}`, titel: `Extra ${n}`, wanneer: { type: 'datum', datum: '2026-11-19' } });
  const v = vandaagInHetKort([...veel, ...extra], res.banner, '2026-11-18');
  assert.ok(v.regels.length <= MAX_REGELS);
  assert.ok(v.weggelaten.length > 0);
});
