// Koppelt een Vercel-verzoek aan de routes in api.js.
import { routeLive } from './api.js';

export async function stuur(req, res, pad) {
  const url = new URL(req.url, 'http://x');
  const query = Object.fromEntries(url.searchParams);
  const uitPad = /^\/ical\/([^/?]+)/.exec(url.pathname);
  if (pad === '/api/ical' && !query.naam && uitPad) query.naam = uitPad[1];
  const headers = { ...req.headers, __methode: req.method };
  const r = await routeLive(pad, query, headers);
  for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
  res.statusCode = r.status;
  res.end(r.body);
}
