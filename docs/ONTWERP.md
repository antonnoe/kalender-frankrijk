# Kalender Frankrijk, gebruiksontwerp

Stand 2 november 2026. Ontwerp vóór de bouw, geen productiecode. Bijbehorende mock-up: MOCKUP.html in dezelfde map.

## a. Wat het is

Eén kalender met alle data die ertoe doen voor Nederlanders en Belgen in Frankrijk: belastingen, feestdagen, schoolvakanties, uitkeringen, seizoen, verenigingen.
De data staan als bestanden in één repo; de nieuwsbrief, Infofrankrijk en later InfoPoche lezen dezelfde bron.
De fiscale kalender blijft bestaan en wordt een rubriek, zonder dat iets dubbel wordt beheerd.

## b. Gebruikersreizen

| | Lezer van de nieuwsbrief | Bezoeker van de pagina op Infofrankrijk | Opdrachtgever |
|---|---|---|---|
| Wil | in tien seconden weten wat vandaag speelt en wat eraan komt | per onderwerp vooruitkijken en data in de eigen agenda zetten | een eigen datum toevoegen of een seizoenstip aanpassen |
| Ziet | bovenaan het blok "Vandaag in het kort", 2 tot 4 regels met pictogram, en in feestperiodes een dunne feestbanner boven de kop | kop, rubriekchips, lopende periodes, de komende 30 dagen per dag, per rubriek een agendaknop | het bestand van de rubriek op de GitHub-website, één blok per datum, en na opslaan een groen of rood vinkje met uitleg in gewoon Nederlands |
| Volgende stap | doorklikken naar het artikel of de officiële bron, of "neem de kalender mee in je agenda" | rubriek of doelgroep kiezen, iCal-knop, doorklikken naar artikel en bron | niets: de API en de agenda's zijn binnen enkele minuten bij, de nieuwsbrief neemt het de volgende ochtend mee |
| Blijft vrij | elke regel linkt door; niets verplicht, geen account | kiest zelf rubrieken en doelgroep (onthouden in de browser), neemt één, enkele of alle agenda's; abonneren werkt in elke agenda-app | tekst en opmaak vrij, alinea's mogen; later hetzelfde via een invulscherm in Cockpit |

## c. Rubrieken

Kleur volgt het InfoPoche-thema (modules.json, `themas`), pictogram uit `ICONEN` van nieuws-lib.js; vier eigen pictogrammen in dezelfde stijl (76 x 76, lijn 4, ronde uiteinden), gemarkeerd met *.

| # | Rubriek | Themabeeld | Drie voorbeelden |
|---|---|---|---|
| 1 | Fiscale kalender | geld #1B6B3A, munt | IFI uiterste betaaldatum 16 november; 11e maandafschrijving PAS 16 november; taxe d'habitation, aanmelden voor afschrijving op de vervaldatum 30 november |
| 2 | Uitkeringen en pensioen | overheid #1D4F9E, kalenderblad* | AOW uitbetaald 23 november (SVB); basispensioen Assurance retraite op de rekening; actualisatie France Travail |
| 3 | Feestdagen en ponts | nieuws #9E4505, vlag* | 11 novembre (wapenstilstand); Noël 25 december, in Elzas-Moezel ook 26 december; Ascension donderdag 6 mei 2027 met pont op vrijdag 7 mei |
| 4 | School en gezin | ondernemen #0E5B66, boek* | einde herfstvakantie 2 november (A, B, C); kerstvakantie 19 december tot 4 januari; voorjaarsvakantie zone C 3 tot 19 april 2027 |
| 5 | Wonen en seizoen | wonen #800000, huis | trêve hivernale 1 november tot 31 maart; ramonage vóór het stookseizoen; taxe foncière-maand oktober |
| 6 | Buiten en onderweg | taal #465C70, weg | winterbanden of kettingen in bergdepartementen (loi Montagne) 1 november tot 31 maart; wintertijd 25 oktober, zomertijd 28 maart 2027; jachtseizoen, bosbrandwaarschuwing alleen in seizoen |
| 7 | Zorg | gezondheid #B3261E, hart | CAK-jaarafrekening; S1-momenten bij verhuizing of pensionering; griepvaccinatiecampagne |
| 8 | Stemmen en Nederland | overheid #1D4F9E, gebouw | verkiezing kiescollege niet-ingezetenen maart 2027 met inschrijfdeadline; presidentsverkiezing 18 april en 2 mei 2027 (alleen voor wie de Franse nationaliteit heeft); bekendmaking woonlandfactor 2027 |
| 9 | Uitgaan en genieten | ervaring #775800, glas* | Beaujolais nouveau 19 november; Noël en Saint-Sylvestre tijdig reserveren; soldes d'hiver vanaf 6 januari 2027 |
| 10 | Verenigingen en ontmoeting | adressen #6B3FA0, mensen | Café Jeudi elke donderdag 18.00 tot 19.30; jeu de boules NedAzur, Saint-Paul-de-Vence 2 november; Sinterklaasfeest NLVP Parijs 29 november |

