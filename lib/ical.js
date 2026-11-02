// iCal-feeds per rubriek. Abonneerbaar in Google Agenda en Apple Agenda.
// De UID van een afspraak is stabiel: id plus begindatum, dus een nieuwe build maakt geen dubbele afspraken.

import { voorkomens } from './model.js';
import { plusDagen, leesIso } from './datum.js';
import { rubriekInfo } from './model.js';

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Regels langer dan 75 bytes worden gevouwen, zoals de standaard eist. */
export function vouw(regel) {
  const buf = Buffer.from(regel, 'utf8');
  if (buf.length <= 75) return regel;
  const delen = [];
  let i = 0;
  let max = 75;
  while (i < buf.length) {
    let eind = Math.min(i + max, buf.length);
    // niet midden in een teken knippen
    while (eind < buf.length && (buf[eind] & 0xc0) === 0x80) eind--;
    delen.push(buf.subarray(i, eind).toString('utf8'));
    i = eind;
    max = 74;
  }
  return delen.join('\r\n ');
}

const compact = (iso) => iso.replace(/-/g, '');
const VTIMEZONE = [
  'BEGIN:VTIMEZONE', 'TZID:Europe/Paris',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE',
];

/**
 * Bouwt een kalender. `items` zijn interne items; `van` en `tot` begrenzen de afspraken.
 * `stempel` (JJJJ-MM-DD) is de datum van de laatste vernieuwing van de data, zodat het resultaat niet bij elk verzoek verandert.
 */
export function bouwIcs(items, { naam, omschrijving, van, tot, stempel }) {
  const regels = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Communities Abroad//Kalender Frankrijk//NL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(naam)}`, `X-WR-CALDESC:${esc(omschrijving)}`, 'X-WR-TIMEZONE:Europe/Paris',
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H',
  ];
  let heeftTijd = false;
  const events = [];
  const dtstamp = `${compact(stempel)}T000000Z`;
  for (const item of items) {
    if (item.soort === 'banner') continue;
    for (const o of voorkomens(item.wanneer, van, tot)) {
      const e = ['BEGIN:VEVENT', `UID:${item.id}-${o.start}@kalender-frankrijk`, `DTSTAMP:${dtstamp}`];
      const tijd = item.tijd && /^(\d{1,2}):(\d{2})(?:-(\d{1,2}):(\d{2}))?$/.exec(item.tijd);
      if (tijd && o.start === o.end) {
        heeftTijd = true;
        const hm = (u, m) => `${String(u).padStart(2, '0')}${m}00`;
        e.push(`DTSTART;TZID=Europe/Paris:${compact(o.start)}T${hm(tijd[1], tijd[2])}`);
        e.push(`DTEND;TZID=Europe/Paris:${compact(o.start)}T${tijd[3] ? hm(tijd[3], tijd[4]) : hm(Number(tijd[1]) + 1, tijd[2])}`);
      } else {
        e.push(`DTSTART;VALUE=DATE:${compact(o.start)}`, `DTEND;VALUE=DATE:${compact(plusDagen(o.end, 1))}`);
      }
      const rub = rubriekInfo(item.rubriek)?.naam ?? item.rubriek;
      const verifieer = item.status === 'te_verifieren';
      e.push(`SUMMARY:${esc(verifieer ? `${item.titel} (te verifiëren)` : item.titel)}`);
      const beschrijving = [item.tekst];
      if (verifieer) beschrijving.push('Let op: deze datum is nog niet bevestigd.');
      if (item.link) beschrijving.push(`Meer: ${item.link}`);
      if (item.bron?.url) beschrijving.push(`Bron: ${item.bron.url}`);
      e.push(`DESCRIPTION:${esc(beschrijving.join('\n\n'))}`);
      if (item.link) e.push(`URL:${item.link}`);
      e.push(`CATEGORIES:${esc(rub)}`, `STATUS:${verifieer ? 'TENTATIVE' : 'CONFIRMED'}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
      events.push(e);
    }
  }
  if (heeftTijd) regels.push(...VTIMEZONE);
  events.sort((a, b) => a.join().localeCompare(b.join()));
  for (const e of events) regels.push(...e);
  regels.push('END:VCALENDAR');
  return regels.map(vouw).join('\r\n') + '\r\n';
}

/** Welke items horen bij een ical-naam? */
export const FISCALE_SUBFEEDS = ['fiscaal-particulier', 'fiscaal-ondernemer', 'fiscaal-nederland'];

export function itemsVoorIcal(items, naam) {
  if (naam === 'alles') return items;
  if (naam === 'fiscaal-nederland') return items.filter((i) => i.rubriek === 'fiscaal' && i.gebied === 'Nederland');
  if (naam === 'fiscaal-ondernemer') return items.filter((i) => i.rubriek === 'fiscaal' && i.gebied !== 'Nederland' && i.doelgroepen.includes('ondernemer'));
  if (naam === 'fiscaal-particulier') return items.filter((i) => i.rubriek === 'fiscaal' && i.gebied !== 'Nederland' && !(i.doelgroepen.length && i.doelgroepen.every((d) => d === 'ondernemer')));
  return items.filter((i) => i.rubriek === naam);
}
export { leesIso };
