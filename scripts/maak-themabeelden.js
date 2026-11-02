// Maakt de themabeelden: per rubriek een SVG en een PNG van 112 x 112 (e-mail toont geen SVG).
// Stijl van InfoPoche: getinte achtergrond, stippenraster en een lijnpictogram in de themakleur
// (viewBox 76 x 76, lijn 4, ronde uiteinden). Geen foto's van derden.
// Gebruik: npm run beelden

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { RUBRIEKEN } from '../lib/model.js';

const UIT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'beeld');

// Pictogrampaden: munt, huis, weg, hart, mensen uit InfoPoche (ICONEN); kalenderblad, vlag, boek en glas
// zijn de eigen pictogrammen in dezelfde lijnstijl, gebouw is voor Stemmen en Nederland.
export const ICONEN = {
  munt: 'M62 38a24 24 0 1 1-48 0 24 24 0 1 1 48 0zM47 28a11 11 0 1 0 0 20M29 35h15M29 42h13',
  huis: 'M12 38 38 14l26 24M18 34v28h40V34M32 62V46h12v16',
  weg: 'M30 10 20 66M46 10 56 66M38 14v8M38 32v10M38 52v10',
  hart: 'M38 62C22 50 12 40 12 29 12 21 18 15 25 15 31 15 36 18 38 23 40 18 45 15 51 15 58 15 64 21 64 29 64 40 54 50 38 62zM38 28v14M31 35h14',
  mensen: 'M30 32a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 62c0-10 8-16 18-16s18 6 18 16M52 30a8 8 0 1 0 0-16M56 46c6 2 10 8 10 16',
  kalenderblad: 'M14 18h48v44H14zM14 30h48M26 12v12M50 12v12M24 42h8M36 42h8M48 42h4M24 52h8M36 52h8',
  vlag: 'M20 66V12M20 15h34l-8 12 8 12H20',
  boek: 'M38 22C30 16 20 15 12 16v42c8-1 18 0 26 6 8-6 18-7 26-6V16c-8-1-18 0-26 6zM38 22v42',
  glas: 'M26 12h24v14a12 12 0 0 1-24 0zM38 38v22M28 62h20M27 22h22',
  gebouw: 'M10 62h56M12 30 38 14l26 16zM18 36v22M30 36v22M46 36v22M58 36v22',
};

export function maakSvg(rubriek) {
  const pad = ICONEN[rubriek.icoon];
  const k = rubriek.kleur;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 76 76" role="img" aria-label="${rubriek.naam}">
<title>${rubriek.naam}</title>
<defs><pattern id="stip" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="${k}" opacity=".18"/></pattern></defs>
<rect width="76" height="76" fill="${rubriek.tint}"/>
<rect width="76" height="76" fill="url(#stip)"/>
<path d="${pad}" fill="none" stroke="${k}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" transform="translate(11.4 11.4) scale(.7)"/>
</svg>
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(UIT, { recursive: true });
  for (const r of RUBRIEKEN) {
    const svg = maakSvg(r);
    writeFileSync(join(UIT, `${r.id}.svg`), svg);
    await sharp(Buffer.from(svg), { density: 300 }).resize(112, 112).png({ compressionLevel: 9 }).toFile(join(UIT, `${r.id}.png`));
    console.log(`public/beeld/${r.id}.svg en .png (${r.naam})`);
  }
}
