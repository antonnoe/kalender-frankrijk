// Bouwt de WordPress-plugin: kopieert JS en CSS naar public/plugin/ (de voorbeeldpagina gebruikt dezelfde bron)
// en maakt public/download/kalender-frankrijk.zip. Draait met `npm run bouw`.
// Geen afhankelijkheden en geen systeemprogramma's: de zip wordt hier zelf geschreven, met vaste tijdstempels,
// zodat dezelfde bron altijd precies dezelfde zip geeft (geen ruis in git, en de test kan hem vergelijken).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const BRON = 'wordpress/kalender-frankrijk/';
export const MAP = 'kalender-frankrijk/';
export const PLUGIN_BESTANDEN = ['kalender-frankrijk.php', 'kalender-frankrijk.js', 'kalender-frankrijk.css', 'readme.txt'];
export const PUBLIEK_BESTANDEN = ['kalender-frankrijk.js', 'kalender-frankrijk.css'];

const lees = (pad) => readFileSync(new URL(pad, ROOT));

const CRC_TABEL = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABEL[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// 2 november 2026, 00:00:00 (vast, zodat de zip niet bij elke bouw verandert)
const DOS_TIJD = 0;
const DOS_DATUM = ((2026 - 1980) << 9) | (11 << 5) | 2;

/** Maakt een zip van [{naam, data}] in de gegeven volgorde. */
export function maakZip(bestanden) {
  const delen = [];
  const centraal = [];
  let positie = 0;
  for (const { naam, data } of bestanden) {
    const nm = Buffer.from(naam, 'utf8');
    const gecomprimeerd = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const lokaal = Buffer.alloc(30);
    lokaal.writeUInt32LE(0x04034b50, 0);
    lokaal.writeUInt16LE(20, 4);
    lokaal.writeUInt16LE(0x0800, 6); // naam in utf-8
    lokaal.writeUInt16LE(8, 8); // deflate
    lokaal.writeUInt16LE(DOS_TIJD, 10);
    lokaal.writeUInt16LE(DOS_DATUM, 12);
    lokaal.writeUInt32LE(crc, 14);
    lokaal.writeUInt32LE(gecomprimeerd.length, 18);
    lokaal.writeUInt32LE(data.length, 22);
    lokaal.writeUInt16LE(nm.length, 26);
    lokaal.writeUInt16LE(0, 28);
    delen.push(lokaal, nm, gecomprimeerd);

    const kop = Buffer.alloc(46);
    kop.writeUInt32LE(0x02014b50, 0);
    kop.writeUInt16LE(0x0314, 4); // gemaakt op unix, versie 2.0
    kop.writeUInt16LE(20, 6);
    kop.writeUInt16LE(0x0800, 8);
    kop.writeUInt16LE(8, 10);
    kop.writeUInt16LE(DOS_TIJD, 12);
    kop.writeUInt16LE(DOS_DATUM, 14);
    kop.writeUInt32LE(crc, 16);
    kop.writeUInt32LE(gecomprimeerd.length, 20);
    kop.writeUInt32LE(data.length, 24);
    kop.writeUInt16LE(nm.length, 28);
    kop.writeUInt32LE(((0o100644 << 16) >>> 0), 38);
    kop.writeUInt32LE(positie, 42);
    centraal.push(kop, nm);
    positie += lokaal.length + nm.length + gecomprimeerd.length;
  }
  const cd = Buffer.concat(centraal);
  const eind = Buffer.alloc(22);
  eind.writeUInt32LE(0x06054b50, 0);
  eind.writeUInt16LE(bestanden.length, 8);
  eind.writeUInt16LE(bestanden.length, 10);
  eind.writeUInt32LE(cd.length, 12);
  eind.writeUInt32LE(positie, 16);
  return Buffer.concat([...delen, cd, eind]);
}

/** De zip zoals hij uit de bron in wordpress/kalender-frankrijk/ volgt. */
export function pluginZip() {
  return maakZip(PLUGIN_BESTANDEN.map((b) => ({ naam: MAP + b, data: lees(BRON + b) })));
}

/** Leest de bestandsnamen en inhoud uit een zip (voor de test). */
export function leesZip(buf) {
  const eind = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eind < 0) throw new Error('geen zip');
  const aantal = buf.readUInt16LE(eind + 10);
  let p = buf.readUInt32LE(eind + 16);
  const uit = [];
  for (let i = 0; i < aantal; i++) {
    const methode = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const cs = buf.readUInt32LE(p + 20);
    const us = buf.readUInt32LE(p + 24);
    const nl = buf.readUInt16LE(p + 28);
    const el = buf.readUInt16LE(p + 30);
    const cl = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    const naam = buf.subarray(p + 46, p + 46 + nl).toString('utf8');
    const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    const ruw = buf.subarray(start, start + cs);
    uit.push({ naam, methode, crc, grootte: us, ruw });
    p += 46 + nl + el + cl;
  }
  return uit;
}

export function bouwPlugin() {
  mkdirSync(new URL('public/plugin/', ROOT), { recursive: true });
  mkdirSync(new URL('public/download/', ROOT), { recursive: true });
  for (const b of PUBLIEK_BESTANDEN) writeFileSync(new URL('public/plugin/' + b, ROOT), lees(BRON + b));
  writeFileSync(new URL('public/download/kalender-frankrijk.zip', ROOT), pluginZip());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  bouwPlugin();
  console.log('public/plugin/ en public/download/kalender-frankrijk.zip gemaakt uit wordpress/kalender-frankrijk/.');
}
