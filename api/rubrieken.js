import { stuur } from '../lib/vercel.js';

export default function handler(req, res) {
  stuur(req, res, '/api/rubrieken');
}
