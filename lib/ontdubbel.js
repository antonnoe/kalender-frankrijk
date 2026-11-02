// Ontdubbelen over bronnen heen. Dezelfde dag met dezelfde (of gelijkwaardige) titel komt maar één keer voor:
// de feestdag uit calendrier.api.gouv.fr, dezelfde feestdag in de Google-kalender en een eigen item over diezelfde dag
// worden samen één item. Voorrang: eigen item, dan de officiële bron, dan Google. Het gebied van de verliezers wordt
// bij de winnaar opgeteld (Frankrijk en Nederland). Zie docs/ONTWERP.md en README.
//
// Verenigingsactiviteiten met gelijke titel op dezelfde dag van verschillende verenigingen zijn echt twee activiteiten:
// die blijven apart en krijgen de verenigingsnaam in de titel als die ontbreekt.

import { voorkomens } from './model.js';

/** Kleine letters, zonder accenten en leestekens, spaties samengetrokken. */
export function normaliseerTitel(t) {
  return String(t ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' en ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Bekende vertaalparen en schrijfwijzen. Links de genormaliseerde variant, rechts de vaste sleutel.
const GROEPEN = {
  'eerste kerstdag': ['jour de noel', 'eerste kerstdag', 'eerste kerstdag', 'christmas day', 'kerstdag', 'noel'],
  'tweede kerstdag': ['2eme jour de noel', 'deuxieme jour de noel', 'tweede kerstdag', 'boxing day', 'st stephen s day', 'saint etienne'],
  'kerstavond': ['christmas eve', 'kerstavond', 'veille de noel', 'reveillon de noel'],
  'oudejaarsavond': ['new year s eve', 'oudejaarsavond', 'saint sylvestre', 'reveillon du nouvel an'],
  'nieuwjaarsdag': ['jour de l an', '1er janvier', 'nieuwjaarsdag', 'new year s day', 'nieuwjaar'],
  'hemelvaartsdag': ['ascension', 'hemelvaartsdag', 'hemelvaart', 'ascension day'],
  'goede vrijdag': ['vendredi saint', 'goede vrijdag', 'good friday'],
  'eerste paasdag': ['dimanche de paques', 'paques', 'eerste paasdag', 'paaszondag', 'easter sunday', 'easter'],
  'paasmaandag': ['lundi de paques', 'paasmaandag', 'tweede paasdag', 'easter monday'],
  'eerste pinksterdag': ['pentecote', 'dimanche de pentecote', 'eerste pinksterdag', 'pinksterzondag', 'whit sunday', 'pentecost'],
  'pinkstermaandag': ['lundi de pentecote', 'pinkstermaandag', 'tweede pinksterdag', 'whit monday'],
  '14 juillet': ['fete nationale', '14 juillet', 'nationale feestdag 14 juillet', 'nationale feestdag', 'bastille day', 'dag van de bestorming van de bastille'],
  'dag van de arbeid': ['1er mai', 'fete du travail', 'dag van de arbeid', 'labour day', 'labor day'],
  '8 mai': ['8 mai', 'victoire 1945', 'herdenking einde tweede wereldoorlog 8 mai', 'herdenking einde tweede wereldoorlog', 'victory in europe day'],
  'maria hemelvaart': ['assomption', 'maria hemelvaart', 'assumption of mary', 'assumption day'],
  'allerheiligen': ['toussaint', 'allerheiligen', 'allerheiligen toussaint', 'all saints day'],
  'wapenstilstand': ['11 novembre', 'armistice', 'wapenstilstand', 'wapenstilstand 11 novembre', 'armistice day'],
  'koningsdag': ['koningsdag', 'king s day', 'kings day'],
  'moederdag': ['moederdag', 'fete des meres', 'mother s day'],
  'vaderdag': ['vaderdag', 'fete des peres', 'father s day'],
  'zomertijd': ['zomertijd', 'zomertijd klok een uur vooruit', 'daylight saving time starts', 'heure d ete', 'begin zomertijd'],
  'wintertijd': ['wintertijd', 'wintertijd klok een uur terug', 'daylight saving time ends', 'heure d hiver', 'begin wintertijd'],
};
const VERTAAL = new Map();
for (const [sleutel, varianten] of Object.entries(GROEPEN)) for (const v of varianten) VERTAAL.set(v, sleutel);

// "vrij in Elzas-Moezel" of "vrij" aan het eind van een titel hoort bij dezelfde dag
const VRIJ_ACHTERAAN = /\s+(?:vrije dag|vrij)(?:\s+in\s+[a-z0-9 ]+)?$/;

/** De sleutel waarop twee titels als gelijkwaardig gelden. */
export function titelSleutel(titel) {
  const n = normaliseerTitel(titel);
  if (VERTAAL.has(n)) return VERTAAL.get(n);
  const kaal = n.replace(VRIJ_ACHTERAAN, '');
  return VERTAAL.get(kaal) ?? kaal;
}
const heeftVrijAchteraan = (titel) => VRIJ_ACHTERAAN.test(normaliseerTitel(titel));

const gebiedLijst = (g) => (Array.isArray(g) ? g : [g ?? 'heel Frankrijk']).map(String);

/** Voorrang: eigen item, dan de officiële bron, dan de rest, dan Google (Nederlandse titels voor Engelse). */
function rang(i) {
  if (i.herkomst === 'eigen') return 0;
  if (i.herkomst === 'feestdagen' || i.herkomst === 'schoolvakanties') return 1;
  if (i.herkomst === 'google-nl') return 3;
  if (i.herkomst === 'google-fr') return 4; // de Franse Google-kalender heeft Engelse titels: de Nederlandse titel gaat voor
  return 2;
}

const PUNT_SOORTEN = new Set(['datum', 'datums', 'regel']);
const isPunt = (i) => i.soort !== 'banner' && PUNT_SOORTEN.has(i.wanneer?.type);

function uitzonderen(item, datum) {
  const w = item.wanneer;
  w.uitgezonderd = [...new Set([...(w.uitgezonderd ?? []), datum])].sort();
}

/** Het gebied van `m` zit al in dat van `w`. */
const isDeelvan = (m, w) => {
  const b = new Set(gebiedLijst(w.gebied));
  return gebiedLijst(m.gebied).every((x) => b.has(x));
};

function voegSamen(w, m) {
  const gebied = [...new Set([...gebiedLijst(w.gebied), ...gebiedLijst(m.gebied)])];
  if (gebied.length > gebiedLijst(w.gebied).length) w.gebied = gebied;
  for (const d of m.doelgroepen ?? []) if (!w.doelgroepen.includes(d)) w.doelgroepen.push(d);
}

/**
 * Ontdubbelt `items` op dezelfde plaats (er wordt niets weggegooid dat nog een andere dag heeft: een verliezer krijgt
 * alleen die dag in `wanneer.uitgezonderd`). Geeft {items, ontdubbeld} met het aantal samengevoegde dagen.
 */
export function ontdubbel(items) {
  const emmer = new Map(); // sleutel -> [item]
  for (const i of items) {
    if (!isPunt(i) || i.herkomst === 'verenigingen') continue;
    const s = titelSleutel(i.titel);
    if (!s) continue;
    if (!emmer.has(s)) emmer.set(s, []);
    emmer.get(s).push(i);
  }
  // het bereik waarin regels worden uitgerekend: van de eerste tot de laatste vaste datum
  let eerste = null; let laatste = null;
  for (const i of items) {
    const ds = i.wanneer?.type === 'datum' ? [i.wanneer.datum] : i.wanneer?.type === 'datums' ? i.wanneer.datums : [];
    for (const d of ds) { if (!eerste || d < eerste) eerste = d; if (!laatste || d > laatste) laatste = d; }
  }
  let ontdubbeld = 0;
  if (eerste && laatste) {
    for (const lijst of emmer.values()) {
      if (lijst.length < 2) continue;
      const perDag = new Map(); // datum -> [item]
      for (const i of lijst) {
        for (const o of voorkomens(i.wanneer, eerste, laatste)) {
          if (!perDag.has(o.start)) perDag.set(o.start, []);
          perDag.get(o.start).push(i);
        }
      }
      for (const [datum, leden] of perDag) {
        if (leden.length < 2) continue;
        let rest = [...leden].sort((a, b) => rang(a) - rang(b) || a.id.localeCompare(b.id));
        while (rest.length > 1) {
          const w = rest.shift();
          const over = [];
          for (const m of rest) {
            // een titel als "Tweede kerstdag vrij in Elzas-Moezel" neemt geen ander gebied (Nederland) in zich op
            if (heeftVrijAchteraan(w.titel) && !isDeelvan(m, w)) { over.push(m); continue; }
            voegSamen(w, m);
            uitzonderen(m, datum);
            ontdubbeld++;
          }
          rest = over;
        }
      }
    }
  }
  // een item dat nergens meer voorkomt (alleen losse datums, allemaal samengevoegd) verdwijnt
  const uit = items.filter((i) => {
    const w = i.wanneer;
    if (w?.uitgezonderd?.length && (w.type === 'datum' || w.type === 'datums')) return voorkomens(w, '0001-01-01', '9999-12-31').length > 0;
    return true;
  });
  return { items: uit, ontdubbeld };
}

/**
 * Verenigingsactiviteiten met gelijke titel op dezelfde dag van verschillende verenigingen blijven apart,
 * maar krijgen de verenigingsnaam in de titel als die ontbreekt.
 */
export function naamVerenigingBijGelijkeTitel(items) {
  const groepen = new Map();
  for (const i of items) {
    if (i.herkomst !== 'verenigingen' || i.wanneer?.type !== 'datum') continue;
    const k = `${i.wanneer.datum}|${titelSleutel(i.titel)}`;
    if (!groepen.has(k)) groepen.set(k, []);
    groepen.get(k).push(i);
  }
  let aangepast = 0;
  for (const lijst of groepen.values()) {
    if (new Set(lijst.map((i) => i.vereniging)).size < 2) continue;
    for (const i of lijst) {
      const naam = i.vereniging;
      if (!naam || normaliseerTitel(i.titel).includes(normaliseerTitel(naam))) continue;
      i.titel = `${i.titel} (${naam})`;
      aangepast++;
    }
  }
  return aangepast;
}
