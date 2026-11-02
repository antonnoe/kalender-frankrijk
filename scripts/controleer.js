// Controleert alle data van Kalender Frankrijk en meldt fouten in gewoon Nederlands.
// Draait bij elke push (GitHub Action controle.yml). Een fout geeft een rood kruis; de vorige versie blijft dan live.

import { laadAlles } from '../lib/laden.js';
import { vandaagParijs } from '../lib/datum.js';

const res = laadAlles(process.env.KALENDER_ROOT || undefined, { vandaag: vandaagParijs() });
for (const w of res.waarschuwingen) console.log(`Let op: ${w}`);
for (const f of res.fouten) console.log(`FOUT: ${f}`);
const eigen = res.items.filter((i) => i.herkomst === 'eigen').length;
console.log(`\n${res.items.length} items geladen (${eigen} uit data/rubrieken, de rest uit ingelezen bronnen).`);
if (res.fouten.length) {
  console.log(`${res.fouten.length} fout(en) gevonden. Verbeter het genoemde bestand en sla het opnieuw op.`);
  process.exit(1);
}
console.log('Alles in orde.');
