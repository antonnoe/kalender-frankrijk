import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leesBlokken } from '../lib/yamlladen.js';
import { valideerItem } from '../lib/model.js';

function controleer(yaml, bestand = 'genieten.yaml', bekend = new Set()) {
  const { blokken, fouten } = leesBlokken(yaml, bestand);
  const uit = [...fouten];
  const items = [];
  for (const { ruw, lijn } of blokken) {
    const r = valideerItem(ruw, { bestand, lijn, bekendeIds: bekend });
    uit.push(...r.fouten);
    if (r.item) { bekend.add(r.item.id); items.push(r.item); }
  }
  return { fouten: uit, items };
}

const GOED = `- id: beaujolais-nouveau
  titel: Beaujolais nouveau
  rubriek: genieten
  doelgroepen: [iedereen]
  wanneer: derde donderdag van november
  aftellen: [14, 1]
  gebied: heel Frankrijk
  tekst: Vanaf deze donderdag mag de nieuwe beaujolais worden geschonken.
  link: https://www.beaujolais.com
  bron: {url: https://www.beaujolais.com, gecontroleerd: 2026-11-02}
  status: vastgesteld
  toon in: [nieuwsbrief, pagina, infopoche]
`;

test('het voorbeeldblok uit het ontwerp is goed, ook met "toon in" met spatie', () => {
  const r = controleer(GOED);
  assert.deepEqual(r.fouten, []);
  assert.deepEqual(r.items[0].toon_in, ['nieuwsbrief', 'pagina', 'infopoche']);
  assert.deepEqual(r.items[0].aftellen, [14, 1]);
});

test('een datum die niet bestaat: bestand en regelnummer in de melding', () => {
  const yaml = GOED.replace('wanneer: derde donderdag van november', 'wanneer: {datum: 2026-11-31}');
  const r = controleer(yaml);
  assert.equal(r.fouten.length, 1);
  assert.equal(r.fouten[0], 'genieten.yaml regel 5: datum 31-11-2026 bestaat niet');
});

test('een tweede blok met fout wijst de juiste regel aan', () => {
  const yaml = `${GOED}
- id: truffel
  titel: truffelseizoen
  rubriek: genieten
  doelgroepen: [iedereen]
  wanneer: jaarlijks 01-11 tot 31-03
  tekst: Verse truffels.
  bron: {url: https://example.org/, gecontroleerd: 2026-11-02}
  status: misschien
`;
  const r = controleer(yaml);
  assert.deepEqual(r.fouten, ['genieten.yaml regel 21: status "misschien" kan niet; kies vastgesteld of te_verifieren']);
});

test('verplichte velden, onbekende rubriek en doelgroep, bron zonder datum', () => {
  const r = controleer(`- id: x1
  titel: Iets
  rubriek: wereldreizen
  doelgroepen: [astronauten]
  wanneer: {datum: 2026-11-16}
  tekst: Een zin.
  bron: {url: https://example.org/}
  status: vastgesteld
`);
  const tekst = r.fouten.join('\n');
  assert.match(tekst, /genieten\.yaml regel 3: rubriek "wereldreizen" bestaat niet/);
  assert.match(tekst, /regel 4: doelgroep "astronauten" bestaat niet/);
  assert.match(tekst, /regel 7: bron heeft een datum van controle nodig/);
  const r2 = controleer('- id: y\n  titel: T\n');
  assert.match(r2.fouten.join('\n'), /het veld rubriek ontbreekt/);
  assert.match(r2.fouten.join('\n'), /het veld bron ontbreekt/);
});

test('dubbele id wordt gemeld', () => {
  const r = controleer(`${GOED}\n${GOED}`);
  assert.equal(r.fouten.length, 1);
  assert.match(r.fouten[0], /id "beaujolais-nouveau" bestaat al/);
});

test('een regel die niet te lezen is, geeft een uitleg met voorbeelden', () => {
  const r = controleer(GOED.replace('derde donderdag van november', 'rond half november'));
  assert.match(r.fouten[0], /genieten\.yaml regel 5: regel "rond half november" is niet te lezen/);
});

test('verkeerd ingesprongen YAML geeft een melding in gewoon Nederlands', () => {
  const r = controleer('- id: a\n titel: b\n  rubriek: c\n');
  assert.ok(r.fouten.length >= 1);
  assert.match(r.fouten[0], /^genieten\.yaml regel 2: het bestand is op regel 2 niet goed opgebouwd, controleer inspringing en dubbele punten/);
});

test('een lang streepje in een eigen item is een rode fout, met regelnummer', () => {
  const { blokken } = leesBlokken(GOED.replace('Beaujolais nouveau', 'Beaujolais — nouveau'), 'genieten.yaml');
  const r = valideerItem(blokken[0].ruw, { bestand: 'genieten.yaml', lijn: blokken[0].lijn });
  assert.equal(r.item, null);
  assert.match(r.fouten[0], /^genieten\.yaml regel 2: titel bevat een lang streepje/);
});

test('standaardwaarden: aftellen voor fiscale deadline, gesprek voor seizoen', () => {
  const fiscaal = controleer(GOED.replace('rubriek: genieten', 'rubriek: fiscaal').replace('  aftellen: [14, 1]\n', ''), 'fiscaal.yaml').items[0];
  assert.deepEqual(fiscaal.aftellen, [14, 7, 1]);
  const seizoen = controleer(GOED.replace('titel:', 'soort: seizoen\n  titel:')).items[0];
  assert.equal(seizoen.gesprek, true);
  assert.equal(controleer(GOED).items[0].gesprek, false);
});

test('departement onder 10 wordt twee cijfers (YAML leest 06 als getal)', () => {
  const { fouten, items } = controleer(GOED.replace('gebied: heel Frankrijk', 'gebied: [06, 24, 2A]'));
  assert.deepEqual(fouten, []);
  assert.deepEqual(items[0].gebied, ['06', '24', '2A']);
});

test('datum_zeker: standaard ja, nee voor een geschatte datum, titel met "(waarschijnlijke datum)" eist het veld', async () => {
  assert.equal(controleer(GOED).items[0].datum_zeker, true);
  const nee = controleer(GOED.replace('Beaujolais nouveau', 'Beaujolais nouveau (waarschijnlijke datum)').replace('status: vastgesteld', 'status: vastgesteld\n  datum_zeker: nee'));
  assert.deepEqual(nee.fouten, []);
  assert.equal(nee.items[0].datum_zeker, false);
  const vergeten = controleer(GOED.replace('Beaujolais nouveau', 'Beaujolais nouveau (waarschijnlijke datum)'));
  assert.ok(vergeten.fouten.some((x) => /datum_zeker/.test(String(x.melding ?? x.tekst ?? JSON.stringify(x)))));
  assert.ok(controleer(GOED.replace('status: vastgesteld', 'status: vastgesteld\n  datum_zeker: misschien')).fouten.length > 0);
  // API en eigen kalender: precies de negen geschatte items hebben datum_zeker false
  const { publiekItem } = await import('../lib/engine.js');
  assert.equal(publiekItem(nee.items[0], '2026-01-01', '2027-12-31').datum_zeker, false);
  assert.equal(publiekItem(controleer(GOED).items[0], '2026-01-01', '2027-12-31').datum_zeker, true);
});
