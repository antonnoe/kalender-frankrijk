// Het datamodel van Kalender Frankrijk: wat een item is, welke waarden mogen, en de controle daarop.
// De foutmeldingen zijn bedoeld voor een niet-programmeur: gewoon Nederlands, met bestand en regelnummer.

import {
  leesIso, ontbrekendeDatumTekst, leesRegel, leesPeriodeRegel, datumsVanRegel, regelInJaar,
  plusDagen, jaarVan, bestaat, maakIso,
} from './datum.js';

export const RUBRIEKEN = [
  { id: 'fiscaal', naam: 'Fiscale kalender', kleur: '#1B6B3A', tint: '#DDEFE3', icoon: 'munt' },
  { id: 'uitkeringen', naam: 'Uitkeringen en pensioen', kleur: '#1D4F9E', tint: '#DCE6F7', icoon: 'kalenderblad' },
  { id: 'feestdagen', naam: 'Feestdagen en ponts', kleur: '#9E4505', tint: '#FBE5D3', icoon: 'vlag' },
  { id: 'school', naam: 'School en gezin', kleur: '#0E5B66', tint: '#D7EDF0', icoon: 'boek' },
  { id: 'wonen', naam: 'Wonen en seizoen', kleur: '#800000', tint: '#F3E0E0', icoon: 'huis' },
  { id: 'buiten', naam: 'Buiten en onderweg', kleur: '#465C70', tint: '#E1E8EE', icoon: 'weg' },
  { id: 'zorg', naam: 'Zorg', kleur: '#B3261E', tint: '#F8DFDD', icoon: 'hart' },
  { id: 'stemmen', naam: 'Stemmen en Nederland', kleur: '#1D4F9E', tint: '#DCE6F7', icoon: 'gebouw' },
  { id: 'genieten', naam: 'Franse tradities', kleur: '#775800', tint: '#F6EBC2', icoon: 'glas' },
  { id: 'verenigingen', naam: 'Verenigingen en ontmoeting', kleur: '#6B3FA0', tint: '#E9E0F5', icoon: 'mensen' },
  { id: 'moestuin', naam: 'Moestuin', kleur: '#3D6B1F', tint: '#E4EEDB', icoon: 'kiem' }, // eigen werk: de moestuintool van Infofrankrijk, per maand en klimaatzone (3 november 2026)
];
export const RUBRIEK_IDS = RUBRIEKEN.map((r) => r.id);

export const DOELGROEPEN = ['iedereen', 'particulier', 'ondernemer', 'gepensioneerde', 'pas-verhuisd', 'gezin', 'huiseigenaar', 'huurder', 'automobilist', 'kustbewoner'];
const DOELGROEP_ALIAS = {
  'pas verhuisd': 'pas-verhuisd', pasverhuisd: 'pas-verhuisd', 'gezin met kinderen': 'gezin', gepensioneerden: 'gepensioneerde',
  huiseigenaren: 'huiseigenaar', particulieren: 'particulier', ondernemers: 'ondernemer', huurders: 'huurder', automobilisten: 'automobilist',
};
export const SOORTEN = ['datum', 'periode', 'seizoen', 'banner', 'mijlpaal'];
export const STATUSSEN = ['vastgesteld', 'te_verifieren'];
export const TOON_IN = ['nieuwsbrief', 'pagina', 'infopoche'];
export const VELDEN = [
  'id', 'titel', 'rubriek', 'doelgroepen', 'wanneer', 'aftellen', 'gebied', 'tekst', 'tekst_je', 'tekst_u', 'link', 'bron',
  'status', 'toon_in', 'groep', 'soort', 'gesprek',
];
// Extra, optionele velden die het systeem kent
export const EXTRA_VELDEN = ['tekst_nl', 'tekst_fr', 'kleur', 'tijd', 'forum_aanzet', 'opmerking', 'notitie', 'prioriteit'];
const VERPLICHT = ['id', 'titel', 'rubriek', 'doelgroepen', 'wanneer', 'tekst', 'bron', 'status'];

/** Zet "toon in" en "toon_in", "te verifiëren" en dergelijke om naar de vaste spelling. */
export function veldNaam(k) {
  return String(k).trim().toLowerCase().replace(/\s+/g, '_').replace('ë', 'e');
}
export function normStatus(s) {
  const t = String(s ?? '').trim().toLowerCase().replace(/ë/g, 'e').replace(/[\s-]+/g, '_');
  return t;
}

