/*
 * Kalender Frankrijk, blok voor Infofrankrijk (WordPress) en voor de voorbeeldpagina op Vercel.
 * Zelfstandig: geen afhankelijkheden, geen opslag in de browser. Leest de openbare API van
 * Kalender Frankrijk (CORS open, geen sleutel). Alle tekst uit de API gaat via textContent
 * (DOM-API), nooit als HTML ingevoegd.
 *
 * Gebruik: <div class="kfr" data-kfr data-weergave="maand" data-rubriek="" data-api="https://kalender-frankrijk.vercel.app">
 */
(function () {
  'use strict';

  var STANDAARD_API = 'https://kalender-frankrijk.vercel.app';
  var FORUM_URL = 'https://www.nederlanders.fr/profiles/blog/new';
  var TIMEOUT_MS = 8000;
  var MAX_STIPPEN = 3;

  var DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
  var DAG_KORT = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO'];
  var MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  var KORT = {
    fiscaal: 'Fiscaal', uitkeringen: 'Uitkeringen', feestdagen: 'Feestdagen', school: 'School', wonen: 'Wonen',
    buiten: 'Buiten', zorg: 'Zorg', stemmen: 'Stemmen', genieten: 'Genieten', verenigingen: 'Verenigingen'
  };
  var DOELGROEP = {
    iedereen: 'Voor iedereen', particulier: 'Particulier', ondernemer: 'Ondernemer', gepensioneerde: 'Gepensioneerde',
    'pas-verhuisd': 'Pas verhuisd', gezin: 'Gezin met kinderen', huiseigenaar: 'Huiseigenaar', huurder: 'Huurder',
    automobilist: 'Automobilist', kustbewoner: 'Kustbewoner'
  };
  var teller = 0;

  /* ---------- datums (alles als tekst JJJJ-MM-DD, gerekend in UTC zodat zomertijd niets verstoort) ---------- */

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function maakIso(j, m, d) { return j + '-' + pad(m) + '-' + pad(d); }
  function lees(iso) { return { j: +iso.slice(0, 4), m: +iso.slice(5, 7), d: +iso.slice(8, 10) }; }
  function utc(iso) { var x = lees(iso); return Date.UTC(x.j, x.m - 1, x.d); }
  function plus(iso, n) {
    var t = new Date(utc(iso) + n * 86400000);
    return maakIso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }
  function weekdag(iso) { return (new Date(utc(iso)).getUTCDay() + 6) % 7; }
  function weekStart(iso) { return plus(iso, -weekdag(iso)); }
  function maandEind(iso) { var x = lees(iso); return maakIso(x.j, x.m, new Date(Date.UTC(x.j, x.m, 0)).getUTCDate()); }
  function maandStart(iso) { return iso.slice(0, 8) + '01'; }
  function verschuifMaand(iso, n) {
    var x = lees(iso); var t = new Date(Date.UTC(x.j, x.m - 1 + n, 1));
    return maakIso(t.getUTCFullYear(), t.getUTCMonth() + 1, 1);
  }
  function vandaagParijs() {
    try {
      var t = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    } catch (e) { /* terugval hieronder */ }
    var n = new Date();
    return maakIso(n.getFullYear(), n.getMonth() + 1, n.getDate());
  }
  function dagMaand(iso, metJaar) { var x = lees(iso); return x.d + ' ' + MAANDEN[x.m - 1] + (metJaar ? ' ' + x.j : ''); }
  function dagNaam(iso) { return DAGEN[weekdag(iso)]; }
  function dagLabel(iso, metJaar) { return dagNaam(iso) + ' ' + dagMaand(iso, metJaar); }
  function datumNl(iso) { var x = lees(iso); return pad(x.d) + '-' + pad(x.m) + '-' + x.j; }

  /* ---------- tekst ---------- */

  var LANG_STREEPJE = '[' + String.fromCharCode(8211, 8212) + ']';
  var STREEP_OMRINGD = new RegExp('\\s+' + LANG_STREEPJE + '\\s+', 'g');
  var STREEP_LOS = new RegExp(LANG_STREEPJE, 'g');

  /** Een lang streepje met spaties eromheen wordt een komma, een los streepje een koppelteken. */
  function schoon(t) {
    return String(t == null ? '' : t).replace(STREEP_OMRINGD, ', ').replace(STREEP_LOS, '-');
  }
  function veiligeUrl(u) { return typeof u === 'string' && /^https:\/\/[^\s]+$/i.test(u) ? u : null; }
  function hostVan(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
  function tijdTekst(t) {
    if (!t) return '';
    var m = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(String(t));
    if (!m) return schoon(t);
    return m[1] === m[2] ? m[1] : m[1] + ' tot ' + m[2];
  }
  function gebiedTekst(g) {
    var t = Array.isArray(g) ? g.join(', ') : g;
    return schoon(t || 'heel Frankrijk');
  }
  function isHeelFrankrijk(g) { return gebiedTekst(g).toLowerCase() === 'heel frankrijk'; }
  function telTekst(n) { return n === 0 ? 'geen items' : n === 1 ? '1 item' : n + ' items'; }

  /* ---------- DOM-hulp: alleen createElement en textContent ---------- */

  function h(tag, p, kids) {
    var e = document.createElement(tag);
    var k;
    for (k in p) {
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

  /* ---------- de kalender ---------- */

  function Kalender(root) {
    var nr = ++teller;
    var api = (root.getAttribute('data-api') || STANDAARD_API).replace(/\/+$/, '');
    if (!veiligeUrl(api)) api = STANDAARD_API;
    var vandaag = vandaagParijs();
    var weergave = root.getAttribute('data-weergave') === 'week' ? 'week' : 'maand';
    var rubriekStart = String(root.getAttribute('data-rubriek') || '').toLowerCase().replace(/[^a-z0-9-]/g, '');

    var s = {
      weergave: weergave,
      gekozen: vandaag,
      rubriek: rubriekStart,
      looptOpen: false,
      aboOpen: false,
      open: null,
      rubrieken: [],
      items: {},
      vensters: [],
      bezig: {},
      klaar: false,
      fout: false
    };

    /* --- gegevens --- */

    function zetItems(lijst) {
      (lijst || []).forEach(function (i) {
        if (!i || typeof i.id !== 'string' || typeof i.titel !== 'string') return;
        if (!Array.isArray(i.toon_in) || i.toon_in.indexOf('pagina') < 0) return;
        if (i.status && i.status !== 'vastgesteld') return;
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
      return haalJson(api + '/api/items?van=' + van + '&tot=' + tot).then(function (j) {
        zetItems(j && j.items);
        s.vensters.push({ van: van, tot: tot });
        delete s.bezig[sl];
      }, function (e) { delete s.bezig[sl]; throw e; });
    }

    function gedekt(van, tot) {
      return s.vensters.some(function (v) { return v.van <= van && v.tot >= tot; });
    }

    /** Haalt een venster van hele maanden op als de getoonde periode er nog niet in zit. */
    function zorg() {
      if (!s.klaar) return;
      var p = periode();
      if (gedekt(p.start, p.eind)) return;
      var van = maandStart(p.start);
      var tot = maandEind(p.eind);
      if (s.bezig[van + '|' + tot] || s.fout) return;
      s.fout = false;
      s.vensterFout = false;
      laadVenster(van, tot).then(function () { teken(); }, function () { s.vensterFout = true; teken(); });
      teken();
    }

    function start() {
      s.klaar = false;
      s.fout = false;
      s.vensterFout = false;
      var van = plus(vandaag, -7);
      if (maandStart(vandaag) < van) van = maandStart(vandaag);
      var tot = plus(vandaag, 120);
      teken();
      Promise.all([haalJson(api + '/api/rubrieken'), laadVenster(van, tot)]).then(function (r) {
        s.rubrieken = (Array.isArray(r[0]) ? r[0] : []).filter(function (x) { return x && typeof x.id === 'string'; });
        if (s.rubriek && !rubriekInfo(s.rubriek)) s.rubriek = '';
        s.klaar = true;
        teken();
        zorg();
      }, function () { s.fout = true; teken(); });
    }

    function rubriekInfo(id) {
      for (var i = 0; i < s.rubrieken.length; i++) if (s.rubrieken[i].id === id) return s.rubrieken[i];
      return null;
    }
    function rubriekNaam(id) { var r = rubriekInfo(id); return r ? schoon(r.naam) : id; }
    function kort(id) { return KORT[id] || rubriekNaam(id); }
    function kleur(id) {
      var r = rubriekInfo(id);
      return r && /^#[0-9a-fA-F]{3,8}$/.test(r.kleur || '') ? r.kleur : '#800000';
    }
    function rubriekVolgorde(id) {
      for (var i = 0; i < s.rubrieken.length; i++) if (s.rubrieken[i].id === id) return i;
      return 99;
    }

    /* --- periode en indeling --- */

    function periode() {
      if (s.weergave === 'week') {
        var st = weekStart(s.gekozen);
        return { soort: 'week', start: st, eind: plus(st, 6) };
      }
      return { soort: 'maand', start: maandStart(s.gekozen), eind: maandEind(s.gekozen) };
    }

    /** Alles wat in de periode begint (per begindag) en wat eerder begon en nog loopt, zonder filter. */
    function verzamel(p) {
      var perDag = {};
      var loopt = [];
      Object.keys(s.items).forEach(function (id) {
        var item = s.items[id];
        var looptAl = false;
        item.voorkomens.forEach(function (vk) {
          if (vk.van >= p.start && vk.van <= p.eind) {
            (perDag[vk.van] = perDag[vk.van] || []).push({ item: item, vk: vk });
          } else if (vk.van < p.start && vk.tot >= p.start && !looptAl) {
            looptAl = true;
            loopt.push({ item: item, vk: vk });
          }
        });
      });
      Object.keys(perDag).forEach(function (d) { perDag[d].sort(vergelijk); });
      loopt.sort(function (a, b) { return a.vk.tot < b.vk.tot ? -1 : a.vk.tot > b.vk.tot ? 1 : vergelijk(a, b); });
      return { perDag: perDag, loopt: loopt };
    }
    function vergelijk(a, b) {
      var ta = a.item.tijd || '';
      var tb = b.item.tijd || '';
      if (ta !== tb) return ta < tb ? -1 : 1;
      return String(a.item.titel).localeCompare(String(b.item.titel), 'nl');
    }
    function filtering(lijst) {
      return s.rubriek ? lijst.filter(function (e) { return e.item.rubriek === s.rubriek; }) : lijst;
    }

    /* --- opbouw van het scherm --- */

    var fokus = null;
    var scrollNaar = null;

    function kn(klas, tekst, props, kids) {
      var p = { type: 'button', klas: 'kfr-b ' + klas };
      if (tekst != null) p.tekst = tekst;
      for (var k in props) if (Object.prototype.hasOwnProperty.call(props, k)) p[k] = props[k];
      return h('button', p, kids);
    }

    function schakelaar() {
      function stuk(w, tekst) {
        return kn('kfr-schakel-knop', tekst, {
          'aria-pressed': s.weergave === w ? 'true' : 'false',
          'data-kf': 'schakel:' + w,
          onclick: function () { s.weergave = w; s.open = null; teken('schakel:' + w); zorg(); }
        });
      }
      return h('div', { klas: 'kfr-schakel', role: 'group', 'aria-label': 'Weergave' }, [stuk('week', 'Week'), stuk('maand', 'Maand')]);
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
      return h('div', { klas: 'kfr-nav' }, [
        kn('kfr-pijl', '‹', { 'aria-label': 'Vorige ' + eenheid, 'data-kf': 'nav:vorige', onclick: function () { verschuif(-1); } }),
        h('h2', { klas: 'kfr-titel', 'aria-live': 'polite', tekst: titelTekst(p) }),
        kn('kfr-vandaag', 'Vandaag', { 'data-kf': 'nav:vandaag', onclick: function () { kies(vandaag, 'nav:vandaag'); } }),
        kn('kfr-pijl', '›', { 'aria-label': 'Volgende ' + eenheid, 'data-kf': 'nav:volgende', onclick: function () { verschuif(1); } })
      ]);
    }

    function verschuif(n) {
      var p = periode();
      var nieuw;
      if (p.soort === 'maand') {
        nieuw = verschuifMaand(p.start, n);
        if (maandStart(vandaag) === nieuw) nieuw = vandaag;
      } else {
        nieuw = plus(p.start, 7 * n);
        if (weekStart(vandaag) === nieuw) nieuw = vandaag;
      }
      kies(nieuw, n < 0 ? 'nav:vorige' : 'nav:volgende');
    }

    function kies(iso, fokusSleutel, scrol) {
      s.gekozen = iso;
      s.open = null;
      scrollNaar = scrol || null;
      teken(fokusSleutel);
      zorg();
    }

    function stippenVoor(entries) {
      var ids = [];
      entries.forEach(function (e) { if (ids.indexOf(e.item.rubriek) < 0) ids.push(e.item.rubriek); });
      ids.sort(function (a, b) { return rubriekVolgorde(a) - rubriekVolgorde(b); });
      return h('span', { klas: 'kfr-stippen', 'aria-hidden': 'true' }, ids.slice(0, MAX_STIPPEN).map(function (id) {
        var st = h('span', { klas: 'kfr-stip' });
        st.style.setProperty('--kfr-stip', kleur(id));
        return st;
      }));
    }

    function toetsDag(ev, iso) {
      var stap = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[ev.key];
      if (!stap) return;
      ev.preventDefault();
      var nieuw = plus(iso, stap);
      kies(nieuw, 'dag:' + nieuw);
    }

    function dagKnop(iso, entries, buiten, metNaam) {
      var gekozen = iso === s.gekozen;
      var x = lees(iso);
      var kids = [];
      if (metNaam) kids.push(h('span', { klas: 'kfr-dagnaam', 'aria-hidden': 'true', tekst: DAG_KORT[weekdag(iso)] }));
      kids.push(h('span', { klas: 'kfr-dagnr', tekst: String(x.d) }));
      kids.push(buiten ? h('span', { klas: 'kfr-stippen', 'aria-hidden': 'true' }) : stippenVoor(entries));
      return kn('kfr-dag' + (buiten ? ' kfr-buiten' : '') + (iso === vandaag ? ' kfr-nu' : ''), null, {
        'aria-label': dagLabel(iso, true) + (buiten ? '' : ', ' + telTekst(entries.length)),
        'aria-pressed': gekozen ? 'true' : 'false',
        'aria-current': iso === vandaag ? 'date' : null,
        tabindex: gekozen ? '0' : '-1',
        'data-kf': 'dag:' + iso,
        onclick: function () { kies(iso, 'dag:' + iso, s.weergave === 'week' ? iso : null); },
        onkeydown: function (ev) { toetsDag(ev, iso); }
      }, kids);
    }

    function maandRaster(p, data) {
      var cellen = DAG_KORT.map(function (d) { return h('div', { klas: 'kfr-dagkop', 'aria-hidden': 'true', tekst: d }); });
      var van = weekStart(p.start);
      var tot = plus(weekStart(p.eind), 6);
      for (var d = van; d <= tot; d = plus(d, 1)) {
        var binnen = d >= p.start && d <= p.eind;
        cellen.push(dagKnop(d, binnen ? filtering(data.perDag[d] || []) : [], !binnen, false));
      }
      return h('div', { klas: 'kfr-kaart kfr-raster-kaart' }, [
        h('div', { klas: 'kfr-raster', role: 'group', 'aria-label': titelTekst(p) }, cellen)
      ]);
    }

    function weekRaster(p, data) {
      var cellen = [];
      for (var i = 0; i < 7; i++) {
        var d = plus(p.start, i);
        cellen.push(dagKnop(d, filtering(data.perDag[d] || []), false, true));
      }
      return h('div', { klas: 'kfr-kaart kfr-raster-kaart' }, [
        h('div', { klas: 'kfr-raster kfr-raster-week', role: 'group', 'aria-label': titelTekst(p) }, cellen)
      ]);
    }

    function legenda(p, data) {
      var ids = [];
      Object.keys(data.perDag).forEach(function (d) {
        filtering(data.perDag[d]).forEach(function (e) { if (ids.indexOf(e.item.rubriek) < 0) ids.push(e.item.rubriek); });
      });
      if (!ids.length) return null;
      ids.sort(function (a, b) { return rubriekVolgorde(a) - rubriekVolgorde(b); });
      return h('ul', { klas: 'kfr-legenda', 'aria-label': 'Legenda' }, ids.map(function (id) {
        var st = h('span', { klas: 'kfr-stip', 'aria-hidden': 'true' });
        st.style.setProperty('--kfr-stip', kleur(id));
        return h('li', {}, [st, ' ' + kort(id)]);
      }));
    }

    function looptRij(p, data) {
      var lijst = filtering(data.loopt);
      if (!lijst.length) return null;
      var eenheid = p.soort === 'maand' ? 'deze maand' : 'deze week';
      var pid = 'kfr' + nr + '-loopt';
      var kop = kn('kfr-loopt-knop', null, {
        'aria-expanded': s.looptOpen ? 'true' : 'false',
        'aria-controls': pid,
        'data-kf': 'loopt',
        onclick: function () { s.looptOpen = !s.looptOpen; teken('loopt'); }
      }, [
        h('span', { tekst: 'Loopt ' + eenheid + ' · ' + lijst.length }),
        h('span', { klas: 'kfr-draai', 'aria-hidden': 'true', tekst: s.looptOpen ? '▴' : '▾' })
      ]);
      var paneel = h('div', { klas: 'kfr-loopt-paneel', id: pid }, s.looptOpen ? lijst.map(function (e) { return itemKaart(e, 'l'); }) : []);
      if (!s.looptOpen) paneel.hidden = true;
      return h('div', { klas: 'kfr-loopt' }, [kop, paneel]);
    }

    function filterRij() {
      var voorkomend = {};
      Object.keys(s.items).forEach(function (id) { voorkomend[s.items[id].rubriek] = true; });
      if (s.rubriek) voorkomend[s.rubriek] = true;
      var ids = Object.keys(voorkomend).sort(function (a, b) { return rubriekVolgorde(a) - rubriekVolgorde(b); });
      function chip(id, tekst) {
        return kn('kfr-chip', tekst, {
          'aria-pressed': (id === '' ? !s.rubriek : s.rubriek === id) ? 'true' : 'false',
          'data-kf': 'chip:' + id,
          onclick: function () { s.rubriek = id; s.open = null; teken('chip:' + id); }
        });
      }
      return h('div', { klas: 'kfr-chips', role: 'group', 'aria-label': 'Rubriek' },
        [chip('', 'Alles')].concat(ids.map(function (id) { return chip(id, kort(id)); })));
    }

    function metaRegel(e, metTot) {
      var delen = [rubriekNaam(e.item.rubriek)];
      var t = tijdTekst(e.item.tijd);
      if (t) delen.push(t);
      if (!isHeelFrankrijk(e.item.gebied)) delen.push(gebiedTekst(e.item.gebied));
      if (metTot && e.vk.tot > e.vk.van) delen.push('tot en met ' + dagMaand(e.vk.tot, lees(e.vk.tot).j !== lees(e.vk.van).j));
      return delen.join(' · ');
    }

    function externeLink(url, tekst, klas, kf) {
      return h('a', { klas: klas, href: url, target: '_blank', rel: 'noopener', 'data-kf': kf, tekst: tekst });
    }

    function itemKaart(e, ctx) {
      var item = e.item;
      var sleutel = ctx + '|' + item.id + '|' + e.vk.van;
      var open = s.open === sleutel;
      var did = 'kfr' + nr + '-d-' + ctx + '-' + item.id.replace(/[^a-zA-Z0-9_-]/g, '');
      var beeld = veiligeUrl(item.beeld_url) || (api + '/beeld/' + encodeURIComponent(item.rubriek) + '.png');
      var rij = kn('kfr-rij', null, {
        'aria-expanded': open ? 'true' : 'false',
        'aria-controls': did,
        'data-kf': 'rij:' + sleutel,
        onclick: function () { s.open = open ? null : sleutel; teken('rij:' + sleutel); }
      }, [
        h('img', { klas: 'kfr-beeld', src: beeld, alt: '', width: '44', height: '44', loading: 'lazy' }),
        h('span', { klas: 'kfr-rijtekst' }, [
          h('span', { klas: 'kfr-rijtitel', tekst: schoon(item.titel) }),
          h('span', { klas: 'kfr-meta', tekst: metaRegel(e, true) })
        ]),
        h('span', { klas: 'kfr-draai', 'aria-hidden': 'true', tekst: open ? '▴' : '▾' })
      ]);
      var kaart = h('div', { klas: 'kfr-item' + (open ? ' kfr-item-open' : '') }, [rij]);
      if (open) kaart.appendChild(detail(e, did));
      return kaart;
    }

    function detail(e, did) {
      var item = e.item;
      var delen = [];
      var tekst = schoon(item.tekst_u || item.tekst || '');
      if (tekst) delen.push(h('p', { klas: 'kfr-tekst', tekst: tekst }));
      var chips = (Array.isArray(item.doelgroepen) ? item.doelgroepen : []).map(function (d) {
        return h('li', { klas: 'kfr-label', tekst: DOELGROEP[d] || schoon(d) });
      });
      chips.push(h('li', { klas: 'kfr-label', tekst: 'Gebied: ' + gebiedTekst(item.gebied) }));
      delen.push(h('ul', { klas: 'kfr-labels', 'aria-label': 'Voor wie en waar' }, chips));
      var bron = item.bron || {};
      var bronUrl = veiligeUrl(bron.url);
      if (bron.gecontroleerd && /^\d{4}-\d{2}-\d{2}$/.test(bron.gecontroleerd)) {
        var regel = [h('span', { tekst: 'Gecontroleerd op ' + datumNl(bron.gecontroleerd) })];
        if (bronUrl) { regel.push(' · '); regel.push(externeLink(bronUrl, 'Bekijk de bron ↗', 'kfr-link')); }
        delen.push(h('p', { klas: 'kfr-bron' }, regel));
      } else if (bronUrl) {
        delen.push(h('p', { klas: 'kfr-bron' }, [externeLink(bronUrl, 'Bekijk de bron ↗', 'kfr-link')]));
      }
      var acties = [];
      var link = veiligeUrl(item.link);
      if (link) acties.push(externeLink(link, 'Lees meer op ' + hostVan(link) + ' ↗', 'kfr-actie'));
      if (item.gesprek === true) acties.push(externeLink(FORUM_URL, 'Bespreek op het forum ↗', 'kfr-actie kfr-actie-stil'));
      if (acties.length) delen.push(h('div', { klas: 'kfr-acties' }, acties));
      return h('div', { klas: 'kfr-detail', id: did }, delen);
    }

    function melding(tekst, metLink) {
      return h('div', { klas: 'kfr-melding', role: 'alert' }, [
        h('p', { tekst: tekst }),
        kn('kfr-opnieuw', 'Opnieuw proberen', { 'data-kf': 'opnieuw', onclick: function () { if (s.klaar) { s.vensterFout = false; zorg(); } else start(); } }),
        h('p', { klas: 'kfr-melding-link' }, [externeLink(STANDAARD_API + '/', 'Of open de kalender op kalender-frankrijk.vercel.app ↗', 'kfr-link')])
      ]);
    }

    function lijstGebied(p, data) {
      var gebied = h('div', { klas: 'kfr-lijst', 'aria-live': 'polite' });
      if (s.vensterFout) { gebied.appendChild(melding('De kalender is nu niet bereikbaar.')); return gebied; }
      if (!gedekt(p.start, p.eind)) { gebied.appendChild(h('p', { klas: 'kfr-laden', role: 'status', tekst: 'De kalender wordt opgehaald...' })); return gebied; }

      var dagen = [];
      if (p.soort === 'maand') dagen = [s.gekozen];
      else for (var i = 0; i < 7; i++) dagen.push(plus(p.start, i));

      var getoond = 0;
      dagen.forEach(function (d) {
        var lijst = filtering(data.perDag[d] || []);
        if (!lijst.length) return;
        getoond += lijst.length;
        gebied.appendChild(h('h3', { klas: 'kfr-dagtitel', 'data-kf-dag': d, tabindex: '-1', tekst: dagLabel(d) }));
        lijst.forEach(function (e) { gebied.appendChild(itemKaart(e, 'd')); });
      });
      if (getoond) return gebied;

      var eenheid = p.soort === 'maand' ? 'deze maand' : 'deze week';
      var heeftPeriode = Object.keys(data.perDag).some(function (d) { return filtering(data.perDag[d]).length; }) || filtering(data.loopt).length;
      var tekst;
      if (!s.rubriek) tekst = p.soort === 'maand' ? 'Niets op deze dag.' : 'Niets in deze week.';
      else if (p.soort === 'maand' && heeftPeriode) tekst = 'Niets in ' + rubriekNaam(s.rubriek).toLowerCase() + ' op deze dag.';
      else tekst = 'Niets in ' + rubriekNaam(s.rubriek).toLowerCase() + ' in ' + eenheid + '.';
      var kids = [h('p', { tekst: tekst })];
      if (s.rubriek) kids.push(kn('kfr-opnieuw', 'Toon alles', { 'data-kf': 'toonalles', onclick: function () { s.rubriek = ''; teken('toonalles'); } }));
      gebied.appendChild(h('div', { klas: 'kfr-leeg' }, kids));
      return gebied;
    }

    function agendaKaart() {
      var pid = 'kfr' + nr + '-abo';
      var kaart = h('div', { klas: 'kfr-kaart kfr-abo' }, [
        h('div', { klas: 'kfr-abo-rij' }, [
          h('p', { tekst: 'Ook in uw eigen agenda-app?' }),
          kn('kfr-agenda', 'Zet in uw agenda', { 'aria-expanded': s.aboOpen ? 'true' : 'false', 'aria-controls': pid, 'data-kf': 'abo', onclick: function () { s.aboOpen = !s.aboOpen; teken('abo'); } })
        ])
      ]);
      var paneel = h('div', { klas: 'kfr-abo-paneel', id: pid });
      if (s.aboOpen) {
        paneel.appendChild(h('p', { klas: 'kfr-abo-uitleg', tekst: 'Uw agenda-app haalt de data zelf op en houdt ze bij. Kies de hele kalender of alleen een rubriek.' }));
        var regels = [h('li', {}, [externeLink(api + '/ical/alles.ics', 'Hele kalender', 'kfr-link')])];
        s.rubrieken.forEach(function (r) {
          regels.push(h('li', {}, [externeLink(api + '/ical/' + encodeURIComponent(r.id) + '.ics', schoon(r.naam), 'kfr-link')]));
        });
        paneel.appendChild(h('ul', { klas: 'kfr-abo-lijst' }, regels));
      } else paneel.hidden = true;
      kaart.appendChild(paneel);
      return kaart;
    }

    function teken(fokusSleutel) {
      var actief = document.activeElement;
      var vorige = fokusSleutel || (actief && root.contains(actief) ? actief.getAttribute('data-kf') : null);
      var delen = [];
      if (s.fout && !s.klaar) {
        delen.push(melding('De kalender is nu niet bereikbaar.'));
      } else {
        var p = periode();
        var data = verzamel(p);
        delen.push(schakelaar());
        delen.push(navigatie(p));
        delen.push(p.soort === 'maand' ? maandRaster(p, data) : weekRaster(p, data));
        if (p.soort === 'maand') delen.push(legenda(p, data));
        delen.push(looptRij(p, data));
        if (s.klaar) delen.push(filterRij());
        delen.push(s.klaar ? lijstGebied(p, data) : h('div', { klas: 'kfr-lijst' }, [h('p', { klas: 'kfr-laden', role: 'status', tekst: 'De kalender wordt opgehaald...' })]));
        delen.push(agendaKaart());
      }
      delen.push(h('p', { klas: 'kfr-voet', tekst: 'Kalender Frankrijk is een uitgave van Communities Abroad. Alleen data die tegen de bron zijn gecontroleerd.' }));

      var frag = document.createDocumentFragment();
      delen.forEach(function (d) { if (d) frag.appendChild(d); });
      root.textContent = '';
      root.appendChild(frag);

      if (vorige) {
        var doel = null;
        var kn2 = root.querySelectorAll('[data-kf]');
        for (var i = 0; i < kn2.length; i++) if (kn2[i].getAttribute('data-kf') === vorige) { doel = kn2[i]; break; }
        if (doel) { try { doel.focus({ preventScroll: true }); } catch (e) { doel.focus(); } }
      }
      if (scrollNaar) {
        var koppen = root.querySelectorAll('[data-kf-dag]');
        for (var j = 0; j < koppen.length; j++) {
          if (koppen[j].getAttribute('data-kf-dag') === scrollNaar) {
            var rustig = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            try { koppen[j].scrollIntoView({ block: 'nearest', behavior: rustig ? 'auto' : 'smooth' }); } catch (e2) { koppen[j].scrollIntoView(); }
            break;
          }
        }
        scrollNaar = null;
      }
    }

    root.classList.add('kfr');
    root.setAttribute('data-kfr-klaar', '1');
    start();
  }

  function init() {
    var wortels = document.querySelectorAll('[data-kfr]');
    for (var i = 0; i < wortels.length; i++) {
      if (wortels[i].getAttribute('data-kfr-klaar')) continue;
      Kalender(wortels[i]);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
