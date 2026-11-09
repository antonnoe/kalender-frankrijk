# CLAUDE.md

Repo: kalender-frankrijk

## Wat dit is

Eén kalender met alle data die ertoe doen voor Nederlanders en Belgen in Frankrijk: feestdagen en schoolvakanties, fiscale kalender, betaaldagen van pensioenen en uitkeringen, verkiezingen, seizoen en mijlpalen, verenigingen. Tien rubrieken, een iCal per rubriek, een kleine JSON-API, het blok "Vandaag in het kort" voor de dagelijkse nieuwsbrief van Nederlanders.fr en een WordPress-plugin voor Infofrankrijk. Een uitgave van Communities Abroad (bron: README.md).

## Live adres

https://kalender-frankrijk.vercel.app (bron: REGIE.md). De pagina op Infofrankrijk komt op https://infofrankrijk.com/kalender-frankrijk/ en het scherm Kalender in InfoPoche op https://infopoche.fr/#/kalender (bron: README.md, lib/afnemers.js).

## Opbouw

- api/: de Vercel-functies (ical.js, items.js, rubrieken.js, status.js, vandaag.js), een dunne laag
- lib/: model en controle (model.js), datumregels (datum.js), inlezen (bronnen.js, verrijking.js), ontdubbelen (ontdubbel.js), live banner (banner.js), rekenen en selectie (engine.js), iCal (ical.js), routes (api.js), bestemmingen (afnemers.js)
- data/rubrieken/: de eigen jaarkalender, één yaml-bestand per rubriek (tien stuks)
- data/verrijking-fiscaal.yaml: verrijking van de fiscale feeds
- data/bron/: laatste kopie van elke externe bron, plus status.json
- public/: startpagina (gegenereerd), pagina.html, themabeelden in public/beeld, plugin-kopie in public/plugin, zip in public/download
- scripts/: controleer, bronnen, themabeelden, lokale server, startpagina en plugin-zip
- wordpress/: de WordPress-plugin (bron) en haar handleiding
- docs/: ONTWERP.md, BRIEFING.md, FORUMLINK.md, JAARKALENDER-BRONNEN.md, MOCKUP.html
- test/: tests en fixtures
- .github/workflows/: bronnen.yml, controle.yml, december-checklist.yml

## Techniek

Node 22 of hoger, ES-modules, één productiepakket: yaml (vaste versie). sharp is alleen een bouwstap voor de themabeelden. Geen database. Scripts: `npm run controleer`, `npm test`, `npm run bronnen`, `npm run beelden`, `npm run bouw`, `npm run lokaal`.

## Externe diensten en namen van omgevingsvariabelen

- Vercel (hosting en functies, rewrite van /ical/:naam naar /api/ical)
- GitHub Actions (controle bij elke push, bronnen dagelijks om 04:30 UTC, december-checklist op 1 december)
- Ingelezen bronnen: calendrier.api.gouv.fr, data.education.gouv.fr, Google openbare feestdagkalenders FR en NL, de drie fiscale iCal-feeds van Infofrankrijk, verenigingen-kalender, nlfr-menu (/api/banner)
- WordPress op Infofrankrijk (plugin met shortcode [kalender_frankrijk])
- Er zijn geen sleutels nodig. De code leest alleen KALENDER_ROOT en PORT (lokale server en tests).

## Hoe het live gaat

Vercel importeert de repo zonder instellingen en bouwt bij elke push naar main opnieuw. Bij een rode controle bouwt Vercel gewoon door: een blok met een fout wordt overgeslagen en /api/status meldt ok: false. De plugin-zip staat in public/download en gaat mee in git. Na wijzigingen aan lib/afnemers.js of de plugin draait `npm run bouw` en wordt het resultaat mee gecommit (bron: README.md).

## Regels en besluiten

Bronnen: README.md en REGIE.md.
- De id van een item blijft altijd gelijk en is uniek (kleine letters, cijfers en streepjes).
- Een lang streepje in titel of tekst is een rode fout, gebruik een komma.
- Gebied alleen uit de vaste lijst, anders een departementsnummer.
- Status `te_verifieren` komt nooit in de API-lijst, de nieuwsbrief, InfoPoche of de pagina, alleen in de agenda-feeds met de toevoeging "(te verifiëren)".
- Google-kalenders zijn alleen aanvulling, nooit de enige bron voor een wettelijke feestdag.
- Een kopie van een bron wordt niet vervangen als het antwoord er verdacht uitziet.
- Voorrang bij ontdubbelen: eigen item, dan de officiële bron, dan Google.
- Tekst staat nooit in een url-veld.
- Wijzigingen aan data gaan via commits op main; de controle (`npm run controleer`) moet groen zijn.
- Rubriek `genieten` heet sinds 9 november 2026 "Franse tradities" (knopje "Tradities"); de id `genieten` blijft, want /ical/genieten.ics is het adres van bestaande agenda-abonnementen. Een id van een rubriek verander je nooit.
- Cache van de API (lib/api.js, CACHE): browser maximaal 5 minuten (max-age=300), CDN een uur (s-maxage=3600; Vercel leegt die bij elke nieuwe uitrol). Langer in de browser betekent dat een naamswijziging tot een uur half zichtbaar is in InfoPoche (gezien op 9-11-2026 bij de rubriek Tradities).
- `/api/items?id=<id>` levert één item op id (zelfde velden en filter als de lijst, bereik standaard een week terug tot 800 dagen vooruit, 404 bij onbekend, verborgen of voorbij); InfoPoche gebruikt dit voor gedeelde links naar items ver vooruit (9-11-2026).
- Naamdag: `data/naamdagen.json` (366 dagen, Wikidata P1750 CC0, 12 dagen uit fr.wikipedia CC BY-SA, gemaakt met `npm run naamdagen`, niet in een workflow) geeft het veld `naamdag` in /api/vandaag (hooguit drie namen, nooit op een wettelijke feestdag, bij elk probleem `null`). Bronvermelding staat in README en op de startpagina; noem Nominis en fetedujour.fr niet als bron en gebruik ze niet.
- Datum geschat: optioneel veld `datum_zeker: nee` (API: `datum_zeker: false`, anders `true`). Een titel met "(waarschijnlijke datum)" zonder dat veld is een rode fout in `npm run controleer`. InfoPoche toont dan geen "Gecontroleerd op" maar "Gebruikelijke datum, nog niet bevestigd door de organisator.". Staat nu op de 9 geschatte items in genieten.yaml; na bevestiging door de organisator het veld en de toevoeging in de titel weghalen.
- Open volgens REGIE.md: nieuwsbrief tekent de regels van "Vandaag in het kort", plugin installeren in WordPress, bosbrand koppelen, invulscherm in Cockpit.

## Laatst nagelopen

Laatst nagelopen: 9 november 2026
