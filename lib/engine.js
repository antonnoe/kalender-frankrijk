// De rekenkant: concrete data binnen een bereik, filters en de selectieregels van "Vandaag in het kort".
// Zuivere functies: dezelfde invoer geeft altijd dezelfde uitvoer, er is geen geheugen tussen aanroepen.

import {
  plusDagen, verschilDagen, weekdag, formatNL, isoWeek, vandaagParijs, leesIso,
} from './datum.js';
import { voorkomens, toonWanneer, RUBRIEK_IDS, rubriekInfo } from './model.js';
import { cafeJeudiVandaag } from './bronnen.js';
import { forumUrl, forumAanzet } from './forum.js';

// Doelgroepen die in de nieuwsbrief mogen (ONTWERP f.6)
const NIEUWSBRIEF_DOELGROEPEN = ['iedereen', 'particulier', 'gepensioneerde', 'huiseigenaar', 'huurder', 'automobilist'];
export const MAX_REGELS = 4;
const MAX_DEADLINES = 2;
const PERIODE_BLIJFT_GELDIG_DAGEN = 6;

const lijst = (x) => (x == null || x === '' ? null : String(x).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));

/** Welke items passen bij de filters? doelgroep telt `iedereen` altijd mee. */
export function filterItems(items, { rubriek, doelgroep, toon_in } = {}) {
  const rubs = lijst(rubriek);
  const doel = lijst(doelgroep);
  const toon = lijst(toon_in);
  return items.filter((i) => {
    if (rubs && !rubs.includes(i.rubriek)) return false;
    if (doel && !(i.doelgroepen.includes('iedereen') || i.doelgroepen.some((d) => doel.includes(d)))) return false;
    if (toon && !toon.some((t) => i.toon_in.includes(t))) return false;
    return true;
  });
}

export function beeldUrl(rubriek, basis = '', ext = 'png') {
  return `${basis}/beeld/${rubriek}.${ext}`;
}

/** Item zoals de API het levert, met de berekende data binnen [van, tot]. */
export function publiekItem(item, van, tot, basis = '') {
  const v = voorkomens(item.wanneer, van, tot);
  const eerste = v[0]?.start ?? null;
  return {
    id: item.id,
    titel: item.titel,
    rubriek: item.rubriek,
    rubriek_naam: rubriekInfo(item.rubriek)?.naam ?? item.rubriek,
    doelgroepen: item.doelgroepen,
    wanneer: toonWanneer(item.wanneer),
    soort: item.soort,
    aftellen: item.aftellen,
    gebied: item.gebied,
    tekst: item.tekst,
    tekst_je: item.tekst_je ?? item.tekst,
    tekst_u: item.tekst_u ?? item.tekst,
    link: item.link,
    bron: item.bron,
    status: item.status,
    toon_in: item.toon_in,
    groep: item.groep,
    gesprek: item.gesprek,
    tijd: item.tijd,
    uitleg: item.uitleg ?? null,
    herkomst: item.herkomst,
    beeld_url: beeldUrl(item.rubriek, basis),
    forum_url: forumUrl(item, eerste),
    forum_aanzet: item.gesprek ? forumAanzet(item, eerste) : null,
    voorkomens: v.map((x) => ({ van: x.start, tot: x.end })),
  };
}

export function itemsInBereik(items, van, tot, filters = {}, basis = '') {
  return filterItems(items, filters)
    .map((i) => publiekItem(i, van, tot, basis))
    .filter((i) => i.voorkomens.length)
    .sort((a, b) => a.voorkomens[0].van.localeCompare(b.voorkomens[0].van) || a.id.localeCompare(b.id));
}

// ---------- Vandaag in het kort ----------

function nieuwsbriefGeschikt(i) {
  if (i.status === 'te_verifieren') return false;
  if (!i.toon_in.includes('nieuwsbrief')) return false;
  if (i.doelgroepen.some((d) => NIEUWSBRIEF_DOELGROEPEN.includes(d))) return true;
  // alleen ondernemers, gezinnen enzovoort: alleen als "toon in nieuwsbrief" met opzet is aangezet
  return i.toon_in_expliciet;
}

const rubriekVolgorde = (r) => Math.max(0, RUBRIEK_IDS.indexOf(r));

function vorm(soort, kop, item, start, basis, extra = {}) {
  const tekst = item.tekst_je ?? item.tekst;
  return {
    soort, kop, titel: item.titel, tekst,
    link: item.link, rubriek: item.rubriek, beeld_url: beeldUrl(item.rubriek, basis),
    gesprek: !!item.gesprek, forum_url: forumUrl(item, start), id: item.id, ...extra,
  };
}

