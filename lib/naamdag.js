// Naamdag ("Bonne fête aux ..."): per dag de voornamen uit data/naamdagen.json (Wikidata, aangevuld uit Wikipedia).
// Valt weg op Franse wettelijke feestdagen (de feestdagen uit data/bron/feestdagen.json) en zwijgt bij elk probleem.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const MAX_NAMEN = 3;

/** Leest het bestand; geeft {dagen} of null (ontbreekt of onleesbaar: dan geen naamdag, nooit een fout). */
export function laadNaamdagen(root) {
  try {
    const pad = join(root, 'data', 'naamdagen.json');
    if (!existsSync(pad)) return null;
    const j = JSON.parse(readFileSync(pad, 'utf8'));
    return j && typeof j.dagen === 'object' ? j : null;
  } catch { return null; }
}

/** "Théodore" / "Théodore et Mathurin" / "A, B et C" */
export function bonneFete(namen) {
  if (!namen.length) return null;
  const lijst = namen.length === 1 ? namen[0] : `${namen.slice(0, -1).join(', ')} et ${namen[namen.length - 1]}`;
  return `Bonne fête aux ${lijst}`;
}

/**
 * {namen:[...], tekst:"Bonne fête aux ..."} voor een datum (JJJJ-MM-DD), of null.
 * `feestdatums` is de set wettelijke feestdagen voor heel Frankrijk; daarop geen naamdag.
 */
export function naamdagVoor(datum, naamdagen, feestdatums) {
  try {
    if (!naamdagen || feestdatums?.has(datum)) return null;
    const namen = naamdagen.dagen?.[String(datum).slice(5)]?.namen;
    if (!Array.isArray(namen)) return null;
    const keuze = namen.filter((n) => typeof n === 'string' && n.trim()).slice(0, MAX_NAMEN);
    const tekst = bonneFete(keuze);
    return tekst ? { namen: keuze, tekst } : null;
  } catch { return null; }
}

/** Meldingen voor `npm run controleer`: 366 dagen, elk met minstens één naam, geen lang streepje. */
export function controleerNaamdagen(j) {
  const fouten = [];
  if (!j) return ['data/naamdagen.json ontbreekt of is niet te lezen'];
  const dagen = j.dagen ?? {};
  const aantal = Object.keys(dagen).length;
  if (aantal !== 366) fouten.push(`data/naamdagen.json heeft ${aantal} dagen, verwacht 366`);
  for (const [d, e] of Object.entries(dagen)) {
    if (!/^\d\d-\d\d$/.test(d)) fouten.push(`naamdagen: onbekende sleutel ${d}`);
    if (!Array.isArray(e.namen) || !e.namen.length || e.namen.some((n) => typeof n !== 'string' || !n.trim())) fouten.push(`naamdagen ${d}: geen geldige naam`);
    if (!['wikidata', 'wikipedia'].includes(e.bron)) fouten.push(`naamdagen ${d}: bron moet wikidata of wikipedia zijn`);
    if (/[–—]/.test(JSON.stringify(e))) fouten.push(`naamdagen ${d}: lang streepje`);
  }
  return fouten;
}
