// Leest een YAML-bestand met een reeks blokken en onthoudt van elk veld het regelnummer,
// zodat een foutmelding kan zeggen "genieten.yaml regel 42: ...".

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { parseDocument, LineCounter, isMap, isSeq, isScalar } from 'yaml';
import { valideerItem, veldNaam } from './model.js';

/** Geeft [{ruw, lijn(veld)}] terug voor elk blok, plus eventuele syntaxfouten in gewone taal. */
export function leesBlokken(tekst, bestand) {
  const lc = new LineCounter();
  const doc = parseDocument(tekst, { lineCounter: lc, prettyErrors: false, uniqueKeys: true });
  const fouten = [];
  const gezien = new Set();
  for (const e of doc.errors) {
    // het regelnummer staat niet in de fout zelf, maar volgt uit de plek in de tekst
    const regel = e.pos?.[0] != null ? lc.linePos(e.pos[0]).line : 1;
    if (gezien.has(regel)) continue; // een fout op een regel veroorzaakt vaak meer meldingen op dezelfde regel
    gezien.add(regel);
    if (gezien.size > 3) break; // verdere meldingen zijn meestal gevolgen van de eerste
    fouten.push(`${bestand} regel ${regel}: het bestand is op regel ${regel} niet goed opgebouwd, controleer inspringing en dubbele punten${uitleg(e)}`);
  }
  if (fouten.length) return { blokken: [], fouten };
  const wortel = doc.contents;
  if (wortel == null || (isScalar(wortel) && wortel.value == null)) return { blokken: [], fouten: [] };
  if (!isSeq(wortel)) {
    return { blokken: [], fouten: [`${bestand} regel 1: het bestand moet een reeks blokken zijn die elk met "- id: ..." beginnen`] };
  }
  const blokken = wortel.items.map((node) => {
    const regelVan = (n) => (n?.range ? lc.linePos(n.range[0]).line : 1);
    const velden = {};
    if (isMap(node)) for (const p of node.items) velden[veldNaam(p.key?.value ?? p.key)] = regelVan(p.value ?? p.key);
    const lijn = (veld) => (veld && velden[veldNaam(veld)]) || regelVan(node);
    return { ruw: node.toJSON(), lijn };
  });
  return { blokken, fouten: [] };
}

/** Een korte toevoeging in gewoon Nederlands voor de bekende soorten fouten; nooit de Engelse tekst van de parser. */
function uitleg(e) {
  switch (e.code) {
    case 'DUPLICATE_KEY': return ' (hetzelfde veld staat twee keer in één blok)';
    case 'BAD_INDENT': return ' (een regel is verkeerd ingesprongen of een [ of { is niet gesloten)';
    case 'BLOCK_AS_IMPLICIT_KEY': return ' (staat er een dubbele punt in de tekst? Zet de tekst dan tussen aanhalingstekens)';
    case 'MISSING_CHAR': return ' (er ontbreekt een teken, zoals een sluitend aanhalingsteken of een streepje aan het begin van een blok)';
    case 'TAB_AS_INDENT': return ' (gebruik spaties, geen tab)';
    default: return '';
  }
}

/** Controleert één rubriekbestand. Geeft {items, fouten, waarschuwingen}. */
export function laadRubriekBestand(pad, { bekendeIds = new Set(), vandaag = null } = {}) {
  const bestand = basename(pad);
  const tekst = readFileSync(pad, 'utf8');
  const { blokken, fouten: syntax } = leesBlokken(tekst, bestand);
  const fouten = [...syntax];
  const waarschuwingen = [];
  const items = [];
  const verwacht = bestand.replace(/\.ya?ml$/, '');
  for (const { ruw, lijn } of blokken) {
    const res = valideerItem(ruw, { bestand, lijn, bekendeIds, vandaag });
    fouten.push(...res.fouten);
    waarschuwingen.push(...res.waarschuwingen);
    if (res.item) {
      bekendeIds.add(res.item.id);
      if (res.item.rubriek !== verwacht) waarschuwingen.push(`${bestand} regel ${lijn('rubriek')}: dit blok hoort bij rubriek ${res.item.rubriek}, maar staat in het bestand van ${verwacht}`);
      items.push(res.item);
    } else if (ruw && ruw.id) {
      bekendeIds.add(String(ruw.id)); // voorkom een tweede melding "bestaat al" op het goede duplicaat
    }
  }
  return { items, fouten, waarschuwingen };
}
