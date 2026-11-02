import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
import { pluginZip, leesZip, crc32, MAP, PLUGIN_BESTANDEN, PUBLIEK_BESTANDEN } from '../scripts/bouw-plugin.js';

const lees = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const bron = (b) => lees('wordpress/kalender-frankrijk/' + b);
const php = bron('kalender-frankrijk.php');
const js = bron('kalender-frankrijk.js');
const css = bron('kalender-frankrijk.css');

test('PHP heeft de pluginkop en de shortcode', () => {
  for (const regel of [
    'Plugin Name: Kalender Frankrijk', 'Version: 1.0.0', 'Author: Communities Abroad', 'Author URI: https://www.communitiesabroad.com',
    'Text Domain: kalender-frankrijk', 'Requires at least: 6.0', 'Requires PHP: 7.4', 'Description:',
  ]) assert.ok(php.includes(regel), regel);
  assert.ok(/add_shortcode\(\s*'kalender_frankrijk'/.test(php));
  for (const attr of ['weergave', 'rubriek', 'api']) assert.ok(php.includes(`'${attr}'`), attr);
  assert.ok(php.includes('https://kalender-frankrijk.vercel.app'));
  assert.ok(php.includes('data-kfr'));
});

test('PHP escapet alle attributen en de link', () => {
  for (const attr of ['data-weergave', 'data-rubriek', 'data-api']) {
    assert.ok(new RegExp(`${attr}="' \\. esc_attr\\(`).test(php), `${attr} niet met esc_attr`);
  }
  assert.ok(php.includes('esc_url('));
  assert.ok(php.includes('sanitize_key('));
});

test('PHP laadt JS en CSS alleen in de shortcode, in de footer, en doet geen aanroepen of opslag', () => {
  assert.equal((php.match(/wp_enqueue_script\(/g) || []).length, 1);
  assert.equal((php.match(/wp_enqueue_style\(/g) || []).length, 1);
  const f = php.indexOf('function kfr_shortcode');
  const eind = php.indexOf("add_shortcode( 'kalender_frankrijk'");
  assert.ok(f > 0 && eind > f);
  const binnen = php.slice(f, eind);
  assert.ok(binnen.includes('wp_enqueue_script('), 'wp_enqueue_script buiten de shortcode');
  assert.ok(binnen.includes('wp_enqueue_style('), 'wp_enqueue_style buiten de shortcode');
  assert.ok(/wp_enqueue_script\([^;]*,\s*true\s*\)/.test(binnen), 'in_footer moet true zijn');
  assert.ok(!/wp_enqueue_scripts|wp_head|admin_menu/.test(php), 'geen hooks voor alle pagina\'s of een opties-pagina');
  assert.ok(!/wp_remote_|file_get_contents|curl_|get_option|update_option|add_option|\$wpdb/.test(php), 'geen API-aanroep of opslag in PHP');
});

test('PHP is syntactisch in orde (alleen als php aanwezig is)', (t) => {
  try {
    execFileSync('php', ['-l', new URL('../wordpress/kalender-frankrijk/kalender-frankrijk.php', import.meta.url).pathname], { stdio: 'pipe' });
  } catch (e) {
    if (e.code === 'ENOENT') return t.skip('php niet geïnstalleerd');
    throw e;
  }
});

test('JS: geen innerHTML, geen opslag in de browser, geen eval', () => {
  for (const verboden of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'eval(', 'new Function']) {
    assert.ok(!js.includes(verboden), `JS bevat ${verboden}`);
  }
  assert.ok(js.includes('textContent'));
  assert.ok(js.includes('rel: \'noopener\'') && js.includes('target: \'_blank\''));
});

test('JS: gebeurtenissen gaan via addEventListener, nooit als attribuut', () => {
  assert.ok(js.includes("k.slice(0, 2) === 'on'"));
  assert.ok(js.includes('addEventListener(k.slice(2), v)'));
  assert.ok(!/setAttribute\(\s*['"]on/.test(js));
});

test('JS: de vaste instellingen uit de opdracht', () => {
  assert.ok(js.includes("'https://kalender-frankrijk.vercel.app'"));
  assert.ok(js.includes('https://www.nederlanders.fr/profiles/blog/new'));
  assert.ok(js.includes('TIMEOUT_MS = 8000'));
  assert.ok(js.includes('De kalender is nu niet bereikbaar.'));
  assert.ok(js.includes('Opnieuw proberen'));
  assert.ok(js.includes('Toon alles'));
  assert.ok(js.includes('Zet in uw agenda'));
  assert.ok(js.includes('Kalender Frankrijk is een uitgave van Communities Abroad. Alleen data die tegen de bron zijn gecontroleerd.'));
  assert.ok(js.includes("indexOf('pagina')"), 'filter op toon_in pagina');
});

test('JS: elke klasse die het script zet begint met kfr', () => {
  const klassen = [...js.matchAll(/klas: '([^']+)'/g)].flatMap((m) => m[1].split(/\s+/)).concat([...js.matchAll(/\bkn\('([^']+)'/g)].flatMap((m) => m[1].split(/\s+/))).filter(Boolean);
  assert.ok(klassen.length > 20);
  for (const k of klassen) assert.ok(/^kfr(-|$)/.test(k), `klasse ${k}`);
  assert.ok(/'kfr-b ' \+ klas/.test(js));
});

test('CSS: alleen kfr-klassen, alles onder .kfr, !important alleen op de knopregel', () => {
  const kaal = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const regels = [...kaal.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  assert.ok(regels.length > 40);
  for (const [, sel, body] of regels) {
    const s = sel.trim();
    if (s.startsWith('@')) continue;
    for (const deel of s.split(',')) {
      assert.ok(/^\.kfr\b/.test(deel.trim()), `selector buiten .kfr: ${deel.trim()}`);
      for (const k of deel.matchAll(/\.([A-Za-z_][\w-]*)/g)) assert.ok(/^kfr(-|$)/.test(k[1]), `klasse ${k[1]}`);
    }
    if (body.includes('!important')) assert.equal(s, '.kfr .kfr-b', `!important buiten de knopregel: ${s}`);
  }
  assert.ok(/font-family: Poppins, 'Segoe UI'/.test(kaal) && /font-family: Mulish, 'Segoe UI'/.test(kaal), 'lettertypen met terugval');
  assert.ok(!/@import|@font-face|fonts\.googleapis/.test(css), 'de plugin laadt zelf geen lettertypen');
  assert.ok(/max-width: 760px/.test(css));
  assert.ok(!/font-size:\s*(1[01]|[0-9])px/.test(kaal), 'geen tekst onder 12 px');
});

test('de zip bestaat, bevat de vier bestanden in een map en is gelijk aan de bron', () => {
  assert.ok(existsSync(new URL('../public/download/kalender-frankrijk.zip', import.meta.url)), 'draai npm run bouw');
  const zip = readFileSync(new URL('../public/download/kalender-frankrijk.zip', import.meta.url));
  assert.ok(zip.equals(pluginZip()), 'public/download/kalender-frankrijk.zip is niet gelijk aan de bron (draai npm run bouw)');
  const lijst = leesZip(zip);
  assert.deepEqual(lijst.map((x) => x.naam).sort(), PLUGIN_BESTANDEN.map((b) => MAP + b).sort());
  for (const b of lijst) {
    const data = b.methode === 8 ? inflateRawSync(b.ruw) : b.ruw;
    assert.equal(data.length, b.grootte);
    assert.equal(crc32(data), b.crc);
    assert.equal(data.toString('utf8'), bron(b.naam.slice(MAP.length)), b.naam);
  }
});

test('public/plugin is een kopie van de bron: één bron voor plugin en voorbeeldpagina', () => {
  for (const b of PUBLIEK_BESTANDEN) assert.equal(lees('public/plugin/' + b), bron(b), b);
});

test('voorbeeldpagina gebruikt dezelfde code, met lettertypen alleen hier', () => {
  const pagina = lees('public/pagina.html');
  assert.ok(pagina.includes('Voorbeeld van de pagina op Infofrankrijk'));
  assert.ok(pagina.includes('href="/plugin/kalender-frankrijk.css"'));
  assert.ok(pagina.includes('src="/plugin/kalender-frankrijk.js"'));
  assert.ok(/<div class="kfr" data-kfr /.test(pagina));
  assert.ok(pagina.includes('fonts.googleapis.com'));
  assert.ok(pagina.includes('#f5f0eb'));
});

test('geen lang streepje en geen "ecosysteem" in plugin, voorbeeldpagina en handleiding', () => {
  for (const [naam, tekst] of Object.entries({
    php, js, css, readme: bron('readme.txt'), pagina: lees('public/pagina.html'), handleiding: lees('wordpress/README.md'),
  })) {
    assert.ok(!/[–—]/.test(tekst), `lang streepje in ${naam}`);
    assert.ok(!/ecosysteem/i.test(tekst), `ecosysteem in ${naam}`);
  }
});

test('npm run bouw maakt ook de plugin; de bestemming op de keuzepagina is voorlopig de fiscale kalender', () => {
  const pkg = JSON.parse(lees('package.json'));
  assert.ok(pkg.scripts.bouw.includes('scripts/bouw-plugin.js'));
  const afn = lees('lib/afnemers.js');
  assert.ok(/^\s*url: 'https:\/\/infofrankrijk\.com\/fiscale-kalender-frankrijk\/',/m.test(afn));
  assert.ok(/^\s*\/\/ url: 'https:\/\/infofrankrijk\.com\/kalender-frankrijk\/',/m.test(afn));
});