export const LANG_STREEPJE = /[—–]/;

// De vaste lijst voor het veld gebied. Weglaten betekent heel Frankrijk.
export const GEBIEDEN = ['heel Frankrijk', 'zone A', 'zone B', 'zone C', 'Elzas-Moezel', 'Nederland', 'bergdepartementen', 'kust'];
const GEBIED_KLEIN = new Map(GEBIEDEN.map((g) => [g.toLowerCase(), g]));
const DEPARTEMENT = /^(?:\d{1,3}|2[AB])$/i;

/**
 * Controleert het veld gebied: een of meer uit de vaste lijst (heel Frankrijk, zone A, zone B, zone C, Elzas-Moezel,
 * Nederland, bergdepartementen, kust) of een lijst met departementsnummers (bijvoorbeeld [11, 34] of "11, 34").
 * Bij "bergdepartementen" en "kust" mag een toelichting volgen, bijvoorbeeld "34 bergdepartementen (Alpen, Jura)".
 * Geeft null als het goed is, anders een melding in gewoon Nederlands.
 */
export function controleerGebied(g) {
  const lijst = Array.isArray(g) ? g : [g];
  if (!lijst.length) return 'gebied is leeg; kies uit: ' + GEBIEDEN.join(', ') + ' of een lijst met departementsnummers';
  const slecht = [];
  const stukken = lijst.flatMap((x) => (typeof x === 'string' && /^\s*\d/.test(x) && !/[a-z]/i.test(x.replace(/\b2[ab]\b/gi, '')) ? x.split(/[,\s]+/).filter(Boolean) : [x]));
  for (const x of stukken) {
    const t = String(x).trim();
    const klein = t.toLowerCase();
    if (GEBIED_KLEIN.has(klein)) continue;
    if (DEPARTEMENT.test(t)) continue;
    if (/^(?:\d+\s+)?bergdepartementen\b/i.test(t)) continue;
    if (/^kust\b/i.test(t)) continue;
    slecht.push(t);
  }
  if (!slecht.length) return null;
  return `gebied "${slecht.join('", "')}" kan niet. Kies uit: ${GEBIEDEN.join(', ')}, of een lijst met departementsnummers (bijvoorbeeld [11, 34])`;
}

const isLijst = Array.isArray;
const isObj = (x) => x && typeof x === 'object' && !isLijst(x);
const isUrl = (s) => typeof s === 'string' && /^https?:\/\/[^\s]+\.[^\s]+/.test(s);

/**
 * Leest het veld `wanneer` in alle toegestane vormen. Geeft {wanneer} of {fout: 'tekst'}.
 *   wanneer: {datum: 2026-11-16}
 *   wanneer: {van: 2026-11-01, tot: 2027-03-31}
 *   wanneer: {regel: "jaarlijks 11-11"}   (ook: "derde donderdag van november", "pasen +1", "jaarlijks 01-11 tot 31-03")
 *   wanneer: {datums: [2026-11-16, 2027-03-01]}
 *   wanneer: derde donderdag van november   (kale tekst mag ook)
 */
