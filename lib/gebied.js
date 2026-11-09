// Departement uit een Franse postcode in tekst, en de parameter `dep` van /api/vandaag.
// Bij twijfel geen uitkomst: een verkeerd departement is erger dan geen.

/** Departementsnummer bij een postcode van vijf cijfers, of null (onbekend, buitenlands, Monaco, ongeldig). */
export function departementVanPostcode(pc) {
  const p = String(pc);
  if (!/^\d{5}$/.test(p)) return null;
  const twee = Number(p.slice(0, 2));
  if (twee === 20) {
    const n = Number(p.slice(0, 3));
    if (n <= 201) return '2A';   // 20000-20199
    if (n <= 206) return '2B';   // 20200-20699
    return null;                  // 207xx-209xx bestaan niet
  }
  if (twee === 97) { const d = p.slice(0, 3); return ['971', '972', '973', '974', '975', '976'].includes(d) ? d : null; }
  if (twee === 98) { const d = p.slice(0, 3); return ['984', '985', '986', '987', '988'].includes(d) ? d : null; } // 98000 is Monaco
  if (twee >= 1 && twee <= 95) return p.slice(0, 2);
  return null;
}

/**
 * Het departement uit een tekst (adres, locatie). Alleen een getal van precies vijf cijfers telt. Komen er meerdere
 * postcodes voor die naar verschillende departementen wijzen, dan is het onzeker en is de uitkomst null.
 */
export function departementUitTekst(tekst) {
  const gevonden = new Set();
  for (const m of String(tekst ?? '').matchAll(/(?<![\d.])\d{5}(?![\d])/g)) {
    const d = departementVanPostcode(m[0]);
    if (d) gevonden.add(d);
  }
  return gevonden.size === 1 ? [...gevonden][0] : null;
}

const DEP = /^(?:0[1-9]|1\d|2[1-9]|[3-8]\d|9[0-5]|2[AB]|97[1-6]|98[4-8])$/;

/**
 * De query-parameter `dep` van /api/vandaag. Geeft { modus: 'geen' } of { modus: 'dep', dep } of null (parameter ontbreekt).
 * Een ongeldige waarde (leeg, "20", "abc", dubbel opgegeven) wordt behandeld als `geen`: liever geen lokale activiteit
 * dan een activiteit uit een ander departement.
 */
export function leesDep(waarde) {
  if (waarde === undefined) return null;
  if (typeof waarde !== 'string') return { modus: 'geen' };
  const w = waarde.trim().toUpperCase();
  if (w === 'GEEN') return { modus: 'geen' };
  return DEP.test(w) ? { modus: 'dep', dep: w } : { modus: 'geen' };
}
