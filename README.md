# Kalender Frankrijk

Eén kalender met alle data die ertoe doen voor Nederlanders en Belgen in Frankrijk: feestdagen en schoolvakanties in beide landen, de fiscale kalender (particulieren, ondernemers, Nederland), betaaldagen van pensioenen en uitkeringen, verkiezingen, seizoen en mijlpalen, verenigingen. Met tien rubrieken, een eigen iCal per rubriek, een kleine JSON-API en het blok "Vandaag in het kort" voor de dagelijkse nieuwsbrief van Nederlanders.fr.

Een uitgave van Communities Abroad. De Fiscale kalender Frankrijk op Infofrankrijk blijft bestaan als rubriek van deze kalender; de plugin daar blijft de plek waar de fiscale datums worden beheerd.

Er is geen database en er zijn geen sleutels nodig. Alle data staat als leesbare bestanden in deze repo; de API rekent bij elk verzoek uit wat er speelt. Ontwerp: `docs/ONTWERP.md`. Stand van het bouwwerk: `REGIE.md`.

## Een datum toevoegen of aanpassen (via de GitHub-website)

U hoeft niets te installeren. Elke rubriek heeft één bestand in `data/rubrieken/`: `fiscaal.yaml`, `uitkeringen.yaml`, `feestdagen.yaml`, `school.yaml`, `wonen.yaml`, `buiten.yaml`, `zorg.yaml`, `stemmen.yaml`, `genieten.yaml` en `verenigingen.yaml`.

1. Ga op github.com naar de repo `antonnoe/kalender-frankrijk`, open de map `data`, dan `rubrieken`, en klik op het bestand van de rubriek.
2. Klik rechtsboven op het potloodje (Edit this file).
3. Kopieer een bestaand blok (van `- id:` tot en met de laatste regel van dat blok) en plak het onderaan, met een lege regel ertussen.
4. Pas het blok aan. Wijzig het `id` altijd: dat moet uniek zijn, bestaat uit kleine letters, cijfers en streepjes en blijft daarna altijd gelijk (abonnees in hun agenda houden zo hun afspraak).
5. Klik op "Commit changes", laat "Commit directly to the main branch" staan en bevestig.
6. Na een minuut of twee staat er bij de commit een groen vinkje of een rood kruis. Bij een rood kruis: klik erop, dan op "Details" bij "Controle van de data". De melding noemt het bestand en het regelnummer, bijvoorbeeld `genieten.yaml regel 42: datum 31-11-2026 bestaat niet`. Verbeter dat en sla opnieuw op. Zolang het rood is, blijft de vorige versie live; er breekt niets.
7. Is het groen, dan is de nieuwe datum binnen enkele minuten in de API en in de agenda's. De nieuwsbrief neemt het de volgende ochtend mee.

Voorbeeldblok (`data/rubrieken/genieten.yaml`):

```yaml
- id: beaujolais-nouveau
  titel: Beaujolais nouveau
  rubriek: genieten
  doelgroepen: [iedereen]
  wanneer: derde donderdag van november
  aftellen: [14, 1]
  gebied: heel Frankrijk
  tekst: Vanaf deze donderdag mag de nieuwe beaujolais worden geschonken, in veel bistro's met een feestje.
  link: https://www.beaujolais.com
  bron: {url: https://www.beaujolais.com, gecontroleerd: 2026-11-02}
  status: vastgesteld
  toon_in: [nieuwsbrief, pagina, infopoche]
```

Let op de spaties vóór de veldnamen (twee spaties) en de dubbele punt met een spatie erachter. Tekst met een dubbele punt erin zet u tussen aanhalingstekens.

### De velden

| Veld | Betekenis |
|---|---|
| `id` | korte unieke naam, blijft altijd gelijk |
| `titel` | kort, Nederlandse zinsopbouw, kleine letters (behalve namen), geen lange streepjes |
| `rubriek` | `fiscaal`, `uitkeringen`, `feestdagen`, `school`, `wonen`, `buiten`, `zorg`, `stemmen`, `genieten`, `verenigingen` |
| `doelgroepen` | een of meer van `iedereen`, `particulier`, `ondernemer`, `gepensioneerde`, `pas-verhuisd`, `gezin`, `huiseigenaar`, `huurder`, `automobilist`, `kustbewoner` |
| `wanneer` | zie hieronder |
| `aftellen` | op hoeveel dagen vooraf het item terugkomt, bijvoorbeeld `[14, 7, 1]`. Weglaten mag: een fiscale of stem-deadline krijgt dan 14, 7 en 1, andere items krijgen geen aftelling. Bij een periode gaat het om dagen vóór het begin; bij een feestdag telt `0` voor de dag zelf |
| `gebied` | `heel Frankrijk`, `zone A`, `zone B`, `zone C`, `Elzas-Moezel`, departementen of `Nederland` (weglaten betekent heel Frankrijk) |
| `tekst` | één neutrale zin zonder je of u. Alleen waar dat stroef wordt: `tekst_je` (nieuwsbrief, InfoPoche) en `tekst_u` (Infofrankrijk) |
| `link` | bij voorkeur het artikel op Infofrankrijk |
| `bron` | `{url: ..., gecontroleerd: JJJJ-MM-DD}`, allebei verplicht |
| `status` | `vastgesteld` of `te_verifieren`. Te verifiëren komt op de pagina (met label) en in de agenda (als voorlopig), nooit in de nieuwsbrief |
| `toon_in` | lijst met `nieuwsbrief`, `pagina`, `infopoche`. Ook `toon in` met een spatie wordt begrepen |
| `groep` | optioneel: items die bij elkaar horen (de nieuwsbrief noemt ze in één regel) |
| `soort` | optioneel: `datum`, `periode`, `seizoen`, `banner` of `mijlpaal`. Weglaten: een periode als `wanneer` een periode is, anders een datum |
| `gesprek` | `ja` of `nee`. Weglaten: ja bij seizoen en mijlpaal, nee bij de rest. Bij `ja` krijgt het item de link "Bespreek op het forum" |
| `tijd` | optioneel, bijvoorbeeld `"18:00-19:30"` |

