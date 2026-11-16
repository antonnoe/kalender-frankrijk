/*
 * Kalender Frankrijk, /kalender: een kalenderweergave bedoeld voor een iframe op een pagina
 * van Nederlanders.fr. Zelfstandig: geen afhankelijkheden, geen opslag in de browser, geen
 * eigen kop, menu of voettekst. Leest alleen de openbare API van deze repo (dezelfde bron als
 * de pagina op Infofrankrijk en InfoPoche). Alle tekst uit de API gaat via textContent, nooit
 * als HTML ingevoegd.
 */
import {
  lees, plus, weekStart, weekEind, maandStart, maandEind, verschuifMaand, vandaagParijs,
  maandDagen, weekDagen, filterPerRubriek, dagenMetItems, rubriekenMetItems,
} from './kalender-weergave.js';

(function () {
  'use strict';

  var API = '';
  var TIMEOUT_MS = 8000;
  var MAX_IN_CEL_MAAND = 3;
  var MAX_IN_CEL_WEEK = 10;

  var DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
  var DAG_KORT = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO'];
  var MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  var KORT = {
    fiscaal: 'Fiscaal', uitkeringen: 'Uitkeringen', feestdagen: 'Feestdagen', school: 'School', wonen: 'Wonen',
    buiten: 'Buiten', zorg: 'Zorg', stemmen: 'Stemmen', genieten: 'Tradities', verenigingen: 'Verenigingen', moestuin: 'Moestuin',
  };

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dagMaand(iso, metJaar) { var x = lees(iso); return x.d + ' ' + MAANDEN[x.m - 1] + (metJaar ? ' ' + x.j : ''); }
  function dagNaam(iso) { var x = lees(iso); return DAGEN[(new Date(Date.UTC(x.j, x.m - 1, x.d)).getUTCDay() + 6) % 7]; }
  function dagLabel(iso) { return dagNaam(iso) + ' ' + dagMaand(iso, true); }
  function datumNl(iso) { var x = lees(iso); return pad2(x.d) + '-' + pad2(x.m) + '-' + x.j; }
  function schoon(t) { return String(t == null ? '' : t); }
  function veiligeUrl(u) { return typeof u === 'string' && /^https:\/\/[^\s]+$/i.test(u) ? u : null; }
  function hostVan(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
  function isHeelFrankrijk(g) { var t = Array.isArray(g) ? g.join(', ') : g; return (t || 'heel Frankrijk').toLowerCase() === 'heel frankrijk'; }
  function gebiedTekst(g) { var t = Array.isArray(g) ? g.join(', ') : g; return t || 'heel Frankrijk'; }

  function h(tag, p, kids) {
    var e = document.createElement(tag);
    for (var k in p) {
      if (!Object.prototype.hasOwnProperty.call(p, k)) continue;
      var v = p[k];
      if (v == null || v === false) continue;
      if (k === 'klas') e.className = v;
      else if (k === 'tekst') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : String(v));
    }
    (kids || []).forEach(function (c) {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function externeLink(url, tekst, klas) {
    return h('a', { klas: klas, href: url, target: '_blank', rel: 'noopener', tekst: tekst });
  }

  function haalJson(url) {
    return new Promise(function (ok, mis) {
      var ac = typeof AbortController === 'function' ? new AbortController() : null;
      var klaar = false;
      var timer = setTimeout(function () { if (!klaar) { klaar = true; if (ac) ac.abort(); mis(new Error('time-out')); } }, TIMEOUT_MS);
      fetch(url, { credentials: 'omit', signal: ac ? ac.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error('status ' + r.status); return r.json(); })
        .then(function (j) { if (!klaar) { klaar = true; clearTimeout(timer); ok(j); } })
        .catch(function (e) { if (!klaar) { klaar = true; clearTimeout(timer); mis(e); } });
    });
  }

  var vandaag = vandaagParijs();
  var s = {
    weergave: 'maand',
    gekozen: vandaag,
    rubriek: '',
    open: null,
    rubrieken: [],
    items: {},
    vensters: [],
    bezig: {},
    klaar: false,
    fout: false,
    vensterFout: false,
    scrollNaar: null,
  };

  function zetItems(lijst) {
    (lijst || []).forEach(function (i) {
      if (!i || typeof i.id !== 'string' || typeof i.titel !== 'string') return;
      var nieuw = [];
      var gezien = {};
      var oud = s.items[i.id] ? s.items[i.id].voorkomens : [];
      (oud.concat(Array.isArray(i.voorkomens) ? i.voorkomens : [])).forEach(function (v) {
        if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v.van || '') || !/^\d{4}-\d{2}-\d{2}$/.test(v.tot || '')) return;
        var sl = v.van + '|' + v.tot;
        if (gezien[sl]) return;
        gezien[sl] = true;
        nieuw.push({ van: v.van, tot: v.tot });
      });
      i.voorkomens = nieuw;
      s.items[i.id] = i;
    });
  }

  function laadVenster(van, tot) {
    var sl = van + '|' + tot;
    s.bezig[sl] = true;
    return haalJson(API + '/api/items?van=' + van + '&tot=' + tot).then(function (j) {
      zetItems(j && j.items);
      s.vensters.push({ van: van, tot: tot });
      delete s.bezig[sl];
    }, function (e) { delete s.bezig[sl]; throw e; });
  }
  function gedekt(van, tot) { return s.vensters.some(function (v) { return v.van <= van && v.tot >= tot; }); }

  function periode() {
    if (s.weergave === 'week') return { soort: 'week', start: weekStart(s.gekozen), eind: weekEind(s.gekozen) };
    return { soort: 'maand', start: maandStart(s.gekozen), eind: maandEind(s.gekozen) };
  }

  function zorg() {
    if (!s.klaar) return;
    var p = periode();
    if (gedekt(p.start, p.eind)) return;
    var van = maandStart(p.start);
    var tot = maandEind(p.eind);
    if (s.bezig[van + '|' + tot]) return;
    s.vensterFout = false;
    laadVenster(van, tot).then(teken, function () { s.vensterFout = true; teken(); });
    teken();
  }

  function start() {
    var van = plus(vandaag, -7);
    if (maandStart(vandaag) < van) van = maandStart(vandaag);
    var tot = plus(vandaag, 60);
    teken();
    Promise.all([haalJson(API + '/api/rubrieken'), laadVenster(van, tot)]).then(function (r) {
      s.rubrieken = (Array.isArray(r[0]) ? r[0] : []).filter(function (x) { return x && typeof x.id === 'string'; });
      s.klaar = true;
      s.scrollNaar = vandaag;
      teken();
      zorg();
    }, function () { s.fout = true; teken(); });
  }

  function rubriekInfo(id) { for (var i = 0; i < s.rubrieken.length; i++) if (s.rubrieken[i].id === id) return s.rubrieken[i]; return null; }
  function rubriekNaam(id) { var r = rubriekInfo(id); return r ? schoon(r.naam) : id; }
  function kort(id) { return KORT[id] || rubriekNaam(id); }
  function kleur(id) { var r = rubriekInfo(id); return r && /^#[0-9a-fA-F]{3,8}$/.test(r.kleur || '') ? r.kleur : '#800000'; }
  function rubriekVolgorde(id) { for (var i = 0; i < s.rubrieken.length; i++) if (s.rubrieken[i].id === id) return i; return 99; }

  /** Alles wat in de periode p begint, per dag, zonder filter. */
  function verzamelPerDag(p) {
    var perDag = {};
    Object.keys(s.items).forEach(function (id) {
      var item = s.items[id];
      item.voorkomens.forEach(function (vk) {
        if (vk.van >= p.start && vk.van <= p.eind) (perDag[vk.van] = perDag[vk.van] || []).push({ item: item, vk: vk });
        else if (vk.van < p.start && vk.tot >= p.start) (perDag[p.start] = perDag[p.start] || []).push({ item: item, vk: vk, loopt: true });
      });
    });
    Object.keys(perDag).forEach(function (d) { perDag[d].sort(vergelijk); });
    return perDag;
  }
  function vergelijk(a, b) {
    var ta = a.item.tijd || ''; var tb = b.item.tijd || '';
    if (ta !== tb) return ta < tb ? -1 : 1;
    return String(a.item.titel).localeCompare(String(b.item.titel), 'nl');
  }

  /* ---------- opbouw van het scherm ---------- */

  function kn(klas, tekst, props, kids) {
    var p = { type: 'button', klas: 'kal-b ' + klas };
    if (tekst != null) p.tekst = tekst;
    for (var k in props) if (Object.prototype.hasOwnProperty.call(props, k)) p[k] = props[k];
    return h('button', p, kids);
  }

  function schakelaar() {
    function stuk(w, tekst) {
      return kn('kal-schakel-knop', tekst, {
        'aria-pressed': s.weergave === w ? 'true' : 'false',
        onclick: function () { s.weergave = w; s.open = null; teken(); zorg(); },
      });
    }
    return h('div', { klas: 'kal-schakel', role: 'group', 'aria-label': 'Weergave' }, [stuk('maand', 'Maand'), stuk('week', 'Week')]);
  }

  function titelTekst(p) {
    if (p.soort === 'maand') { var x = lees(p.start); return MAANDEN[x.m - 1] + ' ' + x.j; }
    var a = lees(p.start); var b = lees(p.eind);
    if (a.j !== b.j) return dagMaand(p.start, true) + ' tot ' + dagMaand(p.eind, true);
    if (a.m !== b.m) return dagMaand(p.start) + ' tot ' + dagMaand(p.eind);
    return a.d + ' tot ' + b.d + ' ' + MAANDEN[b.m - 1];
  }

  function navigatie(p) {
    var eenheid = p.soort === 'maand' ? 'maand' : 'week';
    return h('div', { klas: 'kal-nav' }, [
      kn('kal-pijl', '‹', { 'aria-label': 'Vorige ' + eenheid, onclick: function () { verschuif(-1); } }),
      h('h2', { klas: 'kal-titel', 'aria-live': 'polite', tekst: titelTekst(p) }),
      kn('kal-vandaag', 'Vandaag', { onclick: function () { s.scrollNaar = vandaag; kies(vandaag); } }),
      kn('kal-pijl', '›', { 'aria-label': 'Volgende ' + eenheid, onclick: function () { verschuif(1); } }),
    ]);
  }

  function verschuif(n) {
    var p = periode();
    var nieuw = p.soort === 'maand' ? verschuifMaand(p.start, n) : plus(p.start, 7 * n);
    kies(nieuw);
  }
  function kies(iso) { s.gekozen = iso; s.open = null; teken(); zorg(); }

  function toetsDag(ev, iso) {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); kies(iso); return; }
    var stap = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[ev.key];
    if (!stap) return;
    ev.preventDefault();
    kies(plus(iso, stap));
  }

  function filterRij(perDag) {
    var heeft = rubriekenMetItems(perDag);
    var ids = s.rubrieken.map(function (r) { return r.id; });
    if (s.rubriek && ids.indexOf(s.rubriek) < 0) ids.push(s.rubriek);
    function chip(id, tekst) {
      var actief = id === '' ? !s.rubriek : s.rubriek === id;
      var leeg = id !== '' && !heeft[id] && !actief;
      var props = { 'aria-pressed': actief ? 'true' : 'false' };
      if (leeg) { props['aria-disabled'] = 'true'; props.title = 'Geen items in deze periode'; }
      else props.onclick = function () { s.rubriek = id; s.open = null; teken(); };
      return kn('kal-chip' + (leeg ? ' kal-chip-leeg' : ''), tekst, props);
    }
    return h('div', { klas: 'kal-chips', role: 'group', 'aria-label': 'Rubriek' },
      [chip('', 'Alles')].concat(ids.map(function (id) { return chip(id, kort(id)); })));
  }

  function puntjeVoor(e) {
    var p = h('span', { klas: 'kal-punt', 'aria-hidden': 'true' });
    p.style.setProperty('--kal-punt', kleur(e.item.rubriek));
    return p;
  }

  /** Minikaart van een item binnen een dagcel van het rooster (>700px). */
  function itemMini(e) {
    var sleutel = e.item.id + '|' + e.vk.van;
    return h('button', {
      type: 'button', klas: 'kal-mini' + (s.open === sleutel ? ' kal-mini-open' : ''),
      'aria-pressed': s.open === sleutel ? 'true' : 'false',
      onclick: function (ev) { ev.stopPropagation(); s.open = s.open === sleutel ? null : sleutel; teken(); },
    }, [puntjeVoor(e), h('span', { klas: 'kal-mini-titel', tekst: schoon(e.item.titel) })]);
  }

  function dagCel(dag, entries, isWeek) {
    var iso = dag.datum;
    var gekozen = iso === s.gekozen;
    var x = lees(iso);
    var getoond = entries.slice(0, isWeek ? MAX_IN_CEL_WEEK : MAX_IN_CEL_MAAND);
    var meer = entries.length - getoond.length;
    var kop = h('span', { klas: 'kal-celkop' }, [
      isWeek ? h('span', { klas: 'kal-celdagnaam', tekst: DAG_KORT[(new Date(Date.UTC(x.j, x.m - 1, x.d)).getUTCDay() + 6) % 7] }) : null,
      h('span', { klas: 'kal-celnr', tekst: String(x.d) }),
    ]);
    var inhoud = h('span', { klas: 'kal-celitems' }, getoond.map(itemMini).concat(meer > 0 ? [h('span', { klas: 'kal-meer', tekst: '+' + meer + ' meer' })] : []));
    return h('div', {
      klas: 'kal-cel' + (dag.inMaand ? '' : ' kal-buiten') + (iso === vandaag ? ' kal-nu' : '') + (gekozen ? ' kal-gekozen' : ''),
      role: 'button', 'aria-pressed': gekozen ? 'true' : 'false', 'aria-label': dagLabel(iso),
      tabindex: gekozen ? '0' : '-1',
      onclick: function () { kies(iso); },
      onkeydown: function (ev) { toetsDag(ev, iso); },
    }, [kop, inhoud]);
  }

  function rooster(p, perDag) {
    var dagen = p.soort === 'maand' ? maandDagen(s.gekozen) : weekDagen(s.gekozen);
    var koppen = DAG_KORT.map(function (d) { return h('div', { klas: 'kal-dagkop', 'aria-hidden': 'true', tekst: d }); });
    var cellen = dagen.map(function (dag) { return dagCel(dag, filterPerRubriek(perDag[dag.datum] || [], s.rubriek), p.soort === 'week'); });
    return h('div', { klas: 'kal-rooster' + (p.soort === 'week' ? ' kal-rooster-week' : ''), role: 'group', 'aria-label': titelTekst(p) }, koppen.concat(cellen));
  }

  function metaRegel(e) {
    var delen = [rubriekNaam(e.item.rubriek)];
    if (e.item.tijd) delen.push(e.item.tijd);
    if (!isHeelFrankrijk(e.item.gebied)) delen.push(gebiedTekst(e.item.gebied));
    return delen.join(' · ');
  }

  function detailPaneel() {
    if (!s.open) return null;
    var gevonden = null;
    Object.keys(s.items).forEach(function (id) {
      s.items[id].voorkomens.forEach(function (vk) {
        if (id + '|' + vk.van === s.open) gevonden = { item: s.items[id], vk: vk };
      });
    });
    if (!gevonden) return null;
    var item = gevonden.item;
    var delen = [
      h('div', { klas: 'kal-detail-kop' }, [
        h('h3', { klas: 'kal-detail-titel', tekst: schoon(item.titel) }),
        kn('kal-detail-sluit', '✕ Sluiten', { 'aria-label': 'Detail sluiten', onclick: function () { s.open = null; teken(); } }),
      ]),
      h('p', { klas: 'kal-detail-meta', tekst: metaRegel(gevonden) }),
    ];
    var tekst = schoon(item.tekst_u || item.tekst || '');
    if (tekst) delen.push(h('p', { klas: 'kal-detail-tekst', tekst: tekst }));
    var bron = item.bron || {};
    var bronUrl = veiligeUrl(bron.url);
    if (bron.gecontroleerd && /^\d{4}-\d{2}-\d{2}$/.test(bron.gecontroleerd)) {
      var regel = [h('span', { tekst: 'Gecontroleerd op ' + datumNl(bron.gecontroleerd) })];
      if (bronUrl) { regel.push(' · '); regel.push(externeLink(bronUrl, 'Bekijk de bron ↗', 'kal-link')); }
      delen.push(h('p', { klas: 'kal-detail-bron' }, regel));
    } else if (bronUrl) {
      delen.push(h('p', { klas: 'kal-detail-bron' }, [externeLink(bronUrl, 'Bekijk de bron ↗', 'kal-link')]));
    }
    var link = veiligeUrl(item.link);
    if (link) delen.push(h('p', {}, [externeLink(link, 'Lees meer op ' + hostVan(link) + ' ↗', 'kal-actie')]));
    return h('div', { klas: 'kal-detail', role: 'region', 'aria-label': 'Detail' }, delen);
  }

  function itemRij(e) {
    var sleutel = e.item.id + '|' + e.vk.van;
    return kn('kal-rij', null, {
      'aria-pressed': s.open === sleutel ? 'true' : 'false',
      onclick: function () { s.open = s.open === sleutel ? null : sleutel; teken(); },
    }, [puntjeVoor(e), h('span', { klas: 'kal-rijtekst' }, [
      h('span', { klas: 'kal-rijtitel', tekst: schoon(e.item.titel) }),
      h('span', { klas: 'kal-rijmeta', tekst: metaRegel(e) }),
    ])]);
  }

  /** De volledige lijst van de gekozen dag, los van de (ingekorte) dagcel. Alleen zichtbaar bij het rooster (>700px): daaronder doet de terugval dit al. */
  function daglijst(perDag) {
    var lijst = filterPerRubriek(perDag[s.gekozen] || [], s.rubriek);
    var gebied = h('div', { klas: 'kal-daglijst' });
    gebied.appendChild(h('h3', { klas: 'kal-dagtitel', tekst: dagLabel(s.gekozen) }));
    if (!lijst.length) gebied.appendChild(h('p', { klas: 'kal-leeg', tekst: s.rubriek ? 'Niets in ' + rubriekNaam(s.rubriek).toLowerCase() + ' op deze dag.' : 'Niets op deze dag.' }));
    else lijst.forEach(function (e) { gebied.appendChild(itemRij(e)); });
    return gebied;
  }

  /** Lijst per dag (telefoon): bij een maand alle dagen met items, bij een week de dagen van de week. Een geopend item toont zijn details direct eronder. */
  function lijstTerugval(p, perDag) {
    var dagen = p.soort === 'maand'
      ? dagenMetItems(maandDagen(s.gekozen).filter(function (d) { return d.inMaand; }).map(function (d) { return d.datum; }), perDag, s.rubriek, filterPerRubriek)
      : weekDagen(s.gekozen).map(function (d) { return d.datum; });
    var gebied = h('div', { klas: 'kal-lijst' });
    var getoond = 0;
    dagen.forEach(function (d) {
      var lijst = filterPerRubriek(perDag[d] || [], s.rubriek);
      if (!lijst.length) return;
      getoond += lijst.length;
      var kop = h('h3', { klas: 'kal-dagtitel', tekst: dagLabel(d), 'data-dag': d });
      if (d === vandaag) kop.className += ' kal-dagtitel-nu';
      gebied.appendChild(kop);
      lijst.forEach(function (e) {
        gebied.appendChild(itemRij(e));
        if (s.open === e.item.id + '|' + e.vk.van) {
          var det = detailPaneel();
          if (det) { det.className += ' kal-detail-inline'; gebied.appendChild(det); }
        }
      });
    });
    if (!getoond) gebied.appendChild(h('p', { klas: 'kal-leeg', tekst: s.rubriek ? 'Niets in ' + rubriekNaam(s.rubriek).toLowerCase() + (p.soort === 'maand' ? ' in deze maand.' : ' op deze dagen.') : (p.soort === 'maand' ? 'Niets in deze maand.' : 'Niets op deze dagen.') }));
    return gebied;
  }

  function melding(tekst) {
    return h('div', { klas: 'kal-melding', role: 'alert' }, [
      h('p', { tekst: tekst }),
      kn('kal-opnieuw', 'Opnieuw proberen', { onclick: function () { if (s.klaar) { s.vensterFout = false; zorg(); } else start(); } }),
    ]);
  }

  function agendaRegel() {
    var regels = [h('li', {}, [externeLink(API + '/ical/alles.ics', 'Hele kalender', 'kal-link')])];
    s.rubrieken.forEach(function (r) {
      regels.push(h('li', {}, [externeLink(API + '/ical/' + encodeURIComponent(r.id) + '.ics', schoon(r.naam), 'kal-link')]));
    });
    return h('div', { klas: 'kal-abo' }, [
      h('p', { klas: 'kal-abo-kop', tekst: 'Zet een rubriek in je eigen agenda' }),
      h('ul', { klas: 'kal-abo-lijst' }, regels),
    ]);
  }

  var root = document.getElementById('kalender');

  function teken() {
    var delen = [];
    if (s.fout && !s.klaar) {
      delen.push(melding('De kalender is nu niet bereikbaar.'));
    } else {
      var p = periode();
      var perDag = verzamelPerDag(p);
      delen.push(schakelaar());
      if (s.klaar) delen.push(filterRij(perDag));
      delen.push(navigatie(p));
      if (s.vensterFout) delen.push(melding('De kalender is nu niet bereikbaar.'));
      else if (!gedekt(p.start, p.eind)) delen.push(h('p', { klas: 'kal-laden', role: 'status', tekst: 'De kalender wordt opgehaald...' }));
      else {
        delen.push(rooster(p, perDag));
        delen.push(daglijst(perDag));
        var detail = detailPaneel();
        if (detail) { detail.className += ' kal-detail-bureau'; delen.push(detail); }
        delen.push(lijstTerugval(p, perDag));
      }
      if (s.klaar) delen.push(agendaRegel());
    }
    var frag = document.createDocumentFragment();
    delen.forEach(function (d) { if (d) frag.appendChild(d); });
    root.textContent = '';
    root.appendChild(frag);
    scrollNaarDag();
    stuurHoogte();
  }

  /** Telefoon: zet de gevraagde dag (of de eerstvolgende dag met items) bovenaan in de eigen pagina. Alleen scroll binnen dit document, nooit de bovenliggende pagina. */
  function scrollNaarDag() {
    if (!s.scrollNaar || !s.klaar) return;
    var wens = s.scrollNaar;
    s.scrollNaar = null;
    if (!window.matchMedia || !window.matchMedia('(max-width: 700px)').matches) return;
    var koppen = root.querySelectorAll('.kal-lijst [data-dag]');
    var doel = null;
    for (var i = 0; i < koppen.length; i++) {
      if (koppen[i].getAttribute('data-dag') >= wens) { doel = koppen[i]; break; }
    }
    if (!doel) return;
    try { window.scrollTo(0, Math.max(0, doel.getBoundingClientRect().top + window.pageYOffset - 4)); } catch (e) { /* geen scroll is geen ramp */ }
  }

  /* ---------- hoogte naar de bovenliggende pagina ---------- */

  var laatsteHoogte = 0;
  function stuurHoogte() {
    var hoogte = Math.ceil(document.body.getBoundingClientRect().height);
    if (hoogte === laatsteHoogte) return;
    laatsteHoogte = hoogte;
    try { window.parent.postMessage({ type: 'kalender-hoogte', hoogte: hoogte }, '*'); } catch (e) { /* werkt ook zonder */ }
  }
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(stuurHoogte).observe(document.body);
  } else {
    window.addEventListener('resize', stuurHoogte);
  }

  start();
})();