export function leesWanneer(raw) {
  const datumFout = (s) => {
    const t = ontbrekendeDatumTekst(s);
    return t ? `datum ${t} bestaat niet` : `"${s}" is geen datum (verwacht: JJJJ-MM-DD, bijvoorbeeld 2026-11-16)`;
  };
  const enkel = (s) => {
    const x = String(s).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return leesIso(x) ? { type: 'datum', datum: x } : { fout: datumFout(x) };
    if (/^\d{4}-\d{2}-\d{2}\s+tot\s+\d{4}-\d{2}-\d{2}$/i.test(x)) {
      const [a, b] = x.split(/\s+tot\s+/i);
      return periode(a, b);
    }
    try {
      if (/\s+tot\s+/i.test(x)) return { type: 'periode-regel', tekst: x, ...leesPeriodeRegel(x) };
      return { type: 'regel', tekst: x, regel: leesRegel(x) };
    } catch (e) { return { fout: e.message }; }
  };
  const periode = (a, b) => {
    for (const s of [a, b]) if (!leesIso(s)) return { fout: datumFout(s) };
    if (String(b) < String(a)) return { fout: `de periode eindigt (${b}) vóór ze begint (${a})` };
    return { type: 'periode', van: String(a), tot: String(b) };
  };
  if (typeof raw === 'string') return enkel(raw);
  if (raw instanceof Date) return { fout: 'schrijf de datum als 2026-11-16 (jaar-maand-dag)' };
  if (!isObj(raw)) return { fout: 'het veld wanneer ontbreekt of is leeg' };
  if (raw.datum != null) return enkel(String(raw.datum));
  if (raw.datums != null) {
    if (!isLijst(raw.datums) || !raw.datums.length) return { fout: 'datums moet een lijst met minstens één datum zijn' };
    const uit = [];
    for (const d of raw.datums) {
      const r = enkel(String(d));
      if (r.fout) return r;
      if (r.type !== 'datum') return { fout: `"${d}" is geen losse datum` };
      uit.push(r.datum);
    }
    return { type: 'datums', datums: uit.sort() };
  }
  if (raw.van != null || raw.tot != null) {
    if (raw.van == null || raw.tot == null) return { fout: 'een periode heeft zowel van als tot nodig' };
    if (/^\d{1,2}-\d{1,2}$/.test(String(raw.van)) && /^\d{1,2}-\d{1,2}$/.test(String(raw.tot))) return enkel(`jaarlijks ${raw.van} tot ${raw.tot}`);
    return periode(String(raw.van), String(raw.tot));
  }
  if (raw.regel != null) return enkel(String(raw.regel));
  return { fout: 'wanneer heeft een datum, een periode (van en tot) of een regel nodig' };
}

/** Terug naar de vorm die in de data staat (voor de API). */
export function toonWanneer(w) {
  switch (w.type) {
    case 'datum': return { datum: w.datum };
    case 'datums': return { datums: w.datums };
    case 'periode': return { van: w.van, tot: w.tot };
    default: return { regel: w.tekst ?? '' };
  }
}

/** Alle {start, end} (JJJJ-MM-DD) van een gelezen `wanneer` die het bereik [van, tot] raken. */
export function voorkomens(w, van, tot) {
  const uit = [];
  switch (w.type) {
    case 'datum': if (w.datum >= van && w.datum <= tot) uit.push({ start: w.datum, end: w.datum }); break;
    case 'datums': for (const d of w.datums) if (d >= van && d <= tot) uit.push({ start: d, end: d }); break;
    case 'periode': if (w.tot >= van && w.van <= tot) uit.push({ start: w.van, end: w.tot }); break;
    case 'regel': for (const d of datumsVanRegel(w.regel, van, tot)) uit.push({ start: d, end: d }); break;
    case 'periode-regel': {
      for (let j = jaarVan(van) - 1; j <= jaarVan(tot); j++) {
        const s = regelInJaar(w.van, j);
        let e = regelInJaar(w.tot, j);
        if (!s || !e) continue;
        if (e < s) e = regelInJaar(w.tot, j + 1);
        if (e && e >= van && s <= tot) uit.push({ start: s, end: e });
      }
      break;
    }
    default: break;
  }
  // dagen die bij het ontdubbelen aan een andere bron zijn gegeven (lib/ontdubbel.js)
  if (w.uitgezonderd?.length) return uit.filter((o) => !(o.start === o.end && w.uitgezonderd.includes(o.start)));
  return uit;
}