Een banner (feestperiode in de nieuwsbrief) heeft daarbij `soort: banner`, een periode in `wanneer` en de velden `tekst_nl`, `tekst_fr` en `kleur`.

### Het veld `wanneer`

Eén datum, een periode, of een regel die het systeem zelf uitrekent. Alles hieronder mag, in een blok als `wanneer: ...`:

| Zo schrijft u het | Betekenis |
|---|---|
| `{datum: 2026-11-16}` | één datum (jaar-maand-dag) |
| `{van: 2026-11-01, tot: 2027-03-31}` | één periode |
| `{datums: [2026-11-16, 2027-03-01]}` | een vaste lijst losse datums |
| `{regel: "jaarlijks 11-11"}` | elk jaar op 11 november (dag-maand) |
| `derde donderdag van november` | ook `eerste`, `tweede`, `vierde`, `vijfde` en `laatste`, met elke weekdag en maand: `laatste zondag van maart`, `eerste maandag van september` |
| `pasen`, `pasen +1`, `pasen -2` | Pasen wordt uitgerekend: `pasen +1` is Paasmaandag, `pasen -2` Goede Vrijdag, `pasen +39` Hemelvaart |
| `elke donderdag` | elke week op die dag |
| `jaarlijks 01-11 tot 31-03` | een periode die elk jaar terugkomt, ook over de jaargrens; ook `pasen -2 tot pasen +1` |

## De API

Alles is openbaar en alleen-lezen (CORS open), met een cache van een uur. Vervang `<adres>` door het adres van het Vercel-project.

| Adres | Wat het geeft |
|---|---|
| `GET <adres>/api/vandaag?datum=JJJJ-MM-DD` | de regels voor "Vandaag in het kort" en de feestbanner; zonder datum vandaag in Europe/Paris. Vorm: `{datum, banner: {tekst_nl, tekst_fr, kleur} of null, regels: [{soort, kop, titel, tekst, link, rubriek, beeld_url, gesprek, forum_url, id}], weggelaten: [...]}`. Hooguit vier regels. Extra: `nieuws_links=url1,url2` laat items weg die de nieuwsbrief al als nieuws toont |
| `GET <adres>/api/items?van=&tot=&rubriek=&doelgroep=&toon_in=` | alle items (eigen kalender plus ingelezen bronnen) met per item de berekende data binnen het bereik in `voorkomens`. Filters mogen meerdere waarden hebben, gescheiden door komma's; `doelgroep` telt `iedereen` altijd mee. Zonder bereik: de komende 60 dagen |
| `GET <adres>/api/status` | per bron de leeftijd van de kopie, het aantal items per rubriek in de komende 60 dagen en waarschuwingen (bron te oud, bron mislukt, rubriek met minder dan vijf items) |
| `GET <adres>/api/rubrieken` | de tien rubrieken met kleur en beeld |
| `GET <adres>/beeld/<rubriek>.png` en `.svg` | het themabeeld (PNG 112 x 112 voor e-mail, SVG voor het web) |

Een regel in `/api/vandaag` heeft `soort` `vandaag`, `aftelling`, `periode` of `tip`. De kop is kant-en-klaar, bijvoorbeeld "Over 14 dagen, maandag 16 november." De selectieregels (volgorde, maximum, doorschuiven van periodes, seizoenstip) staan in `docs/ONTWERP.md` onder f en l en in `lib/engine.js`.

## Agenda's om te abonneren (iCal)

| Adres | Inhoud |
|---|---|
| `<adres>/ical/alles.ics` | alles |
| `<adres>/ical/<rubriek>.ics` | één rubriek, bijvoorbeeld `<adres>/ical/genieten.ics` of `<adres>/ical/feestdagen.ics` |
| `<adres>/ical/fiscaal-particulier.ics` | fiscale data voor particulieren |
| `<adres>/ical/fiscaal-ondernemer.ics` | fiscale data voor ondernemers |
| `<adres>/ical/fiscaal-nederland.ics` | Nederlandse fiscale data |

