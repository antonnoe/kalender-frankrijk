import { stuur } from '../lib/vercel.js';

export default async function handler(req, res) {
  await stuur(req, res, '/api/vandaag');
}
