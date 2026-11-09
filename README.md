# Kalender Frankrijk

Eén kalender met alle data die ertoe doen voor Nederlanders en Belgen in Frankrijk: feestdagen en schoolvakanties in beide landen, de fiscale kalender (particulieren, ondernemers, Nederland), betaaldagen van pensioenen en uitkeringen, verkiezingen, seizoen en mijlpalen, verenigingen. Met tien rubrieken, een eigen iCal per rubriek, een kleine JSON-API en het blok "Vandaag in het kort" voor de dagelijkse nieuwsbrief van Nederlanders.fr.

Een uitgave van Communities Abroad. De Fiscale kalender Frankrijk op Infofrankrijk blijft bestaan als rubriek van deze kalender; de plugin daar blijft de plek waar de fiscale datums worden beheerd.

Er is geen database en er zijn geen sleutels nodig. Alle data staat als leesbare bestanden in deze repo; de API rekent bij elk verzoek uit wat er speelt. Ontwerp: `docs/ONTWERP.md`. Stand van het bouwwerk: `REGIE.md`.

## De startpagina (keuzepagina)

De startpagina `/` is een kaal keuzescherm: de bezoeker kiest of hij de kalender bekijkt op Infofrankrijk (website) of in InfoPoche (app), met daaronder de iCal-links per rubriek. De nieuwsbrief linkt hierheen met "Kalender Frankrijk →". De twee bestemmingen staan op één plek, in `lib/afnemers.js`, en wijzen sinds 2 november 2026 naar de pagina https://infofrankrijk.com/kalender-frankrijk/ en het scherm Kalender in InfoPoche (https://infopoche.fr/#/kalender). Na een wijziging daar draait u `npm run bouw`: dat genereert `public/index.html` uit `lib/afnemers.js` en de rubrieken in `lib/model.js` (script `scripts/maak-startpagina.js`). Commit het gegenereerde bestand mee; `npm test` faalt als het niet gelijk is aan wat het script maakt.

## WordPress-plugin

Voor Infofrankrijk.com (WordPress met Divi) staat er een plugin klaar die met de shortcode `[kalender_frankrijk]` de kalender toont: maand- en weekweergave, een filter per rubriek en een knop om de kalender in uw eigen agenda-app te zetten. De plugin leest alleen de openbare API van deze repo, in de browser van de bezoeker (geen PHP-aanroepen, geen opties-pagina, geen database). Uitleg in gewone taal voor de installatie: `wordpress/README.md`.

- **Waar de zip staat:** https://kalender-frankrijk.vercel.app/download/kalender-frankrijk.zip, altijd de laatste versie (de zip staat in `public/download/` en gaat mee in git).
- **Eerst bekijken:** https://kalender-frankrijk.vercel.app/pagina.html is de voorbeeldpagina met exact dezelfde JS en CSS op de achtergrond van Infofrankrijk (#f5f0eb).
- **Installeren:** zip uploaden via Plugins, Nieuwe plugin, Plugin uploaden; activeren; een pagina "Kalender Frankrijk" maken met slug `kalender-frankrijk` en daarin `[kalender_frankrijk]`. Voor een fiscale weergave `[kalender_frankrijk rubriek="fiscaal"]`; `weergave="week"` start in de weekweergave.
- **Bijwerken:** pas de bron aan in `wordpress/kalender-frankrijk/` (PHP, JS, CSS, readme.txt), verhoog het versienummer in de pluginkop van `kalender-frankrijk.php` (en `Stable tag` in `readme.txt`), draai `npm run bouw` en commit alles mee. `npm run bouw` kopieert JS en CSS naar `public/plugin/` (de voorbeeldpagina gebruikt die kopie, er is dus één bron) en schrijft de zip opnieuw, met vaste tijdstempels zodat dezelfde bron altijd dezelfde zip geeft. Upload daarna de nieuwe zip in WordPress; WordPress vraagt of de huidige versie vervangen mag worden. De data zelf werkt vanzelf bij.
- **Zodra de pagina op Infofrankrijk staat:** zet in `lib/afnemers.js` de bestemming `infofrankrijk` op https://infofrankrijk.com/kalender-frankrijk/ (staat daar als commentaar klaar) en draai `npm run bouw`.
- `npm test` bewaakt de plugin: pluginkop en shortcode, geschoonde attributen, scripts alleen in de shortcode, geen `innerHTML` en geen opslag in de browser, alleen `kfr-`-klassen, en dat de zip gelijk is aan de bron.

