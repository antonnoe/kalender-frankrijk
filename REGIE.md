# Regie: Kalender Frankrijk

Bouwplan uit `docs/ONTWERP.md` onder i. Stand van 2 november 2026.

| Taak | Wat | Status |
|---|---|---|
| 1 | Repo, datamodel en controle (`npm run controleer`, Action `controle.yml`) | klaar |
| 2 | Bronnen inlezen (`npm run bronnen`, Action `bronnen.yml`): feestdagen, schoolvakanties, Google FR en NL, drie fiscale feeds met verrijking, verenigingen, Café Jeudi | klaar, alle negen bronnen live opgehaald |
| 3 | Eigen jaarkalender november 2026 tot en met december 2027 | door een andere bouwer, in `data/rubrieken/` |
| 4 | API, iCal per rubriek, themabeelden | klaar |
| 5 | "Vandaag in het kort" en feestbanner in de nieuwsbrief (afnemer) | open; de API levert de regels al, de nieuwsbrief moet ze tekenen |
| 6 | Pagina op Infofrankrijk (plugin met shortcode, besluit j2 = B) | open |
| 7 | Bosbrand koppelen | open, repo van de bosbrandtool nog te vinden |
| 8 | Invulscherm in Cockpit, daarna InfoPoche-scherm | open |

## Wat is gebouwd

- `lib/model.js`: de rubrieken, doelgroepen en de controle van elk blok met meldingen als `genieten.yaml regel 42: datum 31-11-2026 bestaat niet`.
- `lib/datum.js`: datumregels (derde donderdag, laatste zondag, Pasen, jaarlijks DD-MM, perioden over de jaargrens), getest voor 2026 tot en met 2028.
- `lib/bronnen.js`, `lib/verrijking.js`, `scripts/bronnen.js`: inlezen en verrijken van de bronnen.
- `lib/engine.js`: de selectieregels van "Vandaag in het kort" (ONTWERP f en l).
- `lib/api.js`, `api/`, `lib/ical.js`: /api/items, /api/vandaag, /api/status, /api/rubrieken en de iCal-feeds.
- `scripts/maak-themabeelden.js`: PNG en SVG per rubriek.
- `.github/workflows/`: controle bij elke push, dagelijks verversen van de bronnen, jaarronde in december.

## Open voor de opdrachtgever

1. Vercel koppelen aan de repo (geen instellingen nodig) en het adres doorgeven aan de nieuwsbrief en de pagina.
2. Eenmalig de forumlink testen, zie `docs/FORUMLINK.md`.
3. Het IFI-artikel op Infofrankrijk bestaat blijkbaar nog niet (de zoekopdracht vond er geen); de IFI-items verwijzen nu naar de pagina van de fiscale kalender.