const kopAftelling = (n, start) => (n === 0 ? `Vandaag, ${formatNL(start)}.` : n === 1 ? `Morgen, ${formatNL(start)}.` : `Over ${n} dagen, ${formatNL(start)}.`);

function isWerkdag(d, feestdagen) {
  return weekdag(d) !== 0 && !feestdagen.has(d);
}
function eersteWerkdagVanaf(d, feestdagen) {
  let x = d;
  for (let i = 0; i < 14 && !isWerkdag(x, feestdagen); i++) x = plusDagen(x, 1);
  return x;
}

/**
 * Welke periode krijgt op `datum` zijn melding? Eén per dag. Een periode meldt zich op zijn begindag; valt die op
 * een zondag of feestdag, dan op de eerste werkdag erna. Wat die dag niet past, schuift een dag op. Dit wordt
 * elke keer opnieuw uitgerekend vanaf zeven dagen terug, dus zonder geheugen.
 */
export function kiesPeriode(periodes, datum, feestdagen) {
  const kandidaten = [];
  for (const p of periodes) {
    for (const o of voorkomens(p.wanneer, plusDagen(datum, -(PERIODE_BLIJFT_GELDIG_DAGEN + 14)), plusDagen(datum, 0))) {
      kandidaten.push({ p, start: o.start, einde: o.end, melding: eersteWerkdagVanaf(o.start, feestdagen) });
    }
  }
  const getoond = new Set();
  let keuze = null;
  for (let d = plusDagen(datum, -PERIODE_BLIJFT_GELDIG_DAGEN); d <= datum; d = plusDagen(d, 1)) {
    const pool = kandidaten
      .filter((k) => k.melding <= d && verschilDagen(d, k.melding) <= PERIODE_BLIJFT_GELDIG_DAGEN && k.einde >= d && !getoond.has(`${k.p.id}|${k.start}`))
      .sort((a, b) => a.melding.localeCompare(b.melding) || (a.p.prioriteit ?? 5) - (b.p.prioriteit ?? 5)
        || rubriekVolgorde(a.p.rubriek) - rubriekVolgorde(b.p.rubriek) || a.p.id.localeCompare(b.p.id));
    const eerste = pool[0];
    if (eerste) getoond.add(`${eerste.p.id}|${eerste.start}`);
    if (d === datum) keuze = eerste ?? null;
  }
  return keuze;
}

/** De feestbanner voor `datum`: hooguit één, de kortste periode wint. */
export function kiesBanner(items, datum) {
  const actief = [];
  for (const i of items) {
    if (i.soort !== 'banner' || i.status === 'te_verifieren' || !i.toon_in.includes('nieuwsbrief')) continue;
    for (const o of voorkomens(i.wanneer, datum, datum)) actief.push({ i, lengte: verschilDagen(o.end, o.start) });
  }
  actief.sort((a, b) => a.lengte - b.lengte || a.i.id.localeCompare(b.i.id));
  const w = actief[0]?.i;
  return w ? { tekst_nl: w.tekst_nl ?? w.titel, tekst_fr: w.tekst_fr ?? '', kleur: w.kleur ?? '#800000' } : null;
}

/** Kiest de seizoenstip van deze week: vast uit de datum, op maandag, hooguit één per week. */
export function kiesTip(items, datum) {
  if (weekdag(datum) !== 1) return null;
  const kandidaten = items
    .filter((i) => i.soort === 'seizoen' && nieuwsbriefGeschikt(i) && voorkomens(i.wanneer, datum, plusDagen(datum, 6)).length)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!kandidaten.length) return null;
  const { jaar, week } = isoWeek(datum);
  const gekozen = kandidaten[(jaar * 53 + week) % kandidaten.length];
  return gekozen;
}

/**
 * De regels voor de nieuwsbrief van `datum`. Zie docs/ONTWERP.md f en l.
 * `banner` is de kopie van nlfr-menu (Café Jeudi), `extra.nieuwsLinks` zijn links die elders in de nieuwsbrief al staan.
 */
