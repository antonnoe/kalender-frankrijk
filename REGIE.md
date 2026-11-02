# Regie: Kalender Frankrijk

Bouwplan uit `docs/ONTWERP.md` onder i. Stand van 2 november 2026.

| Taak | Wat | Status |
|---|---|---|
| 1 | Repo, datamodel en controle (`npm run controleer`, Action `controle.yml`) | klaar |
| 2 | Bronnen inlezen (`npm run bronnen`, Action `bronnen.yml`): feestdagen, schoolvakanties, Google FR en NL, drie fiscale feeds met verrijking, verenigingen, Café Jeudi | klaar, alle negen bronnen live opgehaald |
| 3 | Eigen jaarkalender november 2026 tot en met december 2027 | door een andere bouwer, in `data/rubrieken/` |
| 4 | API, iCal per rubriek, themabeelden | klaar |
| 5 | "Vandaag in het kort" en feestbanner in de nieuwsbrief (afnemer) | open; de API levert de regels al, de nieuwsbrief moet ze tekenen |
| 6 | Pagina op Infofrankrijk (plugin met shortcode, besluit j2 = B) | plugin klaar (`wordpress/`, zip op /download/kalender-frankrijk.zip, voorbeeld op /pagina.html); nog te installeren en de pagina `kalender-frankrijk` te maken in WordPress |
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

## Herstelronde 1 (2 november 2026)

Bevindingen van de eisenkeurder en wat ermee is gedaan.

| Nr | Bevinding | Status |
|---|---|---|
| 1 | Dubbele items over bronnen heen (Eerste kerstdag, Nieuwjaarsdag, Goede Vrijdag, Hemelvaartsdag, Koningsdag, Sinterklaasfeest) | hersteld: `lib/ontdubbel.js` ontdubbelt per dag op genormaliseerde titel en vertaalparen, voorrang eigen item, officiële bron, Google; gebied wordt samengevoegd; banners zijn geen item in /api/items en iCal; verenigingen met gelijke titel blijven apart met de verenigingsnaam in de titel |
| 2 | Seizoenstip en seizoensaftelling in dezelfde week | hersteld: hooguit één seizoensregel (tip of aftelling) per ISO-week, vast uitgerekend vanaf maandag |
| 3 | Controle: YAML-regelnummer, gebied, lang streepje, normalisatie verenigingen | hersteld: juiste regelnummer en Nederlandse melding bij een syntaxfout; gebied tegen de vaste lijst; lang streepje is een rode fout in eigen items; verenigingen genormaliseerd bij het inlezen |
| 4 | Café Jeudi | hersteld: /api/vandaag leest de banner van nlfr-menu live (3 seconden, terugval op de kopie); in de iCal één wekelijkse afspraak met RRULE |
| 5 | Dode regel in engine, statustelling | hersteld: alleen vastgestelde items in de 60-dagentelling, te_verifieren apart in /api/status |
| 6 | Documentatie over "vorige versie blijft live" en namen van de fiscale subfeeds | hersteld in README, controle.yml en ONTWERP |
| 7 | Verenigingsitems met tekst in het bron-urlveld | hersteld: website als bron-url, tekst in opmerking, nooit tekst in een url-veld |
| 8 | Dagelijkse workflow bronnen.yml zonder run | gestart met een handmatige run (workflow_dispatch) na de push van deze ronde: geslaagd (controle en tests op de nieuwe kopieën groen) |
| 9 | Tests | `test/herstelronde1.test.js` en aangepaste tests; `npm test` en `npm run controleer` groen |

## Verificatieronde data (2 november 2026)

Een aparte bouwer heeft alle eigen items met status te_verifieren nagelopen tegen de bron: 77 items vastgesteld, 72 blijven te_verifieren (bron niet bereikbaar of jaargang 2027 nog niet gepubliceerd). Fête des mères 2027 gesplitst (Frankrijk 30 mei, Nederland 9 mei), legislatives 2027 verwijderd (geen vaststaande verkiezing), gesprek alleen bij seizoen en mijlpaal, seizoensproducten met bron (Interfel, boulangerie.org, eglise.catholique.fr, france.fr, inc-conso.fr).

## Keuzepagina (2 november 2026)

Startpagina `/` omgebouwd tot keuzepagina (Op Infofrankrijk, In InfoPoche, iCal-links per rubriek); bestemmingen in `lib/afnemers.js`, gegenereerd met `npm run bouw`, test in `test/startpagina.test.js`. Commit: zie git log ("Keuzepagina").

## WordPress-plugin (2 november 2026)

Plugin `wordpress/kalender-frankrijk/` met shortcode `[kalender_frankrijk]`, voorbeeldpagina `/pagina.html` met dezelfde JS en CSS en zip `/download/kalender-frankrijk.zip`; test `test/plugin.test.js`. Open: installeren in WordPress en daarna `lib/afnemers.js` omzetten naar https://infofrankrijk.com/kalender-frankrijk/.

## Live

https://kalender-frankrijk.vercel.app, Vercel deployt vanzelf vanuit main. Gecontroleerd 2 november na herstelronde 1: /api/status ok, geen dubbele titels per dag 20 december tot 7 januari, één seizoensregel per week, Café Jeudi live, iCal verenigingen met één wekelijkse afspraak.

## Open voor de opdrachtgever

1. Eenmalig de forumlink testen, zie `docs/FORUMLINK.md`.
2. Het IFI-artikel op Infofrankrijk bestaat blijkbaar nog niet (de zoekopdracht vond er geen); de IFI-items verwijzen nu naar de pagina van de fiscale kalender.
