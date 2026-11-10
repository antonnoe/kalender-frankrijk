// Tests bij herstelronde 1 (REGIE.md): ontdubbelen over bronnen, één seizoensregel per week, controle van de data,
// Café Jeudi live, statustelling en de bron-url van verenigingsitems.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { ontdubbel, naamVerenigingBijGelijkeTitel, titelSleutel, normaliseerTitel } from '../lib/ontdubbel.js';
import { itemsInBereik, vandaagInHetKort, tellingKomende60, tellingTeVerifieren } from '../lib/engine.js';
import { leesBlokken } from '../lib/yamlladen.js';
import { valideerItem, controleerGebied } from '../lib/model.js';
import { verenigingItems, zinsopbouw, cafeJeudiItem } from '../lib/bronnen.js';
import { liveBanner } from '../lib/banner.js';
import { routeLive } from '../lib/api.js';
import { bouwIcs } from '../lib/ical.js';
import { laadAlles } from '../lib/laden.js';
import { plusDagen } from '../lib/datum.js';

const ROOT = join(import.meta.dirname, 'fixtures', 'root');

let teller = 0;
function maak(extra) {
  teller++;
  return {
    id: `t-${teller}`, titel: 'Test', rubriek: 'feestdagen', doelgroepen: ['iedereen'], wanneer: { type: 'datum', datum: '2026-12-25' },
    soort: 'datum', aftellen: [], aftellen_expliciet: true, gebied: 'heel Frankrijk', tekst: 'Een zin.', tekst_je: null, tekst_u: null, link: null,
    bron: { url: 'https://example.org/', gecontroleerd: '2026-11-02' }, status: 'vastgesteld', toon_in: ['nieuwsbrief', 'pagina', 'infopoche'],
    toon_in_expliciet: true, groep: null, gesprek: false, tijd: null, herkomst: 'eigen', ...extra,
  };
}
const datum = (d) => ({ type: 'datum', datum: d });
const dubbelen = (items, van, tot) => {
  const per = new Map();
  for (const i of itemsInBereik(items, van, tot)) for (const v of i.voorkomens) {
    const k = `${v.van}|${normaliseerTitel(i.titel)}`;
    per.set(k, (per.get(k) ?? 0) + 1);
  }
  return [...per].filter(([, n]) => n > 1).map(([k]) => k);
};

// ---------- 1. ontdubbelen over bronnen ----------

test('titelsleutel: kleine letters, zonder accenten en leestekens, en bekende vertaalparen', () => {
  assert.equal(normaliseerTitel('Pâques, "Lundi" de'), 'paques lundi de');
  assert.equal(titelSleutel('Eerste Kerstdag'), titelSleutel('Jour de Noël'));
  assert.equal(titelSleutel('Jour de l\'an'), titelSleutel('Nieuwjaarsdag'));
  assert.equal(titelSleutel('Ascension'), titelSleutel('Hemelvaartsdag'));
  assert.equal(titelSleutel('Vendredi saint'), titelSleutel('Goede Vrijdag'));
  assert.equal(titelSleutel('Lundi de Pâques'), titelSleutel('Paasmaandag'));
  assert.equal(titelSleutel('Fête nationale'), titelSleutel('Nationale feestdag (14 juillet)'));
  assert.equal(titelSleutel('14 juillet'), titelSleutel('Fête nationale'));
  assert.equal(titelSleutel('Christmas Eve'), titelSleutel('Kerstavond'));
  assert.notEqual(titelSleutel('Sinterklaas'), titelSleutel('Sinterklaasavond'));
});

test('dezelfde feestdag uit calendrier én Google NL wordt één item met het gebied van beide', () => {
  const fr = maak({ id: 'fd-fr', titel: 'Eerste kerstdag', herkomst: 'feestdagen' });
  const nl = maak({ id: 'g-nl', titel: 'Eerste Kerstdag', herkomst: 'google-nl', gebied: 'Nederland' });
  const { items } = ontdubbel([nl, fr]);
  const lijst = itemsInBereik(items, '2026-12-20', '2026-12-31');
  assert.equal(lijst.length, 1);
  assert.equal(lijst[0].id, 'fd-fr', 'de officiële bron wint van Google');
  assert.deepEqual(lijst[0].gebied, ['heel Frankrijk', 'Nederland']);
});