## Een datum toevoegen of aanpassen (via de GitHub-website)

U hoeft niets te installeren. Elke rubriek heeft één bestand in `data/rubrieken/`: `fiscaal.yaml`, `uitkeringen.yaml`, `feestdagen.yaml`, `school.yaml`, `wonen.yaml`, `buiten.yaml`, `zorg.yaml`, `stemmen.yaml`, `genieten.yaml` en `verenigingen.yaml`.

1. Ga op github.com naar de repo `antonnoe/kalender-frankrijk`, open de map `data`, dan `rubrieken`, en klik op het bestand van de rubriek.
2. Klik rechtsboven op het potloodje (Edit this file).
3. Kopieer een bestaand blok (van `- id:` tot en met de laatste regel van dat blok) en plak het onderaan, met een lege regel ertussen.
4. Pas het blok aan. Wijzig het `id` altijd: dat moet uniek zijn, bestaat uit kleine letters, cijfers en streepjes en blijft daarna altijd gelijk (abonnees in hun agenda houden zo hun afspraak).
5. Klik op "Commit changes", laat "Commit directly to the main branch" staan en bevestig.
6. Na een minuut of twee staat er bij de commit een groen vinkje of een rood kruis. Bij een rood kruis: klik erop, dan op "Details" bij "Controle van de data". De melding noemt het bestand en het regelnummer, bijvoorbeeld `genieten.yaml regel 42: datum 31-11-2026 bestaat niet`. Verbeter dat en sla opnieuw op. Wat er dan gebeurt: Vercel bouwt gewoon door, maar een blok met een fout wordt overgeslagen (de rest blijft werken), `/api/status` meldt `ok: false` met de fout, en de GitHub-controle geeft een rood kruis met dezelfde melding. Een fout blok verschijnt dus pas weer in de agenda en de nieuwsbrief als u het hebt verbeterd.
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
| `titel` | kort, Nederlandse zinsopbouw, kleine letters (behalve namen). Een lang streepje (— of –) in titel of tekst is een rode fout: gebruik een komma |
| `rubriek` | `fiscaal`, `uitkeringen`, `feestdagen`, `school`, `wonen`, `buiten`, `zorg`, `stemmen`, `genieten`, `verenigingen` |
| `doelgroepen` | een of meer van `iedereen`, `particulier`, `ondernemer`, `gepensioneerde`, `pas-verhuisd`, `gezin`, `huiseigenaar`, `huurder`, `automobilist`, `kustbewoner` |
| `wanneer` | zie hieronder |
| `aftellen` | op hoeveel dagen vooraf het item terugkomt, bijvoorbeeld `[14, 7, 1]`. Weglaten mag: een fiscale of stem-deadline krijgt dan 14, 7 en 1, andere items krijgen geen aftelling. Bij een periode gaat het om dagen vóór het begin; bij een feestdag telt `0` voor de dag zelf |
| `gebied` | een vaste lijst: `heel Frankrijk`, `zone A`, `zone B`, `zone C`, `Elzas-Moezel`, `Nederland`, `bergdepartementen`, `kust`, of een lijst departementsnummers zoals `[11, 34]`. Weglaten betekent heel Frankrijk. Items uit de verenigingsagenda krijgen automatisch het departement uit de postcode (vijf cijfers) in de plaats of titel; Corsica 20000 tot 20199 is `2A`, 20200 tot 20699 is `2B`; geen postcode, meer dan één departement of een onbekende postcode laat het gebied op `heel Frankrijk`, en dat betekent bij verenigingsitems: onbekend. Een andere waarde (bijvoorbeeld `Lyon`) is een rode fout; gebruik dan het departementsnummer `[69]` |
| `tekst` | één neutrale zin zonder je of u. Alleen waar dat stroef wordt: `tekst_je` (nieuwsbrief, InfoPoche) en `tekst_u` (Infofrankrijk) |
| `link` | bij voorkeur het artikel op Infofrankrijk |
| `bron` | `{url: ..., gecontroleerd: JJJJ-MM-DD}`, allebei verplicht |
| `status` | `vastgesteld` of `te_verifieren`. Te verifiëren komt alleen in de agenda-feeds (met de toevoeging "(te verifiëren)"), nooit in de API-lijst, de nieuwsbrief, InfoPoche of de pagina |
| `toon_in` | lijst met `nieuwsbrief`, `pagina`, `infopoche`. Ook `toon in` met een spatie wordt begrepen |
| `groep` | optioneel: items die bij elkaar horen (de nieuwsbrief noemt ze in één regel) |
| `soort` | optioneel: `datum`, `periode`, `seizoen`, `banner` of `mijlpaal`. Weglaten: een periode als `wanneer` een periode is, anders een datum |
| `gesprek` | `ja` of `nee`. Weglaten: ja bij seizoen en mijlpaal, nee bij de rest. Bij `ja` krijgt het item de link "Bespreek op het forum" |
| `tijd` | optioneel, bijvoorbeeld `"18:00-19:30"` |
| `datum_zeker` | optioneel, `ja` of `nee`. Weglaten: ja. `nee` bij een geschatte of gebruikelijke datum die de organisator nog niet bevestigde (de titel eindigt dan op "(waarschijnlijke datum)", de controle eist dat). De API levert `datum_zeker: true` of `false`; InfoPoche toont bij `false` "Gebruikelijke datum, nog niet bevestigd door de organisator." in plaats van "Gecontroleerd op ..." |

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
| `GET <adres>/api/vandaag?datum=JJJJ-MM-DD` | de regels voor "Vandaag in het kort" en de feestbanner; zonder datum vandaag in Europe/Paris. De banner van nlfr-menu (gaat Café Jeudi door?) wordt bij elke aanroep live gelezen, met een tijdslimiet van 3 seconden en als terugval de nachtelijke kopie; de header `x-cafe-jeudi` zegt `live` of `kopie`. Een ja op donderdagochtend werkt dus direct door (cache: 1 minuut). Vorm: `{datum, banner: {tekst_nl, tekst_fr, kleur} of null, regels: [{soort, kop, titel, tekst, link, rubriek, beeld_url, gesprek, forum_url, id}], weggelaten: [...]}`. Hooguit vier regels. Extra: `nieuws_links=url1,url2` laat items weg die de nieuwsbrief al als nieuws toont. Veld `naamdag`: `{namen: [...], tekst: "Bonne fête aux Théodore"}` (hooguit drie namen) of `null`: op een Franse wettelijke feestdag (de feestdagen uit `data/bron/feestdagen.json`), bij een ontbrekend of onleesbaar bestand en bij elke fout is het `null`. De naamdag telt niet mee in de vier regels. Veld `maan` (additief, 9 november 2026): `{fase, naam}` of `null` bij een fout; `fase` is een van `nieuwe-maan`, `wassende-sikkel`, `eerste-kwartier`, `wassende-maan`, `volle-maan`, `afnemende-maan`, `laatste-kwartier`, `afnemende-sikkel` (noordelijk halfrond), `naam` de Nederlandse naam. Een hoofdfase geldt op de Franse kalenderdag waarop het moment valt, de andere dagen krijgen de tussenfase na de laatste hoofdfase. Berekend in `lib/maan.js` (Meeus, Astronomical Algorithms, hoofdstuk 49, geen pakket, geen bestand). Gecontroleerd tegen IMCCE (Observatoire de Paris, dag van elke hoofdfase 2026 en 2027) en het U.S. Naval Observatory (moment op de minuut): alle 58 hoofdfasen van november 2026 tot en met december 2027 liggen binnen 1 minuut van de USNO en op dezelfde dag als IMCCE (`test/fixtures/maanfasen.json`, `test/maan.test.js`) Optionele parameter `dep` (alleen InfoPoche gebruikt hem; de nieuwsbrief stuurt hem niet en krijgt dus exact het oude antwoord): `dep=NN` (departementsnummer, ook `2A`, `2B`, `971` tot `976`, `984` tot `988`) laat verenigingsactiviteiten alleen meetellen als hun gebied dat departement bevat, `dep=geen` laat alle verenigingsactiviteiten weg, en een verenigingsactiviteit zonder bekend departement telt met `dep` nooit mee. Café Jeudi blijft altijd. Een ongeldige waarde (leeg, `20`, `abc`, dubbel opgegeven) wordt behandeld als `dep=geen`. De regel die vrijkomt wordt niet apart aangevuld: de selectie (aftellingen, periode, seizoenstip) is dezelfde als zonder parameter, dus er komt een regel bij alleen als de bestaande selectie er een heeft. De cache (CDN en browser) werkt op de volledige URL, dus elke `dep` heeft zijn eigen antwoord |
| `GET <adres>/api/items?van=&tot=&rubriek=&doelgroep=&toon_in=&status=` | alle vastgestelde items (eigen kalender plus ingelezen bronnen) met per item de berekende data binnen het bereik in `voorkomens`. Filters mogen meerdere waarden hebben, gescheiden door komma's; `doelgroep` telt `iedereen` altijd mee. Zonder bereik: de komende 60 dagen. Standaard alleen items met status `vastgesteld`: een afnemer toont nooit een ongecontroleerde datum; `status=alle` geeft ook `te_verifieren` mee (voor beheer), `status=te_verifieren` alleen die. De iCal-feeds nemen te verifiëren items wél mee, met de toevoeging "(te verifiëren)" in de titel. Banners (feestperiodes voor de nieuwsbrief) staan hier niet in: het zijn geen afspraken. Dezelfde dag met dezelfde of gelijkwaardige titel uit verschillende bronnen is één item (zie Ontdubbelen) |
| `GET <adres>/api/status` | per bron de leeftijd van de kopie, het aantal vastgestelde items per rubriek in de komende 60 dagen (`items_komende_60_dagen_per_rubriek`), apart het aantal te verifiëren items (`items_komende_60_dagen_te_verifieren`), het aantal samengevoegde dubbelen (`ontdubbeld`), `ok` en `fouten`, en waarschuwingen (bron te oud, bron mislukt, rubriek met minder dan vijf items) |
| `GET <adres>/api/rubrieken` | de tien rubrieken met kleur en beeld |
| `GET <adres>/beeld/<rubriek>.png` en `.svg` | het themabeeld (PNG 112 x 112 voor e-mail, SVG voor het web) |