Feestbanners zijn geen rubriek maar een soort item (zie e en f).

## d. Bronnenregister

| Bron | Wat eruit komt | Licentie of grondslag | Hoe | Verversing | Terugval |
|---|---|---|---|---|---|
| calendrier.api.gouv.fr (metropole, alsace-moselle) | wettelijke feestdagen, Elzas-Moezel met Goede Vrijdag en 26 december | Licence Ouverte Etalab 2.0 | automatisch | wekelijks, 2 jaar vooruit | laatste kopie; feestdagen zijn ook zelf te berekenen (vaste data plus Pasen) |
| data.education.gouv.fr, fr-en-calendrier-scolaire | schoolvakanties zones A, B, C | Licence Ouverte | automatisch | wekelijks | laatste kopie; controle tegen Service-Public F31952 bij de jaarronde |
| Google openbare feestdagkalenders FR en NL (iCal) | gedenkdagen als wintertijd, Sinterklaasavond, Saint-Sylvestre | gebruiksvoorwaarden Google, alleen feiten overnemen | automatisch | wekelijks | laatste kopie; alleen aanvulling, nooit enige bron voor een feestdag |
| Fiscale kalender Infofrankrijk, drie iCal-feeds (particulier, professionnel, nederland) | fiscale data FR en NL, AOW-betaaldagen | eigen werk, onderliggend DGFiP (informatie publique) | automatisch | dagelijks | laatste kopie in de repo |
| verenigingen-kalender (verenigingen.json) | activiteiten van verenigingen | eigen werk, bron per activiteit | automatisch | dagelijks | laatste kopie, activiteiten in het verleden vallen vanzelf weg |
| nlfr-menu /api/banner | Café Jeudi, aan of uit per week, link | eigen werk | automatisch | dagelijks | vaste regel: elke donderdag 18.00 tot 19.30 |
| Bosbrandtool (repo nog te vinden) | actuele waarschuwing per departement | eigen werk, onderliggend Météo-France | automatisch, alleen 1 juni tot 30 september | dagelijks | niets tonen; een verouderde brandwaarschuwing is erger dan geen |
| Google Trends dagelijkse trends FR (RSS) | wat Frankrijk vandaag zoekt | gebruiksvoorwaarden Google, vermelding "Bron: Google Trends" | automatisch | dagelijks | niets |
| Google News RSS NL-FR | signaal voor de redactie, nooit gepubliceerd | idem | automatisch | dagelijks | niets |
| Service-Public F1939, Kiesraad | verkiezingsdata FR en NL, inschrijfdeadlines | Licence Ouverte; overheidsinformatie | jaarlijks met de hand | jaarronde december | blijft staan tot de jaarronde |
| Service-Public A15359, lassuranceretraite.fr, agirc-arrco.fr | France Travail- en pensioenbetaaldata | feiten, eigen woorden | jaarlijks met de hand | december | idem |
| parcoursup.gouv.fr, onf.fr | Parcoursup-kalender, jachtseizoen | feiten, eigen woorden | jaarlijks met de hand | bij publicatie | idem |
| Code de commerce, EU-richtlijn zomertijd, culture.gouv.fr | soldes, zomer- en wintertijd, Journées du patrimoine, Fête de la musique | wet en feiten, berekenbaar | regel in de data | geen | berekening |
| parisjetaime.com, france.fr | uitleg feestdagen en ponts, grote evenementen | alleen als tekstbron, feiten in eigen woorden, geen links naar aggregators | jaarlijks met de hand | december | idem |
| rijksoverheid.nl (open data) | NL schoolvakanties en feestdagen | CC0 | automatisch mogelijk | jaarlijks | laatste kopie |
| Maanfasen | nieuwe en volle maan | astronomische berekening | berekend | geen | berekening |
| SHOM getijden | | strenge hergebruiksvoorwaarden | niet overnemen | | alleen een link voor kustbewoners |