test('voorrang: eigen item wint van de officiële bron, die wint van Google; ook via een vertaalpaar', () => {
  const eigen = maak({ id: 'eigen-nieuwjaar', titel: 'Nieuwjaarsdag', wanneer: datum('2027-01-01') });
  const off = maak({ id: 'off-nieuwjaar', titel: 'Jour de l\'an', herkomst: 'feestdagen', wanneer: datum('2027-01-01') });
  const google = maak({ id: 'g-nieuwjaar', titel: 'Nieuwjaarsdag', herkomst: 'google-nl', gebied: 'Nederland', wanneer: datum('2027-01-01') });
  const lijst = itemsInBereik(ontdubbel([google, off, eigen]).items, '2027-01-01', '2027-01-01');
  assert.deepEqual(lijst.map((i) => i.id), ['eigen-nieuwjaar']);
});

test('een banner telt niet mee als item in /api/items; Koningsdag komt één keer voor', () => {
  const banner = maak({ id: 'banner-koningsdag', titel: 'Koningsdag', soort: 'banner', wanneer: { type: 'periode', van: '2027-04-25', tot: '2027-04-27' } });
  const eigen = maak({ id: 'koningsdag', titel: 'Koningsdag', gebied: 'Nederland', wanneer: datum('2027-04-27') });
  const google = maak({ id: 'g-koningsdag', titel: 'Koningsdag', herkomst: 'google-nl', gebied: 'Nederland', wanneer: datum('2027-04-27') });
  const items = ontdubbel([banner, eigen, google]).items;
  const lijst = itemsInBereik(items, '2027-04-20', '2027-04-30');
  assert.deepEqual(lijst.map((i) => i.id), ['koningsdag']);
  assert.ok(items.includes(banner), 'de banner blijft bestaan voor /api/vandaag');
});

test('een regel (Goede Vrijdag via Pasen) en een vaste datum van een andere bron worden op die dag samengevoegd', () => {
  const regel = maak({ id: 'goede-vrijdag', titel: 'Goede Vrijdag', wanneer: { type: 'regel', tekst: 'pasen -2', regel: { soort: 'pasen', offset: -2 } } });
  const off = maak({ id: 'off-gv', titel: 'Vendredi saint', herkomst: 'feestdagen', wanneer: datum('2027-03-26') });
  const anderJaar = maak({ id: 'off-gv-2028', titel: 'Vendredi saint', herkomst: 'feestdagen', wanneer: datum('2028-04-14') });
  const items = ontdubbel([regel, off, anderJaar]).items;
  assert.equal(itemsInBereik(items, '2027-03-26', '2027-03-26').length, 1);
  assert.equal(itemsInBereik(items, '2028-04-14', '2028-04-14').length, 1);
  assert.equal(items.length, 1, 'beide losse datums zijn opgegaan in de regel');
});

test('"Tweede kerstdag vrij in Elzas-Moezel" neemt de officiële dag op, maar niet Nederland', () => {
  const eigen = maak({ id: 'elzas-26-dec', titel: 'Tweede kerstdag vrij in Elzas-Moezel', gebied: 'Elzas-Moezel', wanneer: datum('2026-12-26') });
  const off = maak({ id: 'off-2e', titel: 'Tweede kerstdag', herkomst: 'feestdagen', gebied: 'Elzas-Moezel', wanneer: datum('2026-12-26') });
  const nl = maak({ id: 'g-2e', titel: 'Tweede Kerstdag', herkomst: 'google-nl', gebied: 'Nederland', wanneer: datum('2026-12-26') });
  const lijst = itemsInBereik(ontdubbel([eigen, off, nl]).items, '2026-12-26', '2026-12-26');
  assert.deepEqual(lijst.map((i) => i.id).sort(), ['elzas-26-dec', 'g-2e']);
  assert.equal(lijst.find((i) => i.id === 'elzas-26-dec').gebied, 'Elzas-Moezel');
});