export function vandaagInHetKort(items, banner, datum, { basis = '', nieuwsLinks = [] } = {}) {
  const weggelaten = [];
  const eligible = items.filter((i) => {
    if (i.soort === 'banner') return false;
    if (!nieuwsbriefGeschikt(i)) return false;
    if (i.link && nieuwsLinks.includes(i.link)) { weggelaten.push({ id: i.id, reden: 'staat al als nieuws in de nieuwsbrief (zelfde link)' }); return false; }
    return true;
  });
  const feestdagen = new Set(items.filter((i) => i.herkomst === 'feestdagen' && i.gebied === 'heel Frankrijk').map((i) => i.wanneer.datum));

  // 1. vandaag: Café Jeudi en verenigingsactiviteiten samen in één regel
  const delen = [];
  let vandaagLink = null;
  const cj = cafeJeudiVandaag(banner, datum);
  if (cj) {
    delen.push(`Café Jeudi, vanavond ${cj.begin.replace(':', '.')} tot ${cj.eind.replace(':', '.')} via Google Meet`);
    vandaagLink = cj.link;
  }
  const activiteiten = eligible.filter((i) => i.herkomst === 'verenigingen' && voorkomens(i.wanneer, datum, datum).length)
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const a of activiteiten.slice(0, 3)) delen.push(`${a.titel} (${a.tekst.replace(/\.$/, '')})`);
  if (activiteiten.length > 3) weggelaten.push({ id: 'verenigingen', reden: `nog ${activiteiten.length - 3} verenigingsactiviteiten, niet in de regel opgenomen` });
  const regels = [];
  if (delen.length) {
    regels.push({
      soort: 'vandaag', kop: `Vandaag, ${formatNL(datum)}.`, titel: cj ? 'Café Jeudi' : activiteiten[0].titel,
      tekst: `${delen.join('. ')}.`, link: vandaagLink ?? activiteiten[0]?.link ?? null,
      rubriek: 'verenigingen', beeld_url: beeldUrl('verenigingen', basis), gesprek: false, forum_url: null, id: cj ? 'cafe-jeudi' : activiteiten[0].id,
    });
  }

  // 2. deadlines met aftelling (en feestdagen op de dag zelf), nooit dubbel per groep of per titel
  const aftel = [];
  for (const i of eligible) {
    if (i.soort === 'periode' || i.soort === 'seizoen' || i.herkomst === 'verenigingen' || i.herkomst === 'cafe-jeudi') continue;
    if (!i.aftellen.length) continue;
    for (const o of voorkomens(i.wanneer, datum, plusDagen(datum, 400))) {
      const n = verschilDagen(o.start, datum);
      if (i.aftellen.includes(n)) aftel.push({ i, n, start: o.start });
    }
  }
  aftel.sort((a, b) => a.start.localeCompare(b.start) || a.i.id.localeCompare(b.i.id));
  const gezien = new Set();
  const deadlines = [];
  for (const a of aftel) {
    const sleutel = a.i.groep ? `groep:${a.i.groep}` : `titel:${a.start}:${a.i.titel.toLowerCase()}`;
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    if (deadlines.length >= MAX_DEADLINES) { weggelaten.push({ id: a.i.id, reden: `meer dan ${MAX_DEADLINES} deadlines vandaag` }); continue; }
    deadlines.push(a);
  }
  for (const a of deadlines) regels.push(vorm(a.n === 0 ? 'vandaag' : 'aftelling', kopAftelling(a.n, a.start), a.i, a.start, basis));

  // 3. één periode die begint
  const periodes = eligible.filter((i) => i.soort === 'periode');
  const p = kiesPeriode(periodes, datum, feestdagen);
  if (p) {
    const kop = p.start === datum ? `Vanaf vandaag, tot en met ${formatNL(p.einde, false)}.` : `Sinds ${formatNL(p.start)}, tot en met ${formatNL(p.einde, false)}.`;
    regels.push(vorm('periode', kop, p.p, p.start, basis));
  }

  // 4. één seizoenstip
  const tip = kiesTip(eligible, datum);
  if (tip) regels.push(vorm('tip', 'Seizoenstip.', tip, datum, basis));

  // hooguit vier regels: wat achteraan staat valt af
  while (regels.length > MAX_REGELS) {
    const weg = regels.pop();
    weggelaten.push({ id: weg.id, reden: `meer dan ${MAX_REGELS} regels` });
  }
  return { datum, banner: kiesBanner(items, datum), regels, weggelaten };
}

/** Telling per rubriek voor /api/status: komende 60 dagen. */
export function tellingKomende60(items, datum) {
  const telling = Object.fromEntries(RUBRIEK_IDS.map((r) => [r, 0]));
  const tot = plusDagen(datum, 60);
  for (const i of items) {
    if (i.status === 'te_verifieren' && false) continue;
    if (voorkomens(i.wanneer, datum, tot).length) telling[i.rubriek] = (telling[i.rubriek] ?? 0) + 1;
  }
  return telling;
}

export { vandaagParijs, leesIso };