Gecontroleerd op 2 november 2026: calendrier.api.gouv.fr (2026 en Elzas-Moezel 2027), beide Google-kalenders, Trends-RSS, de drie fiscale feeds, verenigingen.json, /api/banner, F31952 en F1939 (service-public.fr verwijst nu door naar service-public.gouv.fr).

## e. Datamodel

Elke datum is één blok in het bestand van zijn rubriek. Velden in gewone woorden:

- **id**: korte unieke naam, blijft altijd gelijk (abonnees in agenda's houden zo hun afspraak).
- **titel**: kort, Nederlandse zinsopbouw, kleine letters.
- **rubriek** en **doelgroepen**: een of meer uit particulier, ondernemer, gepensioneerde, pas verhuisd, gezin met kinderen, huiseigenaar, huurder, automobilist, kustbewoner, of iedereen.
- **wanneer**: een datum, of een periode met begin en einde. Herhaling als regel: `jaarlijks 11-11`, `derde donderdag van november`, `laatste zondag van maart`, `pasen +1` (Paasmaandag), `pasen -2` (Goede Vrijdag), of een vaste lijst data per jaar. Pasen rekent het systeem zelf uit.
- **aftellen**: lijst van dagen vooraf waarop het item terugkomt, bijvoorbeeld 30, 14, 7, 1. Standaard voor een deadline 14, 7, 1; nooit alleen de dag zelf. Bij een periode: melding op de begindag, en valt die op zondag of een feestdag, ook op de eerste werkdag daarna.
- **gebied**: heel Frankrijk, zone A, B of C, departementen, Elzas-Moezel, of Nederland.
- **tekst**: één neutrale zin zonder je of u. Alleen waar dat stroef wordt een eigen `tekst_je` (nieuwsbrief, InfoPoche) en `tekst_u` (Infofrankrijk).
- **link**: bij voorkeur het Infofrankrijk-artikel; **bron** met url en datum van controle.
- **status**: vastgesteld of te verifiëren. Te verifiëren komt wel op de pagina (met label), nooit in de nieuwsbrief.
- **toon in**: nieuwsbrief, pagina, InfoPoche (elk ja of nee).
- **groep** (optioneel): items die bij elkaar horen, zoals IFI per post en IFI online; de nieuwsbrief noemt ze in één regel.
- Soort **banner** voor feestperiodes: periode, tekst NL en FR, kleur.

Voorbeeldregel (bestand `data/rubrieken/genieten.yaml`):

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
  toon in: [nieuwsbrief, pagina, infopoche]
```

**Fiscale feeds zonder dubbel beheer.** De plugin op Infofrankrijk blijft de plek waar fiscale data worden beheerd. Kalender Frankrijk haalt de drie feeds dagelijks op, bewaart een kopie in de repo en verandert geen datum. Verrijking gebeurt met een kleine lijst regels op titelpatroon in `data/verrijking-fiscaal.yaml`, niet per item: "IFI" krijgt doelgroep huiseigenaar, een uitleg in gewoon Nederlands en de link naar het IFI-artikel; "AOW" gaat naar rubriek Uitkeringen en pensioen; alle professionnel-items krijgen doelgroep ondernemer en staan standaard niet in de nieuwsbrief. Ongeveer dertig regels dekken de 552 items. Bij het inlezen worden lange streepjes in titels komma's, worden dubbele items op dezelfde dag samengevoegd (twee keer "Btw-plichtige ondernemingen" op 13 november) en wordt Café Jeudi uit verenigingen.json overgeslagen omdat de banner van nlfr-menu leidend is.

## f. Selectieregels "Vandaag in het kort"

1. **Volgorde**: vandaag (Café Jeudi op donderdag, verenigingsactiviteiten van vandaag, samen hooguit één regel), dan deadlines met aftelling (hooguit twee, dichtstbijzijnde eerst), dan één periode die begint, dan één seizoenstip.
2. **Aantal**: hooguit vier regels, minimaal één. Wat niet past schuift een dag op (de tweede periode van 1 november, winterbanden, komt op 3 november); vast berekend uit de datum, zonder geheugen.
3. **Aftelling** in de regel zelf: "Over 14 dagen, maandag 16 november". Alleen op de aftelmomenten van het item, dus geen dagelijkse herhaling.
4. **Niets te melden**: alleen de seizoenstip; is ook die er niet, dan verdwijnt het blok. Geen opvulzin.
5. **Dubbel voorkomen**: per groep één regel; per dag samenvoegen op gelijke titel; Café Jeudi uit één bron; een item dat de nieuwsbrief elders al als nieuws toont (zelfde link) vervalt hier.
6. **Doelgroep**: alleen items voor iedereen, particulieren, gepensioneerden, huiseigenaren, huurders, automobilisten; ondernemersitems alleen als "toon in nieuwsbrief" expliciet aan staat. Status te verifiëren nooit.
7. **Bosbrand**: alleen 1 juni tot 30 september en alleen bij een actuele waarschuwing van de bosbrandtool; dan gaat hij boven alles.
8. **Feestbanner**: een periode (Nieuwjaar 1 tot 6 januari, Pasen van Goede Vrijdag tot Paasmaandag, Koningsdag, 14 juillet, Sinterklaas, Kerst); hooguit één tegelijk, de kortste periode wint. Buiten een periode geen banner.

## g. Architectuur

- **Repo** antonnoe/kalender-frankrijk: `data/rubrieken/*.yaml` (eigen jaarkalender, één bestand per rubriek), `data/verrijking-fiscaal.yaml`, `data/bron/` (laatste kopie van elke externe bron).
- **Ophalen**: een GitHub Action haalt dagelijks de automatische bronnen op en commit alleen bij verandering. Valt een bron weg, dan blijft de laatste kopie staan en meldt `/api/status` welke bron hoe oud is.
- **Op Vercel**, gebouwd bij elke push: `/api/vandaag?datum=` (blok en banner voor de nieuwsbrief, kant-en-klare regels), `/api/items?van=&tot=&rubriek=&doelgroep=` (JSON voor pagina en InfoPoche), `/ical/<rubriek>.ics` plus `/ical/alles.ics` en drie fiscale subfeeds, `/beeld/<rubriek>.png` en `.svg` (e-mail toont geen SVG), `/api/status`.
- **Nieuwsbrief** (nlfr-nieuwsbrief): vraagt bij het samenstellen `/api/vandaag` op en tekent alleen; de keuze wat erin komt zit in Kalender Frankrijk. Geen antwoord, dan geen blok, de nieuwsbrief gaat gewoon uit.
- **Infofrankrijk**: pagina "Kalender Frankrijk" die `/api/items` leest (zie besluit 2); de bestaande pagina van de fiscale kalender en zijn iCal-adressen blijven werken.
- **InfoPoche**: later een scherm Kalender op dezelfde `/api/items`, met dezelfde themabeelden.
- **Sleutels**: geen. Alle bronnen zijn openbaar, de API is openbaar en leest alleen. Pas het invulscherm in Cockpit heeft één GitHub-sleutel nodig, beperkt tot schrijven in deze ene repo.

## h. Beheer

- Op de GitHub-website het bestand van de rubriek openen, potloodje, een blok kopiëren en aanpassen, opslaan op main.
- Bij elke push controleert een test: verplichte velden, bestaande rubriek en doelgroep, geldige datum of regel, unieke id, bron met datum. Fout: rood kruis met melding als "genieten.yaml regel 42: datum 31-11-2026 bestaat niet". De vorige versie blijft dan live, er breekt niets.
- Een jaarlijkse Action opent in december een checklist (issue) met alle handmatige bronnen voor het nieuwe jaar.
- Later: invulscherm in Cockpit met dezelfde velden als keuzelijsten, dat het blok voor de opdrachtgever in de repo schrijft.

## i. Bouwplan

Elke taak los te bouwen en live te keuren. Eerste oplevering met waarde: taak 1 tot en met 4.

1. **Repo, datamodel en controle**. Eisen: een blok met fout veld geeft een rode controle met bestand en regelnummer; een correct blok is binnen vijf minuten in de API.
2. **Bronnen inlezen**: feestdagen (metropole en Elzas-Moezel), Google FR en NL, schoolvakanties, drie fiscale feeds met verrijking, verenigingen, Café Jeudi. Eisen: alle 552 fiscale items aanwezig, geen lang streepje in titels, geen dubbele items per dag; een bron die uitvalt laat de build groen met waarschuwing in `/api/status`.
3. **Eigen jaarkalender** november 2026 tot en met december 2027, gevuld door Claude, elk item met bron en status. Eisen: elke rubriek minstens tien items; alle data met een regel (derde donderdag, Pasen) kloppen voor 2026 en 2027.
4. **API, iCal per rubriek en themabeelden**. Eisen: elke iCal laat zich abonneren in Google Agenda en Apple Agenda; id's blijven gelijk na een nieuwe build; PNG en SVG per rubriek.
5. **"Vandaag in het kort" en feestbanner** in de nieuwsbrief. Eisen: proef over 2 tot en met 15 november 2026 toont nooit meer dan vier regels, IFI komt op 2, 9 en 15 november en niet op andere dagen, winterbanden op 3 november; bij een kalender die niet antwoordt gaat de nieuwsbrief zonder blok uit.
6. **Pagina op Infofrankrijk**. Eisen: werkt op 390 en 1000 px, filters onthouden in de browser, fiscale kalender zichtbaar als rubriek, ondernemersitems achter de chip Ondernemer.
7. **Bosbrand** koppelen na het vinden van de repo. Eisen: buiten seizoen nooit zichtbaar; zonder actuele waarschuwing nooit zichtbaar.
8. **Invulscherm in Cockpit**; daarna **InfoPoche-scherm**.

## j. Besluiten voor de opdrachtgever

1. **Waar wonen de fiscale data na 2026?** (A) blijven in de WordPress-plugin, de kalender leest en verrijkt; (B) verhuizen naar de repo, de plugin leest dan de kalender. Advies A nu en B bij het vullen van 2027, want de particulierenfeed heeft voor 2027 nog geen enkel item en dat werk kan dan meteen op de toekomstbestendige plek.
2. **Hoe komt de pagina op Infofrankrijk?** (A) iframe; (B) kleine plugin met shortcode die de API leest en een kopie bewaart. Advies B, want alleen dan telt de pagina mee in Google en past hij in de opmaak van Infofrankrijk.
3. **Google Trends in de nieuwsbrief?** (A) ja, één regel "Frankrijk zoekt vandaag" met filter; (B) alleen als signaal voor de redactie. Advies B, want de trends van vandaag (sport, presentatoren, beurskoersen) raken de doelgroep zelden en vragen dagelijks een oordeel.

## k. Toekomstbestendigheid en risico's

- Data als leesbare bestanden in GitHub, geen database, geen sleutels: werkt ook als Vercel, WordPress of een externe bron wegvalt (laatste kopie).
- Grootste risico: handmatige bronnen verouderen ongemerkt; de december-checklist en de status te verifiëren vangen dat op.
- Fiscale feed particulier is voor 2027 leeg en professionnel heeft 4 items: zonder vulling is de rubriek in januari bijna leeg; `/api/status` meldt een rubriek met minder dan vijf items in de komende 60 dagen.
- Bosbrand en andere waarschuwingen nooit uit een oude kopie tonen.
- Google-feeds en Trends kunnen zonder aankondiging veranderen; ze zijn daarom aanvulling of signaal, nooit enige bron.