Een regel in `/api/vandaag` heeft `soort` `vandaag`, `aftelling`, `periode` of `tip`. De kop is kant-en-klaar, bijvoorbeeld "Over 14 dagen, maandag 16 november." De selectieregels (volgorde, maximum, doorschuiven van periodes, seizoenstip) staan in `docs/ONTWERP.md` onder f en l en in `lib/engine.js`.

## Agenda's om te abonneren (iCal)

| Adres | Inhoud |
|---|---|
| `<adres>/ical/alles.ics` | alles |
| `<adres>/ical/<rubriek>.ics` | één rubriek, bijvoorbeeld `<adres>/ical/genieten.ics` of `<adres>/ical/feestdagen.ics` |
| `<adres>/ical/fiscaal-particulier.ics` | fiscale data voor particulieren (Frankrijk) |
| `<adres>/ical/fiscaal-ondernemer.ics` | fiscale data voor ondernemers (Frankrijk) |
| `<adres>/ical/fiscaal-nederland.ics` | Nederlandse fiscale data |

De drie fiscale subfeeds heten overal `fiscaal-particulier`, `fiscaal-ondernemer` en `fiscaal-nederland`. Alleen het inlezen van de bron bij Infofrankrijk gebruikt de naam `professionnel` (`?if_fc_ical=professionnel`); dat is dezelfde groep als `fiscaal-ondernemer`.

