// Laadt alle data van schijf: de eigen rubrieken, de verrijkte fiscale feeds en de ingelezen bronnen.
// Er is geen database; alles wat hier gebeurt kan zonder netwerk.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { laadRubriekBestand } from './yamlladen.js';
import { laadVerrijking } from './verrijking.js';
import {
  fiscaleItems, feestdagItems, googleItems, schoolvakantieItems, verenigingItems, cafeJeudiItem,
} from './bronnen.js';
import { RUBRIEK_IDS } from './model.js';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const lees = (pad) => (existsSync(pad) ? readFileSync(pad, 'utf8') : null);

/**
 * Laadt alles. `root` kan een andere map zijn (voor tests met fixtures).
 * Geeft {items, banner, status, fouten, waarschuwingen, tellingen}.
 */
export function laadAlles(root = ROOT, { vandaag = null } = {}) {
  const fouten = [];
  const waarschuwingen = [];
  const bekendeIds = new Set();
  const items = [];
  const tellingen = { fiscaal: {} };

  // 1. eigen rubrieken
  const rubriekMap = join(root, 'data', 'rubrieken');
  const bestanden = existsSync(rubriekMap) ? readdirSync(rubriekMap).filter((f) => /\.ya?ml$/.test(f)).sort() : [];
  for (const b of bestanden) {
    const r = laadRubriekBestand(join(rubriekMap, b), { bekendeIds, vandaag });
    fouten.push(...r.fouten);
    waarschuwingen.push(...r.waarschuwingen);
    items.push(...r.items);
  }

  // 2. ingelezen bronnen
  const bron = join(root, 'data', 'bron');
  const statusTekst = lees(join(bron, 'status.json'));
  const status = statusTekst ? JSON.parse(statusTekst) : {};
  const datumVan = (sleutel) => status[sleutel]?.laatst_geslaagd ?? '2026-01-01';

  const verrijking = laadVerrijking(join(root, 'data', 'verrijking-fiscaal.yaml'));
  fouten.push(...verrijking.fouten);

  const voegToe = (lijst, naam) => {
    for (const it of lijst) {
      if (bekendeIds.has(it.id)) { waarschuwingen.push(`${naam}: id ${it.id} komt twee keer voor, de tweede wordt overgeslagen`); continue; }
      bekendeIds.add(it.id);
      items.push(it);
    }
  };

  for (const feed of ['particulier', 'professionnel', 'nederland']) {
    const t = lees(join(bron, `fiscaal-${feed}.ics`));
    if (!t) { waarschuwingen.push(`fiscaal-${feed}.ics ontbreekt in data/bron`); continue; }
    const r = fiscaleItems(feed, t, verrijking);
    tellingen.fiscaal[feed] = { ingelezen: r.ingelezen, samengevoegd: r.samengevoegd, items: r.items.length };
    voegToe(r.items, `fiscaal-${feed}`);
  }

  const feest = lees(join(bron, 'feestdagen.json'));
  let feestdatums = new Set();
  if (feest) {
    const data = JSON.parse(feest);
    const lijst = feestdagItems(data, datumVan('feestdagen'));
    feestdatums = new Set(lijst.filter((i) => i.gebied === 'heel Frankrijk').map((i) => i.wanneer.datum));
    voegToe(lijst, 'feestdagen');
  }
  const gfr = lees(join(bron, 'google-fr.ics'));
  if (gfr) voegToe(googleItems('fr', gfr, { bekendeFeestdagen: feestdatums, gecontroleerd: datumVan('google-fr') }), 'google-fr');
  const gnl = lees(join(bron, 'google-nl.ics'));
  if (gnl) voegToe(googleItems('nl', gnl, { gecontroleerd: datumVan('google-nl') }), 'google-nl');

  const school = lees(join(bron, 'schoolvakanties.json'));
  if (school) voegToe(schoolvakantieItems(JSON.parse(school), datumVan('schoolvakanties')), 'schoolvakanties');

  const ver = lees(join(bron, 'verenigingen.json'));
  if (ver) voegToe(verenigingItems(JSON.parse(ver), datumVan('verenigingen')), 'verenigingen');

  const bannerTekst = lees(join(bron, 'cafe-jeudi.json'));
  const banner = bannerTekst ? JSON.parse(bannerTekst) : null;
  voegToe([cafeJeudiItem(banner, datumVan('cafe-jeudi'))], 'cafe-jeudi');

  // 3. rubrieken moeten kloppen
  for (const it of items) if (!RUBRIEK_IDS.includes(it.rubriek)) fouten.push(`item ${it.id}: onbekende rubriek ${it.rubriek}`);

  return { items, banner, status, fouten, waarschuwingen, tellingen, verrijking };
}