test('verenigingsactiviteiten met gelijke titel van twee verenigingen blijven apart en krijgen de verenigingsnaam', () => {
  const a = maak({ id: 'v-a', titel: 'Sinterklaasfeest', herkomst: 'verenigingen', vereniging: 'NLVP', wanneer: datum('2026-12-06') });
  const b = maak({ id: 'v-b', titel: 'Sinterklaasfeest', herkomst: 'verenigingen', vereniging: 'Cercle NL Lille', wanneer: datum('2026-12-06') });
  const c = maak({ id: 'v-c', titel: 'Sinterklaasfeest NVLR', herkomst: 'verenigingen', vereniging: 'NVLR', wanneer: datum('2026-12-06') });
  naamVerenigingBijGelijkeTitel([a, b, c]);
  const items = ontdubbel([a, b, c]).items;
  assert.equal(items.length, 3);
  assert.equal(a.titel, 'Sinterklaasfeest (NLVP)');
  assert.equal(b.titel, 'Sinterklaasfeest (Cercle NL Lille)');
  assert.equal(c.titel, 'Sinterklaasfeest NVLR', 'een titel met de naam erin blijft ongemoeid');
  const alleen = maak({ id: 'v-d', titel: 'Wandeling', herkomst: 'verenigingen', vereniging: 'NVLR', wanneer: datum('2026-12-07') });
  naamVerenigingBijGelijkeTitel([alleen]);
  assert.equal(alleen.titel, 'Wandeling');
});

test('de echte data: 20 december 2026 tot 7 januari 2027 heeft geen dubbele titels per dag', () => {
  const r = laadAlles();
  assert.deepEqual(dubbelen(r.items, '2026-12-20', '2027-01-07'), []);
  assert.ok(!itemsInBereik(r.items, '2026-12-20', '2027-01-07').some((i) => i.soort === 'banner'));
});

// ---------- 2. één seizoensregel per week ----------

test('hooguit één seizoensregel per ISO-week, tip en aftelling samen', () => {
  const seizoen = (id, extra) => maak({
    id, titel: id, rubriek: 'wonen', soort: 'seizoen', gesprek: true, wanneer: { type: 'periode', van: '2026-10-01', tot: '2027-03-31' }, ...extra,
  });
  // een tip (maandag) en een seizoensitem met aftelling op woensdag 18 november: samen één regel in die week
  const tipItem = seizoen('tip-a', {});
  const aftel = seizoen('seizoen-met-aftelling', { wanneer: datum('2026-11-20'), aftellen: [2] });
  const items = [tipItem, aftel];
  const week = [];
  for (let d = '2026-11-16'; d <= '2026-11-22'; d = plusDagen(d, 1)) week.push(vandaagInHetKort(items, null, d));
  const seizoensregels = week.flatMap((v) => v.regels).filter((r) => r.soort === 'tip' || r.id === 'seizoen-met-aftelling');
  assert.equal(seizoensregels.length, 1);
  assert.equal(seizoensregels[0].soort, 'tip', 'wie het eerst in de week aan de beurt is, houdt zijn regel');
  assert.ok(week[2].weggelaten.some((w) => w.id === 'seizoen-met-aftelling' && /seizoensregel/.test(w.reden)));
  // met één seizoensitem in de week: ook dan één regel (de tip op maandag), niet nog eens de aftelling
  let n = 0;
  for (let d = '2026-11-16'; d <= '2026-11-22'; d = plusDagen(d, 1)) n += vandaagInHetKort([aftel], null, d).regels.length;
  assert.equal(n, 1);
  // andere weken zijn niet geraakt
  assert.equal(vandaagInHetKort(items, null, '2026-11-23').regels.filter((r) => r.soort === 'tip').length, 1);
  // zonder geheugen: dezelfde dag geeft altijd hetzelfde
  assert.deepEqual(vandaagInHetKort(items, null, '2026-11-18'), vandaagInHetKort(items, null, '2026-11-18'));
});

test('de echte data: 16 tot en met 22 november 2026 heeft hooguit één tip- of seizoensregel', () => {
  const r = laadAlles();
  const seizoensIds = new Set(r.items.filter((i) => i.soort === 'seizoen').map((i) => i.id));
  const regels = [];
  for (let d = '2026-11-16'; d <= '2026-11-22'; d = plusDagen(d, 1)) regels.push(...vandaagInHetKort(r.items, r.banner, d).regels);
  assert.ok(regels.filter((x) => x.soort === 'tip' || seizoensIds.has(x.id)).length <= 1);
});

// ---------- 3. controle van de data ----------

test('een YAML-syntaxfout noemt het juiste regelnummer in gewoon Nederlands, zonder Engelse parsertekst', () => {
  const tekst = ['- id: a', '  titel: Eerste', '  rubriek: genieten', '', '- id: b', '  titel: Tweede: met een dubbele punt', '  rubriek: genieten', ''].join('\n');
  const { fouten } = leesBlokken(tekst, 'genieten.yaml');
  assert.match(fouten[0], /^genieten\.yaml regel 6: het bestand is op regel 6 niet goed opgebouwd, controleer inspringing en dubbele punten/);
  for (const f of fouten) assert.ok(!/Nested|mappings|Map keys|indicator|Unexpected|Missing closing/i.test(f), f);
  const dubbel = leesBlokken('- id: a\n  id: b\n', 'x.yaml').fouten[0];
  assert.match(dubbel, /^x\.yaml regel 2: .*twee keer/);
  const tab = leesBlokken('- id: a\n\ttitel: x\n', 'x.yaml').fouten[0];
  assert.match(tab, /^x\.yaml regel 2: /);
});

