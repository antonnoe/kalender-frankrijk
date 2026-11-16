/*
 * Kalender Frankrijk, /kalender: zuivere rekenfuncties zonder DOM.
 * Eén bestand voor zowel de pagina (als ES-module in de browser) als de tests
 * (`node --test`), zodat er geen tweede versie van deze regels bestaat.
 * Alle datums zijn tekst JJJJ-MM-DD en worden in UTC berekend, zodat zomertijd niets verstoort.
 */

export function pad(n) { return (n < 10 ? '0' : '') + n; }
export function maakIso(j, m, d) { return j + '-' + pad(m) + '-' + pad(d); }
export function lees(iso) { return { j: +iso.slice(0, 4), m: +iso.slice(5, 7), d: +iso.slice(8, 10) }; }
export function utc(iso) { const x = lees(iso); return Date.UTC(x.j, x.m - 1, x.d); }
export function plus(iso, n) {
  const t = new Date(utc(iso) + n * 86400000);
  return maakIso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
/** Maandag = 0 tot en met zondag = 6. */
export function weekdag(iso) { return (new Date(utc(iso)).getUTCDay() + 6) % 7; }
export function weekStart(iso) { return plus(iso, -weekdag(iso)); }
export function weekEind(iso) { return plus(weekStart(iso), 6); }
export function maandStart(iso) { return iso.slice(0, 8) + '01'; }
export function maandEind(iso) {
  const x = lees(iso);
  return maakIso(x.j, x.m, new Date(Date.UTC(x.j, x.m, 0)).getUTCDate());
}
export function verschuifMaand(iso, n) {
  const x = lees(iso);
  const t = new Date(Date.UTC(x.j, x.m - 1 + n, 1));
  return maakIso(t.getUTCFullYear(), t.getUTCMonth() + 1, 1);
}
export function vandaagParijs() {
  try {
    const t = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  } catch { /* terugval hieronder */ }
  const n = new Date();
  return maakIso(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

/**
 * De dagen van een maandoverzicht: hele weken (maandag tot en met zondag) die samen de
 * maand van `iso` dekken. Elke dag heeft `inMaand` (voor de opmaak van dagen buiten de maand).
 * Altijd een veelvoud van 7 dagen, meestal 35 of 42.
 */
export function maandDagen(iso) {
  const start = weekStart(maandStart(iso));
  const eind = weekEind(maandEind(iso));
  const maandNr = lees(maandStart(iso)).m;
  const dagen = [];
  for (let d = start; d <= eind; d = plus(d, 1)) {
    dagen.push({ datum: d, inMaand: lees(d).m === maandNr });
  }
  return dagen;
}

/** De zeven dagen (maandag tot en met zondag) van de week van `iso`. */
export function weekDagen(iso) {
  const start = weekStart(iso);
  const dagen = [];
  for (let i = 0; i < 7; i++) dagen.push({ datum: plus(start, i), inMaand: true });
  return dagen;
}

/** De gekozen rubrieken als lijst (een tekst geeft één rubriek, leeg of ontbrekend betekent "Alles"). */
function alsLijst(rubriek) {
  if (Array.isArray(rubriek)) return rubriek.filter(Boolean);
  return rubriek ? [rubriek] : [];
}

/** Items (of kalenderregels {item, vk}) die bij de gekozen rubriek(en) horen; een lege of ontbrekende keuze laat alles staan. */
export function filterPerRubriek(items, rubriek) {
  const aan = alsLijst(rubriek);
  if (!aan.length) return items.slice();
  return items.filter((item) => item && (aan.includes(item.rubriek) || (item.item && aan.includes(item.item.rubriek))));
}

/**
 * Schakelaar van de rubriekknoppen. `aan` is de lijst van aangezette rubrieken (leeg is "Alles").
 * Een klik op "Alles" (id leeg) zet alles aan; een klik op een rubriek terwijl "Alles" aan staat toont alleen die rubriek;
 * verdere klikken zetten een rubriek erbij of eraf; blijft er niets over, dan is het weer "Alles".
 */
export function schakelRubriek(aan, id) {
  if (!id) return [];
  const lijst = alsLijst(aan);
  return lijst.includes(id) ? lijst.filter((x) => x !== id) : lijst.concat(id);
}

/**
 * Smal of breed, en de schaal. Smal is: het venster is smaller dan 700 px, of het apparaat is een telefoon
 * (screen.width onder 700) terwijl het venster breed is (meer dan anderhalf keer screen.width), zoals een iframe in een
 * pagina zonder viewport-instelling. In dat tweede geval is de schaal innerWidth gedeeld door screen.width, anders 1.
 */
export function bepaalWeergave(innerWidth, schermBreedte) {
  const iw = Number(innerWidth) || 0;
  const sw = Number(schermBreedte) || 0;
  if (iw > 0 && iw < 700) return { smal: true, schaal: 1 };
  if (sw > 0 && sw < 700 && iw > 1.5 * sw) return { smal: true, schaal: iw / sw };
  return { smal: false, schaal: 1 };
}

/** Index van de dag in `dagen` waarna het detailpaneel komt: de laatste cel van de weekrij van `gekozen`; -1 zonder gekozen dag of als die niet in het rooster staat. */
export function paneelNaIndex(dagen, gekozen) {
  if (!gekozen) return -1;
  const i = dagen.findIndex((d) => d.datum === gekozen);
  return i < 0 ? -1 : Math.floor(i / 7) * 7 + 6;
}

/** Welke rubrieken hebben minstens één item in `perDag` (object datum naar lijst van {item})? Geeft {rubriekId: true}. */
export function rubriekenMetItems(perDag) {
  const heeft = {};
  Object.keys(perDag || {}).forEach((d) => (perDag[d] || []).forEach((e) => { if (e && e.item && e.item.rubriek) heeft[e.item.rubriek] = true; }));
  return heeft;
}

/** De datums (in gegeven volgorde) die na het rubriekfilter minstens één item hebben: de lijst per dag voor een maand. */
export function dagenMetItems(datums, perDag, rubriek, filter = filterPerRubriek) {
  return datums.filter((d) => filter((perDag && perDag[d]) || [], rubriek).length > 0);
}
