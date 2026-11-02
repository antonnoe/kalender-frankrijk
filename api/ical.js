import { stuur } from '../lib/vercel.js';

// Bereikbaar als /ical/<naam>.ics (zie vercel.json)
export default async function handler(req, res) {
  await stuur(req, res, '/api/ical');
}
