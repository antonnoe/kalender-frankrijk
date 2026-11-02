import { stuur } from '../lib/vercel.js';

// Bereikbaar als /ical/<naam>.ics (zie vercel.json)
export default function handler(req, res) {
  stuur(req, res, '/api/ical');
}
