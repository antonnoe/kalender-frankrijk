// Datumhulpjes zonder tijdzone-gedoe: alle datums zijn tekst in de vorm JJJJ-MM-DD.
// Rekenen gebeurt in UTC op middernacht, zodat zomer- en wintertijd nooit meespelen.

export const WEEKDAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
export const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const TELWOORDEN = { eerste: 1, tweede: 2, derde: 3, vierde: 4, vijfde: 5, laatste: -1 };

const pad = (n) => String(n).padStart(2, '0');

export function bestaat(j, m, d) {
  if (!Number.isInteger(j) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12 || d < 1 || j < 1900 || j > 2200) return false;
  const t = new Date(Date.UTC(j, m - 1, d));
  return t.getUTCFullYear() === j && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export function maakIso(j, m, d) {
  return `${j}-${pad(m)}-${pad(d)}`;
}

/** 'JJJJ-MM-DD' naar {j,m,d}, of null als het geen echte datum is. */
export function leesIso(s) {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? '').trim());
  if (!t) return null;
  const [j, m, d] = [Number(t[1]), Number(t[2]), Number(t[3])];
  return bestaat(j, m, d) ? { j, m, d } : null;
}

/** Als de tekst het patroon JJJJ-MM-DD heeft maar de datum niet bestaat, geeft dit de mensentekst terug. */
export function ontbrekendeDatumTekst(s) {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? '').trim());
  return t ? `${t[3]}-${t[2]}-${t[1]}` : null;
}

