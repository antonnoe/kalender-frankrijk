// Maanstand per dag, uit de maanomloop zelf (Meeus, Astronomical Algorithms, hoofdstuk 49, ongeveer 1 minuut nauwkeurig).
// Geen pakket, geen bestand: één bron voor InfoPoche en de nieuwsbrief. Een hoofdfase geldt op de dag (Franse tijd)
// waarop het moment valt; de andere dagen krijgen de tussenfase uit de laatste hoofdfase (noordelijk halfrond).

export const FASEN = {
  'nieuwe-maan': 'Nieuwe maan',
  'wassende-sikkel': 'Wassende sikkel',
  'eerste-kwartier': 'Eerste kwartier',
  'wassende-maan': 'Wassende maan',
  'volle-maan': 'Volle maan',
  'afnemende-maan': 'Afnemende maan',
  'laatste-kwartier': 'Laatste kwartier',
  'afnemende-sikkel': 'Afnemende sikkel',
};
const REEKS = Object.keys(FASEN); // index 0, 2, 4, 6 zijn hoofdfasen; q (0 tot 3) = index / 2

const rad = (g) => (g * Math.PI) / 180;
const SYN = 29.530588861;
const sin = (g) => Math.sin(rad(g));

/** Moment (JDE, dynamische tijd) van hoofdfase q (0 nieuw, 1 eerste kwartier, 2 vol, 3 laatste kwartier) in lunatie k. */
export function fasemoment(k0, q) {
  const k = k0 + q / 4;
  const T = k / 1236.85;
  let jde = 2451550.09766 + SYN * k + 0.00015437 * T ** 2 - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2;
  const M = 2.5534 + 29.1053567 * k - 0.0000014 * T ** 2 - 0.00000011 * T ** 3;
  const Mm = 201.5643 + 385.81693528 * k + 0.0107582 * T ** 2 + 0.00001238 * T ** 3 - 0.000000058 * T ** 4;
  const F = 160.7108 + 390.67050284 * k - 0.0016118 * T ** 2 - 0.00000227 * T ** 3 + 0.000000011 * T ** 4;
  const O = 124.7746 - 1.56375588 * k + 0.0020672 * T ** 2 + 0.00000215 * T ** 3;
  let c;
  if (q === 0) {
    c = -0.4072 * sin(Mm) + 0.17241 * E * sin(M) + 0.01608 * sin(2 * Mm) + 0.01039 * sin(2 * F) + 0.00739 * E * sin(Mm - M)
      - 0.00514 * E * sin(Mm + M) + 0.00208 * E * E * sin(2 * M) - 0.00111 * sin(Mm - 2 * F) - 0.00057 * sin(Mm + 2 * F)
      + 0.00056 * E * sin(2 * Mm + M) - 0.00042 * sin(3 * Mm) + 0.00042 * E * sin(M + 2 * F) + 0.00038 * E * sin(M - 2 * F)
      - 0.00024 * E * sin(2 * Mm - M) - 0.00017 * sin(O) - 0.00007 * sin(Mm + 2 * M) + 0.00004 * sin(2 * Mm - 2 * F)
      + 0.00004 * sin(3 * M) + 0.00003 * sin(Mm + M - 2 * F) + 0.00003 * sin(2 * Mm + 2 * F) - 0.00003 * sin(Mm + M + 2 * F)
      + 0.00003 * sin(Mm - M + 2 * F) - 0.00002 * sin(Mm - M - 2 * F) - 0.00002 * sin(3 * Mm + M) + 0.00002 * sin(4 * Mm);
  } else if (q === 2) {
    c = -0.40614 * sin(Mm) + 0.17302 * E * sin(M) + 0.01614 * sin(2 * Mm) + 0.01043 * sin(2 * F) + 0.00734 * E * sin(Mm - M)
      - 0.00515 * E * sin(Mm + M) + 0.00209 * E * E * sin(2 * M) - 0.00111 * sin(Mm - 2 * F) - 0.00057 * sin(Mm + 2 * F)
      + 0.00056 * E * sin(2 * Mm + M) - 0.00042 * sin(3 * Mm) + 0.00042 * E * sin(M + 2 * F) + 0.00038 * E * sin(M - 2 * F)
      - 0.00024 * E * sin(2 * Mm - M) - 0.00017 * sin(O) - 0.00007 * sin(Mm + 2 * M) + 0.00004 * sin(2 * Mm - 2 * F)
      + 0.00004 * sin(3 * M) + 0.00003 * sin(Mm + M - 2 * F) + 0.00003 * sin(2 * Mm + 2 * F) - 0.00003 * sin(Mm + M + 2 * F)
      + 0.00003 * sin(Mm - M + 2 * F) - 0.00002 * sin(Mm - M - 2 * F) - 0.00002 * sin(3 * Mm + M) + 0.00002 * sin(4 * Mm);
  } else {
    c = -0.62801 * sin(Mm) + 0.17172 * E * sin(M) - 0.01183 * E * sin(Mm + M) + 0.00862 * sin(2 * Mm) + 0.00804 * sin(2 * F)
      + 0.00454 * E * sin(Mm - M) + 0.00204 * E * E * sin(2 * M) - 0.0018 * sin(Mm - 2 * F) - 0.0007 * sin(Mm + 2 * F)
      - 0.0004 * sin(3 * Mm) - 0.00034 * E * sin(2 * Mm - M) + 0.00032 * E * sin(M + 2 * F) + 0.00032 * E * sin(M - 2 * F)
      - 0.00028 * E * E * sin(Mm + 2 * M) + 0.00027 * E * sin(2 * Mm + M) - 0.00017 * sin(O) - 0.00005 * sin(Mm - M - 2 * F)
      + 0.00004 * sin(2 * Mm + 2 * F) - 0.00004 * sin(Mm + M + 2 * F) + 0.00004 * sin(Mm - 2 * M) + 0.00003 * sin(Mm + M - 2 * F)
      + 0.00003 * sin(3 * M) + 0.00002 * sin(2 * Mm - 2 * F) + 0.00002 * sin(Mm - M + 2 * F) - 0.00002 * sin(3 * Mm + M);
    const W = 0.00306 - 0.00038 * E * Math.cos(rad(M)) + 0.00026 * Math.cos(rad(Mm)) - 0.00002 * Math.cos(rad(Mm - M))
      + 0.00002 * Math.cos(rad(Mm + M)) + 0.00002 * Math.cos(rad(2 * F));
    c += q === 1 ? W : -W;
  }
  const A = [[299.77, 0.107408, 0.000325], [251.88, 0.016321, 0.000165], [251.83, 26.651886, 0.000164], [349.42, 36.412478, 0.000126],
    [84.66, 18.206239, 0.00011], [141.74, 53.303771, 0.000062], [207.14, 2.453732, 0.00006], [154.84, 7.30686, 0.000056],
    [34.52, 27.261239, 0.000047], [207.19, 0.121824, 0.000042], [291.34, 1.844379, 0.00004], [161.72, 24.198154, 0.000037],
    [239.56, 25.513099, 0.000035], [331.55, 3.592518, 0.000023]];
  let p = 0;
  A.forEach(([a0, a1, co], i) => { p += co * sin(a0 + a1 * k - (i === 0 ? 0.009173 * T * T : 0)); });
  jde += c + p;
  return jde;
}