Abonneren: in Google Agenda via "Andere agenda's" en dan "Via URL"; in Apple Agenda via Archief en dan "Nieuw agenda-abonnement". De afspraken hebben een vaste UID (id plus begindatum), dus een nieuwe build maakt geen dubbele afspraken. De feeds beslaan het lopende jaar en de twee jaren erna. Items met status te verifiëren staan erin als voorlopig, met de toevoeging "(te verifiëren)".

## Waar de data vandaan komt

De eigen jaarkalender staat in `data/rubrieken/`. De rest wordt ingelezen en bewaard als laatste kopie in `data/bron/`:

| Bron | Bestand | Wat eruit komt |
|---|---|---|
| calendrier.api.gouv.fr (metropole en alsace-moselle) | `feestdagen.json` | wettelijke feestdagen, drie jaar vooruit |
| data.education.gouv.fr, fr-en-calendrier-scolaire | `schoolvakanties.json` | schoolvakanties zones A, B en C |
| Google openbare feestdagkalenders Frankrijk en Nederland | `google-fr.ics`, `google-nl.ics` | alleen aanvulling (gedenkdagen), nooit de enige bron voor een wettelijke feestdag |
| de drie fiscale feeds van Infofrankrijk | `fiscaal-particulier.ics`, `fiscaal-professionnel.ics`, `fiscaal-nederland.ics` | fiscale data FR en NL, AOW-betaaldagen |
| verenigingen-kalender | `verenigingen.json` | activiteiten van verenigingen (Café Jeudi wordt overgeslagen) |
| nlfr-menu /api/banner | `cafe-jeudi.json` | of Café Jeudi deze week doorgaat |

De fiscale feeds worden niet aangepast: `data/verrijking-fiscaal.yaml` geeft ze op titelpatroon een rubriek, doelgroep, uitleg, link en aftelling (de eerste regel waarvan het patroon past, wint). Bij het inlezen worden lange streepjes in titels komma's en dubbele items op dezelfde dag samengevoegd. Ondernemersitems staan standaard alleen op de pagina, niet in de nieuwsbrief.

### Verversen

`npm run bronnen` haalt alle bronnen op. Dat gebeurt elke dag om 04:30 UTC in de GitHub Action `bronnen.yml`, die alleen een commit maakt als er iets veranderd is. In `data/bron/status.json` staat per bron de datum van de laatste geslaagde ophaling. Een kopie wordt niet vervangen als het antwoord er verdacht uitziet (geen kalender, veel minder items dan eerder).

### Wat er gebeurt als een bron uitvalt

De laatste kopie blijft staan en blijft werken; de run en de build blijven groen. `/api/status` laat per bron zien hoe oud de kopie is en meldt de oorzaak van de laatste mislukte poging. De Google-kalenders zijn aanvulling, dus zonder hen mist hooguit een gedenkdag. Valt de banner van nlfr-menu weg en bestaat er nooit een kopie, dan geldt de vaste regel: elke donderdag 18.00 tot 19.30 uur.

## Voor beheerders van de techniek

```
npm install
npm run controleer     # controleert alle data, met meldingen in gewoon Nederlands
npm test               # alle tests, zonder netwerk (fixtures in test/fixtures)
npm run bronnen        # haalt de bronnen op (achter een proxy: NODE_USE_ENV_PROXY=1 npm run bronnen)
npm run beelden        # maakt de themabeelden in public/beeld opnieuw
npm run lokaal         # lokale server op poort 3000 met dezelfde routes als op Vercel
```

Vercel: importeer de repo als project, zonder instellingen. `vercel.json` voegt de data toe aan de functies en maakt van `/ical/<naam>.ics` een route. Elke push naar main bouwt opnieuw. Bij een rode controle in GitHub blijft de vorige versie live.

```
api/                 de Vercel-functies (dunne laag)
lib/                 model en controle (model.js), datumregels (datum.js), inlezen (bronnen.js, verrijking.js),
                     rekenen en selectie (engine.js), iCal (ical.js), routes (api.js)
data/rubrieken/      de eigen jaarkalender, één bestand per rubriek
data/verrijking-fiscaal.yaml
data/bron/           laatste kopie van elke externe bron, plus status.json
public/beeld/        themabeelden (PNG en SVG)
scripts/             controleer, bronnen, themabeelden, lokale server
test/                tests en fixtures
```

## Bekende beperkingen

- De bosbrandwaarschuwing is nog niet gekoppeld (bouwplan taak 7); selectieregel 7 uit het ontwerp is dus nog niet actief.
- Vooraf invullen van het forumformulier kon niet worden getoetst, zie `docs/FORUMLINK.md`. De pagina toont per item een kant-en-klare aanzet (`forum_aanzet`).
- De fiscale feed voor particulieren heeft voor 2027 nog weinig items; `/api/status` waarschuwt zodra een rubriek minder dan vijf items in de komende 60 dagen heeft.
