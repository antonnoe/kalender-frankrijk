// Doorlink naar het forum van Nederlanders.fr, met een kant-en-klare aanzet voor een bericht.
// Uitkomst van het onderzoek naar vooraf invullen: zie docs/FORUMLINK.md.

import { formatNL, leesIso } from './datum.js';

export const FORUM_NIEUW_BERICHT = 'https://www.nederlanders.fr/profiles/blog/new';
// NING laat een niet-ingelogde bezoeker niet bij het formulier, dus vooraf invullen is niet te toetsen.
// Staat dit op een parameternaam (bijvoorbeeld 'title'), dan wordt de titel aan de url toegevoegd.
export const FORUM_PREFILL_TITEL = null;

export function forumAanzet(item, start) {
  const wanneer = start && leesIso(start) ? ` (${formatNL(start, false)})` : '';
  const titel = `${item.titel}${wanneer}`;
  const eerste = item.tekst_je || item.tekst;
  const tekst = `${eerste} Wat zijn jullie ervaringen hiermee? Delen jullie hier wat voor jullie in de praktijk werkt?`;
  return { titel, tekst };
}

export function forumUrl(item, start) {
  if (!item.gesprek) return null;
  if (!FORUM_PREFILL_TITEL) return FORUM_NIEUW_BERICHT;
  const aanzet = forumAanzet(item, start);
  return `${FORUM_NIEUW_BERICHT}?${FORUM_PREFILL_TITEL}=${encodeURIComponent(aanzet.titel)}`;
}