test('gebied wordt gecontroleerd tegen een vaste lijst', () => {
  for (const goed of ['heel Frankrijk', 'zone A', 'zone B', 'zone C', 'Elzas-Moezel', 'Nederland', 'bergdepartementen', 'kust', ['zone A', 'zone B'], [11, 34], '11, 34', [69], '34 bergdepartementen (Alpen, Jura)']) {
    assert.equal(controleerGebied(goed), null, JSON.stringify(goed));
  }
  for (const slecht of ['Lyon', 'per departement', 'Zuid-Frankrijk', ['zone A', 'zone D']]) assert.match(controleerGebied(slecht), /kan niet\. Kies uit: heel Frankrijk, zone A/, JSON.stringify(slecht));
  const blok = '- id: g\n  titel: G\n  rubriek: genieten\n  doelgroepen: [iedereen]\n  wanneer: {datum: 2026-11-16}\n  gebied: Lyon\n  tekst: Een zin.\n  bron: {url: https://example.org/, gecontroleerd: 2026-11-02}\n  status: vastgesteld\n';
  const { blokken } = leesBlokken(blok, 'genieten.yaml');
  const r = valideerItem(blokken[0].ruw, { bestand: 'genieten.yaml', lijn: blokken[0].lijn });
  assert.match(r.fouten[0], /^genieten\.yaml regel 6: gebied "Lyon" kan niet/);
});

test('een lang streepje in titel of tekst van een eigen item is een rode fout', () => {
  const blok = (titel, tekst) => `- id: s\n  titel: ${titel}\n  rubriek: genieten\n  doelgroepen: [iedereen]\n  wanneer: {datum: 2026-11-16}\n  tekst: "${tekst}"\n  bron: {url: https://example.org/, gecontroleerd: 2026-11-02}\n  status: vastgesteld\n`;
  for (const [t, z, veld] of [['Een – titel', 'Een zin.', 'titel'], ['Titel', 'Een zin — met streepje.', 'tekst']]) {
    const { blokken } = leesBlokken(blok(t, z), 'genieten.yaml');
    const r = valideerItem(blokken[0].ruw, { bestand: 'genieten.yaml', lijn: blokken[0].lijn });
    assert.equal(r.item, null);
    assert.match(r.fouten[0], new RegExp(`${veld} bevat een lang streepje`));
  }
});

test('ingelezen verenigingen worden genormaliseerd: streepjes, HOOFDLETTERS en afkortingen', () => {
  const data = { meta: { laatst_bijgewerkt: '2026-11-02' }, verenigingen: [
    { id: 'nvlr', naam: 'Nederlandse Vereniging Languedoc-Roussillon', afkorting: 'NVLR', website: 'https://www.nvlr.eu', events: [
      { datum: '2027-02-14', titel: 'WINTER-BBQ NVLR – 14 februari', tijd: '12:00-16:00', bron: 'https://www.nvlr.eu/x' },
      { datum: '2026-11-15', titel: 'THEATERVOORSTELLING "Blue Note in the Theatre"', bron: 'https://www.nvlr.eu/y' },
    ] },
  ] };
  const [bbq, theater] = verenigingItems(data, '2026-11-02').sort((a, b) => a.wanneer.datum.localeCompare(b.wanneer.datum)).reverse();
  assert.equal(bbq.titel, 'Winter-BBQ NVLR, 14 februari');
  assert.equal(theater.titel, 'Theatervoorstelling "Blue Note in the Theatre"');
  assert.equal(zinsopbouw('Jeu de boules Sainte-Maxime'), 'Jeu de boules Sainte-Maxime');
  assert.equal(zinsopbouw('ALV en BBQ in Lille'), 'ALV en BBQ in Lille');
});

// ---------- 7. bron zonder url ----------