function utc(iso) {
  const p = leesIso(iso);
  if (!p) throw new Error(`Ongeldige datum: ${iso}`);
  return new Date(Date.UTC(p.j, p.m - 1, p.d));
}
function naarIso(dt) {
  return maakIso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function plusDagen(iso, n) {
  const dt = utc(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return naarIso(dt);
}
export function verschilDagen(naar, van) {
  return Math.round((utc(naar) - utc(van)) / 86400000);
}
export function weekdag(iso) {
  return utc(iso).getUTCDay(); // 0 = zondag
}
export function jaarVan(iso) {
  return Number(iso.slice(0, 4));
}

/** Eerste Pasen-zondag van een jaar (Gregoriaanse berekening volgens Meeus, Jones en Butcher). */
export function pasen(jaar) {
  const a = jaar % 19;
  const b = Math.floor(jaar / 100);
  const c = jaar % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const maand = Math.floor((h + l - 7 * m + 114) / 31);
  const dag = ((h + l - 7 * m + 114) % 31) + 1;
  return maakIso(jaar, maand, dag);
}

/** n-de weekdag van een maand (n = -1 voor de laatste). */
export function ndeWeekdag(jaar, maand, dagVanWeek, n) {
  if (n > 0) {
    const eerste = weekdag(maakIso(jaar, maand, 1));
    const dag = 1 + ((dagVanWeek - eerste + 7) % 7) + (n - 1) * 7;
    return bestaat(jaar, maand, dag) ? maakIso(jaar, maand, dag) : null;
  }
  const laatsteDag = new Date(Date.UTC(jaar, maand, 0)).getUTCDate();
  const w = weekdag(maakIso(jaar, maand, laatsteDag));
  return maakIso(jaar, maand, laatsteDag - ((w - dagVanWeek + 7) % 7));
}

/** Zomertijd begint op de laatste zondag van maart en eindigt op de laatste zondag van oktober (EU). */
export function zomertijdBegin(jaar) { return ndeWeekdag(jaar, 3, 0, -1); }
export function wintertijdBegin(jaar) { return ndeWeekdag(jaar, 10, 0, -1); }

export function formatNL(iso, metWeekdag = true) {
  const p = leesIso(iso);
  const dag = `${p.d} ${MAANDEN[p.m - 1]}`;
  return metWeekdag ? `${WEEKDAGEN[weekdag(iso)]} ${dag}` : dag;
}
export function formatNLmetJaar(iso) {
  return `${formatNL(iso, false)} ${jaarVan(iso)}`;
}

/** Datum in Europe/Paris als JJJJ-MM-DD. */
export function vandaagParijs(nu = new Date()) {
  const delen = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(nu);
  return delen;
}

// ISO-weeknummer (maandag is de eerste dag van de week)
export function isoWeek(iso) {
  const dt = utc(iso);
  const dag = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - dag + 3);
  const jaar = dt.getUTCFullYear();
  const eersteDonderdag = new Date(Date.UTC(jaar, 0, 4));
  const week = 1 + Math.round(((dt - eersteDonderdag) / 86400000 - 3 + ((eersteDonderdag.getUTCDay() + 6) % 7)) / 7);
  return { jaar, week };
}

// ---------- regels ----------

const MAAND_INDEX = Object.fromEntries(MAANDEN.map((m, i) => [m, i + 1]));
const WEEKDAG_INDEX = Object.fromEntries(WEEKDAGEN.map((w, i) => [w, i]));

/**
 * Leest één datumregel. Ondersteund:
 *   jaarlijks DD-MM             (bijvoorbeeld "jaarlijks 11-11")
 *   derde donderdag van november / laatste zondag van maart / eerste maandag van september
 *   pasen, pasen +1, pasen -2
 *   elke donderdag
 * Geeft {soort, ...} terug, of gooit een Error met een Nederlandse melding.
 */
export function leesRegel(tekst) {
  const t = String(tekst).trim().toLowerCase().replace(/\s+/g, ' ');
  let m;
  if ((m = /^jaarlijks (\d{1,2})-(\d{1,2})$/.exec(t))) {
    const d = Number(m[1]);
    const mnd = Number(m[2]);
    // 29 februari is toegestaan: in andere jaren valt de regel dan weg
    if (!bestaat(2024, mnd, d)) throw new Error(`regel "${tekst}" bevat een datum die niet bestaat (verwacht: jaarlijks DD-MM)`);
    return { soort: 'vast', d, m: mnd };
  }
  if ((m = /^(eerste|tweede|derde|vierde|vijfde|laatste) (zondag|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag) van (\w+)$/.exec(t))) {
    const maand = MAAND_INDEX[m[3]];
    if (!maand) throw new Error(`regel "${tekst}": "${m[3]}" is geen maand`);
    return { soort: 'nde', n: TELWOORDEN[m[1]], weekdag: WEEKDAG_INDEX[m[2]], m: maand };
  }
  if ((m = /^pasen(?: ?([+-]) ?(\d+))?$/.exec(t))) {
    return { soort: 'pasen', offset: m[1] ? (m[1] === '-' ? -1 : 1) * Number(m[2]) : 0 };
  }
  if ((m = /^elke (zondag|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag)$/.exec(t))) {
    return { soort: 'wekelijks', weekdag: WEEKDAG_INDEX[m[1]] };
  }
  throw new Error(`regel "${tekst}" is niet te lezen. Voorbeelden: "jaarlijks 11-11", "derde donderdag van november", "laatste zondag van maart", "pasen +1", "elke donderdag"`);
}

/** De datum van een gelezen regel in een bepaald jaar, of null (bijvoorbeeld 29 februari in een gewoon jaar). */
export function regelInJaar(regel, jaar) {
  switch (regel.soort) {
    case 'vast': return bestaat(jaar, regel.m, regel.d) ? maakIso(jaar, regel.m, regel.d) : null;
    case 'nde': return ndeWeekdag(jaar, regel.m, regel.weekdag, regel.n);
    case 'pasen': return plusDagen(pasen(jaar), regel.offset);
    default: return null;
  }
}

/**
 * Leest een periode-regel: "<regel> tot <regel>" met optioneel "jaarlijks " vooraan, bijvoorbeeld
 * "jaarlijks 01-11 tot 31-03" of "pasen -2 tot pasen +1".
 */
export function leesPeriodeRegel(tekst) {
  const delen = String(tekst).split(/\s+tot\s+/i);
  if (delen.length !== 2) throw new Error(`periode "${tekst}" is niet te lezen, bijvoorbeeld: "jaarlijks 01-11 tot 31-03"`);
  const nl = (s) => (/^\d{1,2}-\d{1,2}$/.test(s.trim()) ? `jaarlijks ${s.trim()}` : s);
  const links = delen[0].trim();
  const rechts = delen[1].trim();
  return { van: leesRegel(nl(links)), tot: leesRegel(nl(rechts)) };
}

/** Alle Datums van een regel binnen [van, tot] (inclusief). */
export function datumsVanRegel(regel, van, tot) {
  const uit = [];
  if (regel.soort === 'wekelijks') {
    let d = van;
    const verschuiving = (regel.weekdag - weekdag(van) + 7) % 7;
    d = plusDagen(van, verschuiving);
    for (; d <= tot; d = plusDagen(d, 7)) uit.push(d);
    return uit;
  }
  for (let j = jaarVan(van) - 1; j <= jaarVan(tot) + 1; j++) {
    const d = regelInJaar(regel, j);
    if (d && d >= van && d <= tot) uit.push(d);
  }
  return uit;
}