/** ΔT (TT min UT) in seconden, Espenak en Meeus voor 2005 tot 2050; hier ruim goed genoeg. */
function deltaT(jaar) { const t = jaar - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }

/** Hoofdfasemoment als Date (UTC). */
function naarDate(jde, jaar) {
  const ms = (jde - 2440587.5) * 86400000 - deltaT(jaar) * 1000;
  return new Date(Math.round(ms));
}

const PARIJS = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });
/** Kalenderdag (JJJJ-MM-DD) van een moment in Franse tijd. */
export function parijsDag(date) { return PARIJS.format(date); }

/** Hoofdfasemomenten rond een datum: [{q, tijd: Date}], oplopend. */
export function momentenRond(datum) {
  const [j, m, d] = datum.split('-').map(Number);
  const midden = Date.UTC(j, m - 1, d, 11);
  const jd = midden / 86400000 + 2440587.5;
  const k = Math.floor((jd - 2451550.09766) / SYN);
  const lijst = [];
  for (let kk = k - 1; kk <= k + 1; kk++) for (let q = 0; q < 4; q++) lijst.push({ q, tijd: naarDate(fasemoment(kk, q), j) });
  return lijst.sort((a, b) => a.tijd - b.tijd);
}

/** {fase, naam} voor een dag (JJJJ-MM-DD, Franse kalenderdag), of null bij een ongeldige datum of een fout. */
export function maanVoor(datum) {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(datum))) return null;
    const [j, m, d] = datum.split('-').map(Number);
    if (j < 1900 || j > 2100) return null;
    const lijst = momentenRond(datum);
    const vandaag = lijst.find((x) => parijsDag(x.tijd) === datum);
    let idx;
    if (vandaag) idx = vandaag.q * 2;
    else {
      const noen = new Date(Date.UTC(j, m - 1, d, 11));
      const vorige = [...lijst].reverse().find((x) => x.tijd <= noen);
      if (!vorige) return null;
      idx = vorige.q * 2 + 1;
    }
    const fase = REEKS[idx];
    return { fase, naam: FASEN[fase] };
  } catch {
    return null;
  }
}
