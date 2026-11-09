// Vertalen van de ruwe kopieën in data/bron/ naar items van Kalender Frankrijk.
// Alles hier is een zuivere functie op tekst of JSON, dus te testen zonder netwerk.

import { createHash } from 'node:crypto';
import { leesIso, plusDagen, maakIso, formatNL, weekdag, verschilDagen } from './datum.js';
import { zoekRegel } from './verrijking.js';
import { departementUitTekst } from './gebied.js';

export const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' en ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
const isHttp = (s) => typeof s === 'string' && /^https?:\/\/\S+$/.test(s.trim());
const kort = (s) => createHash('sha1').update(s).digest('hex').slice(0, 8);

/** Lange streepjes in titels worden komma's: "A — B" wordt "A, B". */
export function ontstreep(s) {
  return String(s).replace(/\s*[—–]\s*/g, ', ').replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
}

// Woorden in hoofdletters die afkortingen zijn en blijven. Daarnaast blijft elk woord van hooguit drie letters
// (BBQ, ALV, TV) en elk woord zonder klinkers (NVLR, FANF) staan.
const AFKORTINGEN = new Set(['DBCRA', 'ONIZ', 'NVLR', 'FANF', 'ANEAS', 'DELF', 'DALF', 'AOW', 'IFI', 'CPAM', 'CAF', 'URSSAF', 'DNC', 'ANM', 'NLVP', 'LOTGENOTEN', 'NEDAZUR']);

/**
 * Titels in HOOFDLETTERS worden zinsopbouw met een hoofdletter vooraan; afkortingen blijven staan.
 * "THEATERVOORSTELLING "Blue Note"" wordt "Theatervoorstelling "Blue Note"", "WINTER-BBQ NVLR" wordt "Winter-BBQ NVLR".
 * Een titel zonder schreeuwwoord blijft zoals hij is.
 */