Abonneren: in Google Agenda via "Andere agenda's" en dan "Via URL"; in Apple Agenda via Archief en dan "Nieuw agenda-abonnement". De afspraken hebben een vaste UID (id plus begindatum), dus een nieuwe build maakt geen dubbele afspraken. De feeds beslaan het lopende jaar en de twee jaren erna. Items met status te verifiëren staan erin als voorlopig, met de toevoeging "(te verifiëren)". Banners staan er niet in. Café Jeudi is één wekelijkse afspraak (één afspraak met een herhaalregel in plaats van een losse afspraak per week), met in de omschrijving "Gaat niet door in weken zonder aankondiging op nederlanders.fr".

## Waar de data vandaan komt

De eigen jaarkalender staat in `data/rubrieken/`. De rest wordt ingelezen en bewaard als laatste kopie in `data/bron/`:

| Bron | Bestand | Wat eruit komt |
|---|---|---|
| calendrier.api.gouv.fr (metropole en alsace-moselle) | `feestdagen.json` | wettelijke feestdagen, drie jaar vooruit |
| data.education.gouv.fr, fr-en-calendrier-scolaire | `schoolvakanties.json` | schoolvakanties zones A, B en C |
| Google openbare feestdagkalenders Frankrijk en Nederland | `google-fr.ics`, `google-nl.ics` | alleen aanvulling (gedenkdagen), nooit de enige bron voor een wettelijke feestdag |
| de drie fiscale feeds van Infofrankrijk | bestanden `fiscaal-particulier.ics`, `fiscaal-professionnel.ics`, `fiscaal-nederland.ics` (de middelste is de ondernemersfeed, in de iCal-uitvoer `fiscaal-ondernemer`) | fiscale data FR en NL, AOW-betaaldagen |
| verenigingen-kalender | `verenigingen.json` | activiteiten van verenigingen (Café Jeudi wordt overgeslagen). Bij het inlezen worden lange streepjes komma's en titels in HOOFDLETTERS zinsopbouw (afkortingen blijven staan). Staat er in `bron` geen webadres (bijvoorbeeld "vast ritme (automatisch gegenereerd)"), dan wordt de website van de vereniging de bron-url en gaat de tekst naar `opmerking`; tekst staat nooit in een url-veld |
| nlfr-menu /api/banner | `cafe-jeudi.json` | of Café Jeudi deze week doorgaat |
| Wikidata (eigenschap P1750, land Frankrijk, CC0), 12 dagen aangevuld uit fr.wikipedia "Calendrier des saints en France" (CC BY-SA 4.0) | `data/naamdagen.json` (eenmalig gemaakt, niet in de dagelijkse workflow) | de naamdag ("Bonne fête aux ...") in `/api/vandaag` |

