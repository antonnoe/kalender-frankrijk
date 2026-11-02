// Koppelt een Vercel-verzoek aan de routes in api.js.
import { route } from './api.js';

export function stuur(req, res, pad) {
  const url = new URL(req.url, 'http://x');
  const query = Object.fromEntries(url.searchParams);
  const headers = { ...req.headers, __methode: req.method };
  const r = route(pad, query, headers);
  for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
  res.statusCode = r.status;
  res.end(r.body);
}