export function zinsopbouw(titel, afkortingen = []) {
  const bekend = new Set([...AFKORTINGEN, ...afkortingen.map((a) => String(a).toUpperCase())]);
  let eerste = true;
  return String(titel).replace(/[\p{L}][\p{L}']*/gu, (woord) => {
    const begin = eerste;
    eerste = false;
    const alleHoofd = woord.length >= 4 && woord === woord.toUpperCase() && woord !== woord.toLowerCase();
    const afkorting = bekend.has(woord.toUpperCase()) || !/[AEIOUYÀ-ÖØ-Ý]/.test(woord);
    if (!alleHoofd || afkorting) return woord;
    const klein = woord.toLowerCase();
    return begin ? klein.charAt(0).toUpperCase() + klein.slice(1) : klein;
  });
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function decodeer(s) {
  return String(s ?? '').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

const basis = (extra) => ({
  tekst_je: null, tekst_u: null, link: null, groep: null, tijd: null, kleur: null, tekst_nl: null, tekst_fr: null, prioriteit: null,
  gesprek: false, aftellen_expliciet: true, toon_in_expliciet: true, soort: 'datum', status: 'vastgesteld', ...extra,
});

// ---------- iCal ----------

function ontvouw(tekst) {
  return tekst.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}
const unescapeIcs = (s) => s.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');

/** Leest VEVENT's uit een iCal-tekst. Geeft [{uid, titel, omschrijving, url, start, einde, gewijzigd}]. */
export function leesIcs(tekst) {
  const uit = [];
  const blokken = ontvouw(tekst).split('BEGIN:VEVENT').slice(1);
  for (const b of blokken) {
    const body = b.split('END:VEVENT')[0];
    const veld = (naam) => {
      const m = new RegExp(`^${naam}(?:;[^:\\n]*)?:(.*)$`, 'm').exec(body);
      return m ? m[1].trim() : null;
    };
    const dat = (s) => { const m = s && /^(\d{4})(\d{2})(\d{2})/.exec(s); return m ? `${m[1]}-${m[2]}-${m[3]}` : null; };
    const start = dat(veld('DTSTART'));
    if (!start) continue;
    let einde = dat(veld('DTEND'));
    const heleDag = /DTSTART;VALUE=DATE:/.test(body);
    // DTEND is bij hele dagen exclusief
    einde = einde ? (heleDag ? plusDagen(einde, -1) : einde) : start;
    if (einde < start) einde = start;
    uit.push({
      uid: veld('UID'),
      titel: unescapeIcs(veld('SUMMARY') ?? ''),
      omschrijving: unescapeIcs(veld('DESCRIPTION') ?? ''),
      url: veld('URL'),
      start,
      einde,
      gewijzigd: dat(veld('LAST-MODIFIED') ?? veld('DTSTAMP')),
    });
  }
  return uit;
}

// ---------- fiscale feeds ----------

const FEED_URL = {
  particulier: 'https://infofrankrijk.com/?if_fc_ical=particulier',
  professionnel: 'https://infofrankrijk.com/?if_fc_ical=professionnel',
  nederland: 'https://infofrankrijk.com/?if_fc_ical=nederland',
};
export { FEED_URL };

/**
 * Zet een fiscale feed om in items. Dubbele items op dezelfde dag met dezelfde titel worden samengevoegd.
 * Geeft {items, ingelezen, samengevoegd}.
 */
export function fiscaleItems(feed, icsTekst, verrijking) {
  const ev = leesIcs(icsTekst);
  const std = verrijking.standaard?.[feed] ?? {};
  const perSleutel = new Map();
  let samengevoegd = 0;
  for (const e of ev) {
    const titel = ontstreep(e.titel);
    const sleutel = `${e.start}|${e.einde}|${titel.toLowerCase()}`;
    if (perSleutel.has(sleutel)) { samengevoegd++; continue; }
    const regel = zoekRegel(verrijking, feed, titel);
    const r = { ...std, ...(regel ?? {}) };
    const eerste = (e.omschrijving.split('\n\n')[0] ?? '').replace(/\s+/g, ' ').trim();
    const zin = r.tekst ?? (eerste || titel);
    const meerdaags = e.einde > e.start;
    const jaar = e.start.slice(0, 4);
    const bronUrl = e.url ?? FEED_URL[feed];
    perSleutel.set(sleutel, basis({
      id: `fc-${feed.slice(0, 3)}-${e.start}-${slug(titel).slice(0, 24)}-${kort(titel)}`,
      titel,
      rubriek: r.rubriek ?? 'fiscaal',
      doelgroepen: r.doelgroepen ?? ['particulier'],
      wanneer: meerdaags ? { type: 'periode', van: e.start, tot: e.einde } : { type: 'datum', datum: e.start },
      soort: meerdaags ? 'periode' : 'datum',
      aftellen: r.aftellen ?? [],
      gebied: r.gebied ?? (feed === 'nederland' ? 'Nederland' : 'heel Frankrijk'),
      tekst: zin.length > 220 ? `${zin.slice(0, 217).trimEnd()}...` : zin,
      link: r.link ?? bronUrl,
      bron: { url: bronUrl, gecontroleerd: e.gewijzigd ?? e.start },
      toon_in: r.toon_in ?? ['pagina', 'infopoche'],
      groep: r.groep ? `${r.groep}-${jaar}` : null,
      gesprek: false,
      herkomst: `fiscaal-${feed}`,
      uitleg: r.uitleg ?? null,
    }));
  }
  return { items: [...perSleutel.values()], ingelezen: ev.length, samengevoegd };
}

// ---------- feestdagen (calendrier.api.gouv.fr) ----------

const FEESTDAG_NL = {
  '1er janvier': 'Nieuwjaarsdag', 'Lundi de Pâques': 'Paasmaandag', '1er mai': 'Dag van de Arbeid', '8 mai': 'Herdenking einde Tweede Wereldoorlog (8 mai)',
  Ascension: 'Hemelvaartsdag', 'Lundi de Pentecôte': 'Pinkstermaandag', '14 juillet': 'Nationale feestdag (14 juillet)', Assomption: 'Maria-Hemelvaart',
  Toussaint: 'Allerheiligen (Toussaint)', '11 novembre': 'Wapenstilstand (11 novembre)', 'Jour de Noël': 'Eerste kerstdag', 'Vendredi saint': 'Goede Vrijdag',
  '2ème jour de Noël': 'Tweede kerstdag',
};

/** `data` heeft de vorm {metropole: {"2026": {datum: naam}}, "alsace-moselle": {...}}. */
export function feestdagItems(data, gecontroleerd) {
  const per = new Map(); // datum -> {naam, gebieden:Set}
  for (const [gebied, jaren] of Object.entries(data)) {
    for (const lijst of Object.values(jaren)) {
      for (const [datum, naam] of Object.entries(lijst)) {
        if (!leesIso(datum)) continue;
        const e = per.get(datum) ?? { naam, gebieden: new Set() };
        e.gebieden.add(gebied);
        per.set(datum, e);
      }
    }
  }
  const uit = [];
  for (const [datum, e] of [...per].sort()) {
    const nl = FEESTDAG_NL[e.naam] ?? e.naam;
    const heel = e.gebieden.has('metropole');
    const dag = formatNL(datum);
    uit.push(basis({
      id: `feestdag-${datum}-${slug(e.naam)}`,
      titel: nl,
      rubriek: 'feestdagen',
      doelgroepen: ['iedereen'],
      wanneer: { type: 'datum', datum },
      aftellen: [3, 1, 0],
      gebied: heel ? 'heel Frankrijk' : 'Elzas-Moezel',
      tekst: heel ? `Wettelijke feestdag in Frankrijk op ${dag}: veel winkels en overheidsdiensten zijn dicht.`
        : `Alleen in Elzas-Moezel een wettelijke feestdag, op ${dag}.`,
      bron: { url: 'https://calendrier.api.gouv.fr/jours-feries/', gecontroleerd },
      toon_in: ['nieuwsbrief', 'pagina', 'infopoche'],
      herkomst: 'feestdagen',
    }));
  }
  return uit;
}

// ---------- Google openbare feestdagkalenders (aanvulling) ----------

/** Alleen aanvulling: een dag waarop calendrier.api.gouv.fr al een feestdag heeft, wordt overgeslagen. */
export function googleItems(land, icsTekst, { bekendeFeestdagen = new Set(), gecontroleerd, van = '2026-01-01', tot = '2028-12-31' } = {}) {
  const uit = [];
  const gezien = new Set();
  for (const e of leesIcs(icsTekst)) {
    if (e.start < van || e.start > tot) continue;
    const wettelijk = /^public holiday/i.test(e.omschrijving.trim());
    if (land === 'fr' && (wettelijk || bekendeFeestdagen.has(e.start))) continue;
    const titel = ontstreep(e.titel);
    const sleutel = `${e.start}|${titel}`;
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    uit.push(basis({
      id: `google-${land}-${e.start}-${slug(titel)}`,
      titel,
      rubriek: 'feestdagen',
      doelgroepen: ['iedereen'],
      wanneer: { type: 'datum', datum: e.start },
      aftellen: [],
      gebied: land === 'fr' ? 'heel Frankrijk' : 'Nederland',
      tekst: land === 'fr' ? `Gedenkdag of gebruik in Frankrijk op ${formatNL(e.start)}.` : `Feest- of gedenkdag in Nederland op ${formatNL(e.start)}.`,
      bron: { url: 'https://calendar.google.com/calendar/ical/' + (land === 'fr' ? 'nl.french' : 'nl.dutch') + '%23holiday%40group.v.calendar.google.com/public/basic.ics', gecontroleerd },
      toon_in: ['pagina', 'infopoche'],
      herkomst: `google-${land}`,
    }));
  }
  return uit;
}

// ---------- schoolvakanties ----------

const VAKANTIE_NL = {
  'Vacances de la Toussaint': 'Herfstvakantie', 'Vacances de Noël': 'Kerstvakantie', "Vacances d'Hiver": 'Wintervakantie',
  'Vacances de Printemps': 'Voorjaarsvakantie', "Vacances d'Été": 'Zomervakantie', "Pont de l'Ascension": 'Brugdag na Hemelvaart',
};
const VAKANTIE_ZIN = {
  'Vacances de la Toussaint': 'herfstvakantie', 'Vacances de Noël': 'kerstvakantie', "Vacances d'Hiver": 'wintervakantie',
  'Vacances de Printemps': 'voorjaarsvakantie', "Vacances d'Été": 'zomervakantie', "Pont de l'Ascension": 'brugdag na Hemelvaart',
};

/**
 * `records` zijn de ingekorte records van data.education.gouv.fr
 * ({zones, description, start_date, end_date, annee_scolaire}). Zones met dezelfde data gaan samen in één item.
 */
export function schoolvakantieItems(records, gecontroleerd) {
  const groepen = new Map();
  for (const r of records) {
    const zone = /^Zone ([ABC])$/.exec(r.zones ?? '')?.[1];
    if (!zone || !VAKANTIE_NL[r.description]) continue;
    const van = String(r.start_date).slice(0, 10);
    const tot = String(r.end_date).slice(0, 10);
    if (!leesIso(van) || !leesIso(tot)) continue;
    const k = `${r.description}|${van}|${tot}`;
    const g = groepen.get(k) ?? { description: r.description, van, tot, zones: new Set() };
    g.zones.add(zone);
    groepen.set(k, g);
  }
  const uit = [];
  for (const g of [...groepen.values()].sort((a, b) => a.van.localeCompare(b.van))) {
    const zones = [...g.zones].sort();
    const alle = zones.length === 3;
    const zoneTekst = alle ? 'zone A, B en C' : `zone ${zones.join(' en ')}`;
    const pont = g.description === "Pont de l'Ascension";
    const periodeTekst = pont ? `op ${formatNL(g.van)}` : `van ${formatNL(g.van)} tot ${formatNL(g.tot)}`;
    uit.push(basis({
      id: `school-${slug(g.description)}-${g.van}-${zones.join('').toLowerCase()}`,
      titel: `${VAKANTIE_NL[g.description]} ${alle ? '' : `zone ${zones.join(' en ')}`}`.trim(),
      rubriek: 'school',
      doelgroepen: ['gezin'],
      wanneer: g.van === g.tot ? { type: 'datum', datum: g.van } : { type: 'periode', van: g.van, tot: g.tot },
      soort: g.van === g.tot ? 'datum' : 'periode',
      aftellen: [],
      gebied: alle ? ['zone A', 'zone B', 'zone C'] : zones.map((z) => `zone ${z}`),
      tekst: pont ? `Brugdag na Hemelvaart (${zoneTekst}): ${periodeTekst}.`
        : `${capitaliseer(VAKANTIE_ZIN[g.description])} voor ${zoneTekst} ${periodeTekst}; de eerste schooldag daarna is ${formatNL(g.tot)}.`,
      link: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F31952',
      bron: { url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F31952', gecontroleerd },
      toon_in: ['pagina', 'infopoche'],
      herkomst: 'schoolvakanties',
    }));
  }
  return uit;
}
const capitaliseer = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- verenigingen en Café Jeudi ----------

export function verenigingItems(data, gecontroleerd) {
  const uit = [];
  const gezien = new Set();
  const bijgewerkt = data?.meta?.laatst_bijgewerkt ?? gecontroleerd;
  const afkortingen = (data?.verenigingen ?? []).map((v) => v.afkorting).filter(Boolean).flatMap((a) => String(a).split(/[^\p{L}\p{N}]+/u)).filter(Boolean);
  for (const v of data?.verenigingen ?? []) {
    for (const e of v.events ?? []) {
      const ruw = decodeer(e.titel).trim();
      if (!leesIso(e.datum) || !ruw) continue;
      if (/caf[eé]\s*jeudi/i.test(ruw)) continue; // de banner van nlfr-menu is leidend
      const id = `vereniging-${slug(v.id)}-${e.datum}-${slug(ruw)}`;
      if (gezien.has(id)) continue;
      gezien.add(id);
      // genormaliseerd bij het inlezen: geen lange streepjes, geen titels in hoofdletters
      const titel = zinsopbouw(ontstreep(ruw), afkortingen);
      const plaats = ontstreep(decodeer(e.plaats ?? '').replace(/,\s*$/, '').trim());
      // bron: alleen een webadres hoort in het urlveld; tekst als "vast ritme (automatisch gegenereerd)" gaat naar opmerking
      const bronUrl = [e.bron, v.website, v.agenda_url].find(isHttp) ?? 'https://antonnoe.github.io/verenigingen-kalender/';
      const dep = departementUitTekst(plaats) ?? departementUitTekst(titel);
      const opmerking = e.bron && !isHttp(e.bron) ? ontstreep(String(e.bron)) : null;
      uit.push(basis({
        id,
        titel,
        rubriek: 'verenigingen',
        doelgroepen: ['iedereen'],
        wanneer: { type: 'datum', datum: e.datum },
        aftellen: [],
        // departement uit de postcode in de plaats (of de titel); geen of onzekere postcode: 'heel Frankrijk' en dat
        // betekent bij verenigingen "onbekend" (het filter dep van /api/vandaag laat zulke items dan weg)
        gebied: dep ? [dep] : 'heel Frankrijk',
        tekst: `${ontstreep(v.afkorting ?? v.naam)}${plaats && !/niet vermeld/i.test(plaats) ? `, ${plaats}` : ''}${e.tijd ? `, ${ontstreep(e.tijd).replace('-', ' tot ')}` : ''}.`,
        tijd: /^\d{1,2}:\d{2}(-\d{1,2}:\d{2})?$/.test(e.tijd ?? '') ? e.tijd : null,
        link: v.agenda_url ?? v.website ?? null,
        bron: { url: bronUrl, gecontroleerd: bijgewerkt },
        opmerking,
        toon_in: ['nieuwsbrief', 'pagina', 'infopoche'],
        herkomst: 'verenigingen',
        vereniging: v.afkorting ?? v.naam,
      }));
    }
  }
  return uit;
}

/** Café Jeudi als wekelijks terugkerend item. Of het deze week doorgaat, staat in de banner (zie cafeJeudiVandaag). */
export function cafeJeudiItem(banner, gecontroleerd) {
  const w = banner?.wekelijks ?? { weekdag: 4, begin: '18:00', eind: '19:30' };
  return basis({
    id: 'cafe-jeudi',
    titel: 'Café Jeudi',
    rubriek: 'verenigingen',
    doelgroepen: ['iedereen'],
    wanneer: { type: 'regel', tekst: 'elke donderdag', regel: { soort: 'wekelijks', weekdag: w.weekdag } },
    aftellen: [],
    gebied: 'heel Frankrijk',
    tekst: `Elke donderdag van ${w.begin} tot ${w.eind} een ongedwongen ontmoeting via Google Meet voor iedereen die in Frankrijk woont of daarheen wil. Gaat niet door in weken zonder aankondiging op nederlanders.fr.`,
    tijd: `${w.begin}-${w.eind}`,
    link: banner?.knop?.url ?? 'https://nlfr-menu.vercel.app',
    bron: { url: 'https://nlfr-menu.vercel.app/api/banner', gecontroleerd },
    toon_in: ['pagina', 'infopoche'],
    herkomst: 'cafe-jeudi',
  });
}

/** Alleen wat we gebruiken van /api/banner van nlfr-menu, zodat een tijdstempel niet elke dag een commit veroorzaakt. */
export function kortBanner(d) {
  return { aan: d.aan, aanTot: d.aanTot ?? null, datum: d.datum ?? null, volgende: d.volgende ?? null, wekelijks: d.wekelijks ?? null, overslaan: d.overslaan ?? [], knop: d.knop ?? null };
}

/** Is er op deze datum een Café Jeudi? Alleen op de juiste weekdag en alleen als de banner `aan` heeft. */
export function cafeJeudiVandaag(banner, datum) {
  if (!banner || banner.aan !== true) return null;
  const dag = banner.wekelijks?.weekdag ?? 4;
  if (weekdag(datum) !== dag) return null;
  if ((banner.overslaan ?? []).includes(datum)) return null;
  if (banner.aanTot && datum > banner.aanTot) return null;
  return {
    begin: banner.wekelijks?.begin ?? '18:00',
    eind: banner.wekelijks?.eind ?? '19:30',
    link: banner.knop?.url ?? null,
  };
}
