// Verrijkingsregels voor de fiscale feeds: een kleine lijst op titelpatroon, geen beheer per item.

import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { parseDocument, LineCounter } from 'yaml';
import { RUBRIEK_IDS, DOELGROEPEN, TOON_IN } from './model.js';

export const FEEDS = ['particulier', 'professionnel', 'nederland'];

/** Leest en controleert data/verrijking-fiscaal.yaml. */
export function laadVerrijking(pad) {
  const bestand = basename(pad);
  const fouten = [];
  if (!existsSync(pad)) return { regels: [], standaard: {}, fouten: [`${bestand}: het bestand ontbreekt`] };
  const lc = new LineCounter();
  const doc = parseDocument(readFileSync(pad, 'utf8'), { lineCounter: lc });
  for (const e of doc.errors) fouten.push(`${bestand} regel ${e.linePos?.[0]?.line ?? 1}: het bestand is niet goed opgebouwd (${e.message.split('\n')[0]})`);
  if (fouten.length) return { regels: [], standaard: {}, fouten };
  const js = doc.toJS() ?? {};
  const regelsNode = doc.get('regels', true);
  const regelLijn = (i) => (regelsNode?.items?.[i]?.range ? lc.linePos(regelsNode.items[i].range[0]).line : 1);
  const regels = Array.isArray(js.regels) ? js.regels : [];
  if (!Array.isArray(js.regels)) fouten.push(`${bestand} regel 1: er moet een lijst "regels:" in staan`);
  const uit = [];
  regels.forEach((r, i) => {
    const f = (t) => fouten.push(`${bestand} regel ${regelLijn(i)}: ${t}`);
    if (!r || typeof r.patroon !== 'string') return f('elke regel heeft een "patroon" nodig (een stuk tekst uit de titel)');
    let re;
    try { re = new RegExp(r.patroon, 'i'); } catch { return f(`patroon "${r.patroon}" is geen geldig zoekpatroon`); }
    if (r.feed && !FEEDS.includes(r.feed)) f(`feed "${r.feed}" bestaat niet; kies uit ${FEEDS.join(', ')}`);
    if (r.rubriek && !RUBRIEK_IDS.includes(r.rubriek)) f(`rubriek "${r.rubriek}" bestaat niet`);
    for (const d of r.doelgroepen ?? []) if (!DOELGROEPEN.includes(d)) f(`doelgroep "${d}" bestaat niet`);
    for (const t of r.toon_in ?? []) if (!TOON_IN.includes(t)) f(`toon_in "${t}" bestaat niet`);
    if (r.aftellen && (!Array.isArray(r.aftellen) || r.aftellen.some((n) => !Number.isInteger(n) || n < 1))) f('aftellen moet een lijst hele getallen zijn');
    uit.push({ ...r, re });
  });
  return { regels: uit, standaard: js.standaard ?? {}, fouten };
}

/** Eerste regel waarvan het patroon in de titel of omschrijving past (en de feed klopt) wint. */
export function zoekRegel(verrijking, feed, titel) {
  return verrijking.regels.find((r) => (!r.feed || r.feed === feed) && r.re.test(titel)) ?? null;
}
