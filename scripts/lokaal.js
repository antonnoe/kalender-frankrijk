// Kleine lokale server met dezelfde routes als op Vercel: npm run lokaal  (poort 3000)
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { route, vergeetData } from '../lib/api.js';
import { ROOT } from '../lib/laden.js';

const poort = Number(process.env.PORT ?? 3000);
const types = { '.png': 'image/png', '.svg': 'image/svg+xml', '.html': 'text/html; charset=utf-8' };

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/beeld/')) {
    const pad = join(ROOT, 'public', url.pathname);
    if (existsSync(pad)) { res.setHeader('content-type', types[extname(pad)] ?? 'application/octet-stream'); return res.end(readFileSync(pad)); }
  }
  vergeetData();
  const r = route(url.pathname, Object.fromEntries(url.searchParams), { ...req.headers, __methode: req.method });
  for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
  res.statusCode = r.status;
  res.end(r.body);
}).listen(poort, () => console.log(`Kalender Frankrijk lokaal op http://localhost:${poort}  (bijvoorbeeld /api/vandaag, /api/status, /ical/genieten.ics)`));
