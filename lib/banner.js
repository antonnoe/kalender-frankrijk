// De banner van nlfr-menu (gaat Café Jeudi deze week door?) wordt bij elke aanroep van /api/vandaag live gelezen,
// zodat een "ja" op donderdagochtend direct doorwerkt. Lukt dat niet binnen drie seconden, dan geldt de nachtelijke
// kopie in data/bron/cafe-jeudi.json (en zonder kopie de vaste regel: elke donderdag).

import { kortBanner } from './bronnen.js';

export const BANNER_URL = 'https://nlfr-menu.vercel.app/api/banner';
export const BANNER_TIMEOUT_MS = 3000;

/**
 * Haalt de banner live op. Geeft {banner, bron} met bron 'live' of 'kopie'; nooit een fout.
 * `haal` is te vervangen (tests): (url, {signal}) => Promise<{ok, json()}>.
 */
export async function liveBanner(kopie, { haal = globalThis.fetch, timeout = BANNER_TIMEOUT_MS, url = BANNER_URL } = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeout);
  try {
    const res = await haal(url, { signal: ac.signal, headers: { accept: 'application/json', 'user-agent': 'kalender-frankrijk (+https://github.com/antonnoe/kalender-frankrijk)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // de tijdslimiet geldt ook voor het lezen van het antwoord zelf
    const d = await Promise.race([res.json(), new Promise((_, nee) => ac.signal.addEventListener('abort', () => nee(new Error('te traag'))))]);
    if (!d || typeof d.aan !== 'boolean') throw new Error('onverwachte opbouw');
    return { banner: kortBanner(d), bron: 'live' };
  } catch {
    return { banner: kopie, bron: 'kopie' };
  } finally {
    clearTimeout(t);
  }
}