Bronvermelding naamdagen: Naamdagen: Wikidata (CC0), aangevuld met Wikipedia ["Calendrier des saints en France"](https://fr.wikipedia.org/wiki/Calendrier_des_saints_en_France) (CC BY-SA 4.0). Het bestand `data/naamdagen.json` heeft per dag `MM-DD` de voornamen en de bron (`wikidata` of `wikipedia`), met de opvraagdatum en de Wikipedia-versie (oldid) in de kop. Opnieuw maken kan met `npm run naamdagen`; dat is zelden nodig, de lijst verandert niet.

De fiscale feeds worden niet aangepast: `data/verrijking-fiscaal.yaml` geeft ze op titelpatroon een rubriek, doelgroep, uitleg, link en aftelling (de eerste regel waarvan het patroon past, wint). Bij het inlezen worden lange streepjes in titels komma's en dubbele items op dezelfde dag samengevoegd.

### Ontdubbelen over bronnen

Dezelfde dag met dezelfde of gelijkwaardige titel komt maar één keer voor. Titels worden vergeleken in kleine letters, zonder accenten en leestekens, en via bekende vertaalparen (Jour de Noël is Eerste kerstdag, Jour de l'an is Nieuwjaarsdag, Ascension is Hemelvaartsdag, Vendredi saint is Goede Vrijdag, Lundi de Pâques is Paasmaandag, Fête nationale is 14 juillet, Christmas Eve is Kerstavond, enzovoort; de lijst staat in `lib/ontdubbel.js`). Voorrang: eigen item, dan de officiële bron (calendrier.api.gouv.fr), dan Google (de Nederlandse kalender vóór de Franse, die Engelse titels heeft). Het gebied van het verliezende item wordt bij de winnaar opgeteld (bijvoorbeeld heel Frankrijk en Nederland). Een titel als "Tweede kerstdag vrij in Elzas-Moezel" neemt de officiële dag over, maar niet Nederland. Activiteiten van verschillende verenigingen met gelijke titel op dezelfde dag blijven apart en krijgen de verenigingsnaam in de titel als die ontbreekt. De feestbanner is geen item en doet niet mee. Ondernemersitems staan standaard alleen op de pagina, niet in de nieuwsbrief.

### Verversen

`npm run bronnen` haalt alle bronnen op. Dat gebeurt elke dag om 04:30 UTC in de GitHub Action `bronnen.yml`, die alleen een commit maakt als er iets veranderd is. In `data/bron/status.json` staat per bron de datum van de laatste geslaagde ophaling. Een kopie wordt niet vervangen als het antwoord er verdacht uitziet (geen kalender, veel minder items dan eerder).

### Wat er gebeurt als een bron uitvalt

De laatste kopie blijft staan en blijft werken; de run en de build blijven groen. `/api/status` laat per bron zien hoe oud de kopie is en meldt de oorzaak van de laatste mislukte poging. De Google-kalenders zijn aanvulling, dus zonder hen mist hooguit een gedenkdag. Valt de banner van nlfr-menu weg en bestaat er nooit een kopie, dan geldt de vaste regel: elke donderdag 18.00 tot 19.30 uur.

## Voor beheerders van de techniek

```
npm install
npm run controleer     # controleert alle data, met meldingen in gewoon Nederlands (bestand en regelnummer, ook bij een YAML-fout)
npm test               # alle tests, zonder netwerk (fixtures in test/fixtures)
npm run bronnen        # haalt de bronnen op (achter een proxy: NODE_USE_ENV_PROXY=1 npm run bronnen)
npm run beelden        # maakt de themabeelden in public/beeld opnieuw
npm run bouw           # genereert de startpagina public/index.html uit lib/afnemers.js, kopieert de plugin-JS en CSS naar public/plugin/ en maakt public/download/kalender-frankrijk.zip
npm run lokaal         # lokale server op poort 3000 met dezelfde routes als op Vercel
```

Vercel: importeer de repo als project, zonder instellingen. `vercel.json` voegt de data toe aan de functies en maakt van `/ical/<naam>.ics` een route. Elke push naar main bouwt opnieuw. Bij een rode controle in GitHub bouwt Vercel gewoon door: een blok met een fout wordt overgeslagen, `/api/status` meldt `ok: false` met de fout, en de GitHub-controle geeft een rood kruis met de melding. Er is dus geen vangnet dat de vorige versie vasthoudt; verbeter de melding snel.

```
api/                 de Vercel-functies (dunne laag)
lib/                 model en controle (model.js), datumregels (datum.js), inlezen (bronnen.js, verrijking.js),
                     ontdubbelen (ontdubbel.js), live banner (banner.js), rekenen en selectie (engine.js),
                     iCal (ical.js), routes (api.js)
data/rubrieken/      de eigen jaarkalender, één bestand per rubriek
data/verrijking-fiscaal.yaml
data/naamdagen.json   naamdag per dag (Wikidata, aangevuld uit Wikipedia)
lib/maan.js           maanstand per dag, berekend (Meeus)
data/bron/           laatste kopie van elke externe bron, plus status.json
public/beeld/        themabeelden (PNG en SVG)
scripts/             controleer, bronnen, themabeelden, lokale server, bouw-plugin (zip)
wordpress/           de WordPress-plugin (bron) en haar handleiding
test/                tests en fixtures
```

## Afhankelijkheden

Twee pakketten, beide met een vaste versie: `yaml` (leest de gegevensbestanden, in productie) en `sharp` (alleen om de themabeelden te maken met `npm run beelden`, draait niet op Vercel). Bijgewerkt op 2 november 2026 vanwege vier meldingen: `yaml` 2.8.1 naar 2.9.1 en `sharp` 0.34.4 naar 0.35.5. Geen `overrides` nodig. Een nieuwe `sharp` kan PNG's opleveren die één byte afwijken met identieke pixels; commit die dan niet, de bestaande beelden blijven staan.

## Bekende beperkingen

- De bosbrandwaarschuwing is nog niet gekoppeld (bouwplan taak 7); selectieregel 7 uit het ontwerp is dus nog niet actief.
- Vooraf invullen van het forumformulier kon niet worden getoetst, zie `docs/FORUMLINK.md`. De pagina toont per item een kant-en-klare aanzet (`forum_aanzet`).
- De fiscale feed voor particulieren heeft voor 2027 nog weinig items; `/api/status` waarschuwt zodra een rubriek minder dan vijf items in de komende 60 dagen heeft.