/** Controleer één ruw blok. `lijn(veld)` geeft het regelnummer van een veld (of van het blok). */
export function valideerItem(raw, { bestand, lijn, bekendeIds = new Set(), vandaag = null } = {}) {
  const fouten = [];
  const waarschuwingen = [];
  const f = (veld, tekst) => fouten.push(`${bestand} regel ${lijn(veld)}: ${tekst}`);
  const w = (veld, tekst) => waarschuwingen.push(`${bestand} regel ${lijn(veld)}: ${tekst}`);
  if (!isObj(raw)) {
    fouten.push(`${bestand} regel ${lijn(null)}: dit blok is geen reeks velden (begin elk blok met "- id: ...")`);
    return { fouten, waarschuwingen, item: null };
  }
  // veldnamen normaliseren ("toon in" wordt toon_in)
  const r = {};
  for (const [k, v] of Object.entries(raw)) r[veldNaam(k)] = v;
  const alle = new Set([...VELDEN, ...EXTRA_VELDEN]);
  for (const k of Object.keys(r)) if (!alle.has(k)) w(k, `onbekend veld "${k}" wordt genegeerd (typfout?)`);
  for (const k of VERPLICHT) if (r[k] == null || r[k] === '' || (isLijst(r[k]) && !r[k].length)) f(k, `het veld ${k} ontbreekt of is leeg`);

  if (r.id != null) {
    const id = String(r.id);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) f('id', `id "${id}" mag alleen kleine letters, cijfers en streepjes bevatten (bijvoorbeeld beaujolais-nouveau)`);
    else if (bekendeIds.has(id)) f('id', `id "${id}" bestaat al, kies een andere naam (elk id moet uniek zijn)`);
  }
  if (r.titel != null && typeof r.titel !== 'string') f('titel', 'titel moet tekst zijn');
  if (r.rubriek != null && !RUBRIEK_IDS.includes(String(r.rubriek))) f('rubriek', `rubriek "${r.rubriek}" bestaat niet. Kies uit: ${RUBRIEK_IDS.join(', ')}`);

  let doelgroepen = [];
  if (r.doelgroepen != null) {
    const lijst = isLijst(r.doelgroepen) ? r.doelgroepen : [r.doelgroepen];
    for (const d of lijst) {
      const k = String(d).trim().toLowerCase();
      const norm = DOELGROEP_ALIAS[k] ?? k;
      if (!DOELGROEPEN.includes(norm)) f('doelgroepen', `doelgroep "${d}" bestaat niet. Kies uit: ${DOELGROEPEN.join(', ')}`);
      else doelgroepen.push(norm);
    }
  }

  let wanneer = null;
  if (r.wanneer != null && r.wanneer !== '') {
    const res = leesWanneer(r.wanneer);
    if (res.fout) f('wanneer', res.fout); else wanneer = res;
  }

  let aftellen = null;
  if (r.aftellen != null) {
    if (!isLijst(r.aftellen) || r.aftellen.some((n) => !Number.isInteger(n) || n < 1 || n > 366)) {
      f('aftellen', 'aftellen moet een lijst met hele aantallen dagen zijn, bijvoorbeeld [14, 7, 1]');
    } else aftellen = [...new Set(r.aftellen)].sort((a, b) => b - a);
  }

  if (r.gebied != null) {
    const fout = controleerGebied(r.gebied);
    if (fout) f('gebied', fout);
  }

  for (const v of ['tekst', 'tekst_je', 'tekst_u']) {
    if (r[v] != null && typeof r[v] !== 'string') f(v, `${v} moet tekst zijn`);
  }
  for (const v of ['titel', 'tekst', 'tekst_je', 'tekst_u', 'tekst_nl', 'tekst_fr']) {
    if (typeof r[v] === 'string' && LANG_STREEPJE.test(r[v])) f(v, `${v} bevat een lang streepje (— of –); gebruik een komma`);
  }
  if (r.link != null && r.link !== '' && !isUrl(r.link)) f('link', `link "${r.link}" is geen webadres (begin met https://)`);

  let bron = null;
  if (r.bron != null) {
    if (!isObj(r.bron)) f('bron', 'bron moet url en gecontroleerd bevatten, bijvoorbeeld: bron: {url: https://..., gecontroleerd: 2026-11-02}');
    else {
      const gc = r.bron.gecontroleerd == null ? null : String(r.bron.gecontroleerd);
      if (!isUrl(r.bron.url)) f('bron', 'bron heeft een geldig webadres (url) nodig');
      if (!gc) f('bron', 'bron heeft een datum van controle nodig (gecontroleerd: JJJJ-MM-DD)');
      else if (!leesIso(gc)) f('bron', `bron.gecontroleerd: ${ontbrekendeDatumTekst(gc) ? `datum ${ontbrekendeDatumTekst(gc)} bestaat niet` : `"${gc}" is geen datum (verwacht JJJJ-MM-DD)`}`);
      else if (vandaag && gc > vandaag) w('bron', `controledatum ${gc} ligt in de toekomst`);
      if (isUrl(r.bron.url) && gc && leesIso(gc)) bron = { url: r.bron.url, gecontroleerd: gc };
    }
  }

  const status = r.status == null ? null : normStatus(r.status);
  if (r.status != null && !STATUSSEN.includes(status)) f('status', `status "${r.status}" kan niet; kies vastgesteld of te_verifieren`);

  let toonIn = null;
  if (r.toon_in != null) {
    const l = isLijst(r.toon_in) ? r.toon_in.map((x) => String(x).trim().toLowerCase()) : null;
    if (!l || l.some((x) => !TOON_IN.includes(x))) f('toon_in', `toon_in moet een lijst zijn met keuzes uit: ${TOON_IN.join(', ')}`);
    else toonIn = l;
  }

  let soort = null;
  if (r.soort != null) {
    soort = String(r.soort).trim().toLowerCase();
    if (!SOORTEN.includes(soort)) { f('soort', `soort "${r.soort}" bestaat niet. Kies uit: ${SOORTEN.join(', ')}`); soort = null; }
  }
  const isPeriode = wanneer && (wanneer.type === 'periode' || wanneer.type === 'periode-regel');
  if (soort === 'banner' && wanneer && !isPeriode) f('wanneer', 'een banner heeft een periode nodig (van en tot, of een periode-regel)');
  if (soort === 'periode' && wanneer && !isPeriode) w('soort', 'soort periode, maar wanneer is geen periode');

  let gesprek = null;
  if (r.gesprek != null) {
    const g = typeof r.gesprek === 'boolean' ? r.gesprek : ['ja', 'true'].includes(String(r.gesprek).toLowerCase()) ? true : ['nee', 'false'].includes(String(r.gesprek).toLowerCase()) ? false : null;
    if (g === null) f('gesprek', 'gesprek moet ja of nee zijn'); else gesprek = g;
  }
  if (r.tijd != null && !/^\d{1,2}:\d{2}(-\d{1,2}:\d{2})?$/.test(String(r.tijd))) f('tijd', 'tijd is bijvoorbeeld "18:00-19:30"');

  if (fouten.length) return { fouten, waarschuwingen, item: null };

  const soortEind = soort ?? (isPeriode ? 'periode' : 'datum');
  const rubriek = String(r.rubriek);
  const item = {
    id: String(r.id),
    titel: String(r.titel).trim(),
    rubriek,
    doelgroepen: [...new Set(doelgroepen)],
    wanneer,
    soort: soortEind,
    aftellen: aftellen ?? standaardAftellen(soortEind, rubriek),
    aftellen_expliciet: aftellen != null,
    gebied: isLijst(r.gebied) ? r.gebied.map(dep => (typeof dep === 'number' && dep < 10 ? '0' + dep : String(dep))) : (r.gebied ?? 'heel Frankrijk'),
    tekst: String(r.tekst).trim(),
    tekst_je: r.tekst_je ? String(r.tekst_je).trim() : null,
    tekst_u: r.tekst_u ? String(r.tekst_u).trim() : null,
    link: r.link ? String(r.link) : null,
    bron,
    status,
    toon_in: toonIn ?? ['nieuwsbrief', 'pagina', 'infopoche'],
    toon_in_expliciet: toonIn != null,
    groep: r.groep ? String(r.groep) : null,
    gesprek: gesprek ?? (soortEind === 'seizoen' || soortEind === 'mijlpaal'),
    tijd: r.tijd ? String(r.tijd) : null,
    kleur: r.kleur ? String(r.kleur) : null,
    tekst_nl: r.tekst_nl ? String(r.tekst_nl) : null,
    tekst_fr: r.tekst_fr ? String(r.tekst_fr) : null,
    prioriteit: Number.isFinite(r.prioriteit) ? r.prioriteit : null,
    herkomst: 'eigen',
  };
  return { fouten, waarschuwingen, item };
}

/** Standaard aftelmomenten: een deadline in de fiscale of stem-rubriek komt terug op 14, 7 en 1 dag vooraf. */
export function standaardAftellen(soort, rubriek) {
  if (soort === 'datum' && (rubriek === 'fiscaal' || rubriek === 'stemmen')) return [14, 7, 1];
  return [];
}

export function rubriekInfo(id) {
  return RUBRIEKEN.find((r) => r.id === id);
}