test('een vereniging-item zonder webadres in bron: de website wordt de bron-url, de tekst gaat naar opmerking', () => {
  const data = { verenigingen: [
    { id: 'rdv', naam: 'RDV Bergerac', afkorting: 'RDV Bergerac', website: 'https://rdv.example/', events: [{ datum: '2027-01-07', titel: 'Maandelijkse ontmoeting met lunch', bron: 'vast ritme (automatisch gegenereerd)' }] },
    { id: 'zonder', naam: 'Zonder', website: null, events: [{ datum: '2027-01-08', titel: 'Wandeling', bron: 'vast ritme (automatisch gegenereerd)' }] },
  ] };
  const [a, b] = verenigingItems(data, '2026-11-02');
  assert.equal(a.bron.url, 'https://rdv.example/');
  assert.equal(a.opmerking, 'vast ritme (automatisch gegenereerd)');
  assert.match(b.bron.url, /^https:\/\//, 'zonder website valt het terug op de verenigingen-kalender');
  const ics = bouwIcs([a], { naam: 'x', omschrijving: 'y', van: '2027-01-01', tot: '2027-01-31', stempel: '2026-11-02' });
  assert.ok(!/Bron: vast ritme/.test(ics));
  assert.match(ics.replace(/\r\n /g, ''), /Bron: https:\/\/rdv\.example\//);
  assert.match(ics.replace(/\r\n /g, ''), /vast ritme \(automatisch gegenereerd\)/);
  assert.ok(!/URL:vast/.test(ics));
  // en in de bron-url van de echte data staat nergens tekst
  for (const i of laadAlles().items) if (i.bron?.url) assert.match(i.bron.url, /^https?:\/\/\S+$/, i.id);
});

// ---------- 4. Café Jeudi live ----------

const antwoord = (d, ok = true) => async () => ({ ok, status: ok ? 200 : 503, json: async () => d });
const kopie = { aan: false, aanTot: null, datum: null, volgende: null, wekelijks: { weekdag: 4, begin: '18:00', eind: '19:30' }, overslaan: [], knop: null };

test('liveBanner: live antwoord wint, bij fout, rommel of traagheid geldt de kopie', async () => {
  const live = await liveBanner(kopie, { haal: antwoord({ aan: true, volgende: '2026-11-05', wekelijks: kopie.wekelijks, knop: { url: 'https://meet.example/x' }, tijdstempel: 'weg' }) });
  assert.equal(live.bron, 'live');
  assert.equal(live.banner.aan, true);
  assert.ok(!('tijdstempel' in live.banner));
  assert.equal((await liveBanner(kopie, { haal: antwoord({}, false) })).bron, 'kopie');
  assert.equal((await liveBanner(kopie, { haal: antwoord({ iets: 1 }) })).bron, 'kopie');
  assert.equal((await liveBanner(kopie, { haal: async () => { throw new Error('netwerk'); } })).bron, 'kopie');
  const traag = (url, { signal }) => new Promise((_, nee) => signal.addEventListener('abort', () => nee(new Error('afgebroken'))));
  const t0 = Date.now();
  const r = await liveBanner(kopie, { haal: traag, timeout: 60 });
  assert.equal(r.bron, 'kopie');
  assert.deepEqual(r.banner, kopie);
  assert.ok(Date.now() - t0 < 1000);
});

test('/api/vandaag leest de banner live: een ja op donderdagochtend werkt direct door', async () => {
  const NU = new Date('2026-11-05T07:00:00Z');
  const h = { host: 'kalender.example' };
  const ja = await routeLive('/api/vandaag', { datum: '2026-11-05' }, h, { root: ROOT, nu: NU, haal: antwoord({ aan: true, wekelijks: kopie.wekelijks, knop: { url: 'https://meet.example/x' } }) });
  assert.equal(ja.headers['x-cafe-jeudi'], 'live');
  assert.ok(JSON.parse(ja.body).regels.some((r) => r.id === 'cafe-jeudi'));
  assert.match(ja.headers['cache-control'], /s-maxage=60/);
  const nee = await routeLive('/api/vandaag', { datum: '2026-11-05' }, h, { root: ROOT, nu: NU, haal: antwoord({ aan: false, wekelijks: kopie.wekelijks }) });
  assert.ok(!JSON.parse(nee.body).regels.some((r) => r.id === 'cafe-jeudi'), 'live nee overschrijft een kopie met ja');
  // live onbereikbaar: de nachtelijke kopie van de fixtures (aan: true) geldt
  const val = await routeLive('/api/vandaag', { datum: '2026-11-05' }, h, { root: ROOT, nu: NU, haal: async () => { throw new Error('weg'); } });
  assert.equal(val.headers['x-cafe-jeudi'], 'kopie');
  assert.ok(JSON.parse(val.body).regels.some((r) => r.id === 'cafe-jeudi'));
  // andere routes blijven gewoon gecachet en doen geen netwerkaanroep
  const items = await routeLive('/api/items', {}, h, { root: ROOT, nu: NU, haal: async () => { throw new Error('mag niet'); } });
  assert.match(items.headers['cache-control'], /s-maxage=3600/);
});

test('iCal: Café Jeudi is één wekelijkse afspraak met RRULE en de zin over weken zonder aankondiging', () => {
  const banner = { wekelijks: { weekdag: 4, begin: '18:00', eind: '19:30' }, knop: null };
  const ics = bouwIcs([cafeJeudiItem(banner, '2026-11-02')], { naam: 'x', omschrijving: 'y', van: '2026-01-01', tot: '2028-12-31', stempel: '2026-11-02' });
  assert.equal([...ics.matchAll(/^BEGIN:VEVENT/gm)].length, 1);
  assert.equal([...ics.matchAll(/^RRULE:FREQ=WEEKLY;BYDAY=TH$/gm)].length, 1);
  assert.match(ics.replace(/\r\n /g, ''), /Gaat niet door in weken zonder aankondiging op nederlanders\.fr/);
  assert.match(ics, /DTSTART;TZID=Europe\/Paris:20260101T180000/);
});

// ---------- 5. statustelling ----------

test('de 60-dagentelling telt alleen vastgestelde items; te verifiëren staat apart; een banner telt niet', () => {
  const items = [
    maak({ id: 'v1', rubriek: 'genieten', wanneer: datum('2026-11-10') }),
    maak({ id: 'v2', rubriek: 'genieten', wanneer: datum('2026-11-11') }),
    maak({ id: 'tv', rubriek: 'genieten', wanneer: datum('2026-11-12'), status: 'te_verifieren' }),
    maak({ id: 'bn', rubriek: 'genieten', soort: 'banner', wanneer: { type: 'periode', van: '2026-11-10', tot: '2026-11-15' } }),
    maak({ id: 'ver', rubriek: 'genieten', wanneer: datum('2027-03-01') }),
  ];
  assert.equal(tellingKomende60(items, '2026-11-02').genieten, 2);
  assert.equal(tellingTeVerifieren(items, '2026-11-02').genieten, 1);
});

test('bij twee Google-bronnen gaat de Nederlandse titel voor de Engelse', () => {
  const fr = maak({ id: 'g-fr', titel: 'Christmas Eve', herkomst: 'google-fr', wanneer: datum('2026-12-24') });
  const nl = maak({ id: 'g-nl2', titel: 'Kerstavond', herkomst: 'google-nl', gebied: 'Nederland', wanneer: datum('2026-12-24') });
  const lijst = itemsInBereik(ontdubbel([fr, nl]).items, '2026-12-24', '2026-12-24');
  assert.deepEqual(lijst.map((i) => i.titel), ['Kerstavond']);
});

// ---------- 10. /api/items levert standaard alleen vastgestelde items ----------

test('itemsInBereik laat te_verifieren standaard weg; status=alle geeft ze mee, status=te_verifieren alleen die', () => {
  const items = [
    maak({ id: 'v1', rubriek: 'genieten', wanneer: datum('2026-11-10') }),
    maak({ id: 'tv', rubriek: 'genieten', wanneer: datum('2026-11-12'), status: 'te_verifieren' }),
  ];
  assert.deepEqual(itemsInBereik(items, '2026-11-01', '2026-11-30').map((i) => i.id), ['v1']);
  assert.deepEqual(itemsInBereik(items, '2026-11-01', '2026-11-30', { status: 'alle' }).map((i) => i.id), ['v1', 'tv']);
  assert.deepEqual(itemsInBereik(items, '2026-11-01', '2026-11-30', { status: 'te_verifieren' }).map((i) => i.id), ['tv']);
});

test('nieuwe feestdagtitels met Franse naam ontdubbelen nog met Google', () => {
  assert.equal(titelSleutel('Wapenstilstand (Armistice 1918)'), titelSleutel('Armistice Day'));
  assert.equal(titelSleutel('Nationale feestdag (Fête nationale, 14 juillet)'), titelSleutel('Bastille Day'));
  assert.equal(titelSleutel('Eerste kerstdag (Noël)'), titelSleutel('Christmas Day'));
});
