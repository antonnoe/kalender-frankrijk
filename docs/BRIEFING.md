# Briefing ontwerp "Kalender Frankrijk" (2 november 2026)

## Opdrachtgever en doel
Communities Abroad (Anton Noë) runt een netwerk van platforms voor Nederlanders en Belgen in Frankrijk: Nederlanders.fr (forum, 25.000+ leden, dagelijkse nieuwsbrief via Laposta), Infofrankrijk.com (kennissite, WordPress), InfoPoche (mobiele app), Café Claude (AI-assistent), PEIL (parameterregister voor bedragen en tarieven NL-FR). Doelgroep: Nederlanders en Belgen die in Frankrijk wonen of dat gaan doen, veel 60-plussers, praktische vragen over wonen, geld, zorg, papieren.

Besluit van de opdrachtgever: er komt "Kalender Frankrijk", één kalender met alle data die ertoe doen voor deze doelgroep, met rubrieken. De bestaande "Fiscale kalender Frankrijk" (https://infofrankrijk.com/fiscale-kalender-frankrijk/) blijft bestaan als rubriek daarvan.

## Wat er al is (hergebruiken, niet opnieuw bouwen)
- Fiscale kalender: WordPress-plugin op de server van Infofrankrijk (niet in een repo). Drie iCal-feeds, nu gevuld voor 2025 en 2026, 2027 bijna leeg:
  - https://infofrankrijk.com/?if_fc_ical=particulier (97 items; voorbeelden: "1e maandafschrijving — voorschot inkomstenbelasting (PAS)", "Vermogensbelasting vastgoed (IFI) — uiterste betaaldatum")
  - https://infofrankrijk.com/?if_fc_ical=professionnel (409 items, uit de kalender van impots.gouv.fr/professionnel/calendrier-fiscal)
  - https://infofrankrijk.com/?if_fc_ical=nederland (46 items: NL btw-aangifte, M-formulier, aangifte IB, AOW-betaaldagen)
  Titels Nederlands, omschrijvingen deels Frans (DGFiP-tekst).
- Verenigingenkalender: repo antonnoe/verenigingen-kalender, data op https://antonnoe.github.io/verenigingen-kalender/data/verenigingen.json (activiteiten van Nederlandse verenigingen in Frankrijk, 72 events, met iCal-bronnen per vereniging). Wordt bron, blijft apart.
- Nieuwsmotor nlfr-menu: https://nlfr-menu.vercel.app/api/actueel (nieuws, overheid, agenda) en /api/banner (Café Jeudi, elke donderdag 18:00 tot 19:30 via Google Meet, aan/uit per week).
- Dagelijkse nieuwsbrief (repo antonnoe/nlfr-nieuwsbrief): krijgt bovenaan een blok "Vandaag in het kort" (2 tot 4 regels) en een dunne feestbanner boven de kop in ingestelde periodes. Dat blok is de eerste afnemer van Kalender Frankrijk.
- Bosbrandtool: bestaat (deze zomer gebouwd, naam van de repo niet bekend bij de ontwerper); alleen tonen in het seizoen en bij een actuele waarschuwing.
- PEIL (parameterregister, repo peil-nl-fr) is het voorbeeld van hoe de opdrachtgever data beheert: register met per item id, naam, waarde, bron, verificatiedatum, status.

## Bronnen (door de opdrachtgever aangedragen of akkoord)
Automatisch (feed of API):
- Google openbare feestdagkalenders Frankrijk en Nederland (iCal, inclusief gedenkdagen).
- Google Trends dagelijkse trends Frankrijk (RSS), met filter, bronvermelding "Bron: Google Trends".
- Google News RSS voor NL-FR-onderwerpen (alleen signaal voor de redactie).
- Jours fériés API (calendrier.api.gouv.fr), ook Elzas-Moezel.
- Schoolvakanties zones A, B, C (Service-Public F31952, API data.education.gouv.fr).
- Fiscale kalender ondernemers (impots.gouv.fr/professionnel/calendrier-fiscal) en de bestaande drie iCal-feeds hierboven.
Jaarlijks met de hand over te nemen (pagina, open licentie of feiten):
- Verkiezingsdata Frankrijk (Service-Public F1939), inclusief inschrijfdeadline kiezers.
- France Travail betaal- en actualisatiedata (Service-Public A15359).
- Betaaldata Franse pensioenen (lassuranceretraite.fr, calendrier paiement retraite).
- Parcoursup-kalender (parcoursup.gouv.fr/calendrier).
- Jachtkalenders ONF per staatsbos (onf.fr), als seizoensmelding of per regio.
- Soldes-periodes, heure d'été/hiver, Journées du patrimoine, Fête de la musique.
- Franse feestdagen met uitleg en "ponts" (parisjetaime.com als tekstbron, feiten vrij).
- Grote evenementen (france.fr/fr/evenement/), selectie per jaar in eigen woorden.
- Nederland: schoolvakanties en feestdagen (rijksoverheid.nl), verkiezingen (Kiesraad), AOW-betaaldagen (SVB, staan al).
Eigen jaarkalender (seizoen en mijlpalen, niemand anders houdt dit bij voor deze doelgroep):
- Woonlandfactor 2027 bekendmaking, CAK-jaarafrekening, S1-momenten, debat dubbele nationaliteit, NL-FR diplomatie, trêve hivernale (1 november tot 31 maart), loi Montagne winterbanden (1 november tot 31 maart in bergdepartementen), ramonage en stookseizoen, contrôle technique, taxe foncière-maand, Beaujolais nouveau (derde donderdag november), oesterseizoen, Noël en Saint-Sylvestre tijdig reserveren, aangiftes NL en FR "niet te lang mee wachten", Halloween, Kerst, Pasen, Nieuwjaar (feestbanners als periode, bijvoorbeeld 1 tot 6 januari), maanfasen (zelf berekenen) en getijden (SHOM heeft strenge hergebruiksvoorwaarden: alleen als klein detail of weglaten).

## Regels van de opdrachtgever
1. Voorwaarschuwing: een deadline nooit pas op de dag zelf melden; per item instelbaar hoeveel dagen vooraf.
2. Aftelling: sommige data mogen meerdere keren terugkomen (bijvoorbeeld 30, 14, 7 en 1 dag vooraf), per item instelbaar.
3. Relevantie: alleen tonen wat de doelgroep raakt; per item een doelgroep (particulier, ondernemer, gepensioneerde, pas verhuisd, gezin met kinderen, huiseigenaar, huurder, automobilist, kustbewoner) en een rubriek.
4. Bosbrand alleen in het seizoen en bij een actuele waarschuwing.
5. Geen links naar persaggregators; geen beelden van derden; officiële bronnen met bronvermelding.
6. Zo eenvoudig mogelijk; gebruikers niet opsluiten (per rubriek een eigen iCal, lezer kiest); toekomstbestendig (data in een repo, geen afhankelijkheid van de WordPress-server; als een externe bron wegvalt blijft de laatste kopie werken).
7. Nederlands, u-vorm op Infofrankrijk, je-vorm in de nieuwsbrief en InfoPoche; huisstijl #800000, achtergrond #f5f0eb, kaarten #faf5f5 met rand #ecd9d9, Poppins koppen, Mulish tekst; themabeelden zoals InfoPoche (pictogram in themakleur op getinte achtergrond, nooit foto's van derden).
8. Opmaakregels voor teksten: geen lange streepjes (komma's), geen "ecosysteem" (zeg "netwerk van platforms"), titels in Nederlandse zinsopbouw met kleine letters.

## Afnemers
- Pagina "Kalender Frankrijk" op Infofrankrijk (WordPress, via iframe of plugin die de API leest), met de fiscale kalender als rubriek.
- Nieuwsbrief: blok "Vandaag in het kort" (vandaag: Café Jeudi, verenigingen; dan naderende deadlines met aftelling; dan één seizoenstip) en de feestbanner.
- InfoPoche: later een scherm Kalender.
- Cockpit (beheertool van de opdrachtgever): later een invulschermpje voor de eigen jaarkalender.

## Beheer
De opdrachtgever is geen programmeur en werkt via de GitHub-website en Vercel. Eigen jaarkalender als eenvoudig databestand in de repo (per regel aanpasbaar), de eerste volledige jaargang wordt door Claude gevuld. Nieuwe repo: antonnoe/kalender-frankrijk (nog aan te maken door de opdrachtgever).
