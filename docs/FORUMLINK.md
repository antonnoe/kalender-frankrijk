# Forumlink: kan het formulier vooraf worden ingevuld?

Onderzoek van 2 november 2026, door de bouwer van de API.

## Vraag

Het veld `gesprek` geeft een item de link "Bespreek op het forum →" naar https://www.nederlanders.fr/profiles/blog/new. Kan NING een titel of tekst via de url vooraf invullen?

## Wat is gedaan

1. `https://www.nederlanders.fr/profiles/blog/new` opgehaald zonder inlog.
2. Dezelfde url opgehaald met `?title=`, `?blogTitle=` en `?subject=` (en `?body=`) met een herkenbare testtekst.
3. De teruggekomen pagina doorzocht op formuliervelden en op de testtekst.

## Uitkomst

- Een bezoeker die niet is ingelogd, wordt doorgestuurd naar `https://www.nederlanders.fr/main/authorization/signUp?target=<de oorspronkelijke url>`. Dat is de aanmeldpagina; het blogformulier zelf is dus zonder inlog niet te zien.
- Op die aanmeldpagina staan alleen de velden van het aanmeldformulier (`emailAddress`, `password`, `passwordConfirmation`, `question`). De testtekst komt er nergens in terug.
- Daarmee is **niet vast te stellen** of NING een titel via de url overneemt, en onder welke parameternaam. Zonder inlog kan een bouwer dat niet toetsen. De parameters worden bovendien bij het doorsturen naar de aanmeldpagina niet in een veld gezet.

## Wat is gebouwd

- `forum_url` is de kale url `https://www.nederlanders.fr/profiles/blog/new`, alleen bij items met `gesprek: ja`. Deadlines hebben geen forumlink.
- `forum_aanzet` is per item een kant-en-klare aanzet: `{titel, tekst}` met de titel van het item (met de datum erbij) en de eerste zin plus een uitnodigende vraag. De pagina op Infofrankrijk toont die aanzet met een kopieerknop, zoals het ontwerp voorschreef voor het geval vooraf invullen niet kan.
- In `lib/forum.js` staat één instelling, `FORUM_PREFILL_TITEL`. Staat die op `null`, dan wordt niets toegevoegd. Zet u er een parameternaam in (bijvoorbeeld `'title'`), dan krijgt elke `forum_url` `?title=<aanzettitel>` erbij. Verder hoeft er niets te veranderen.

## Eén controle voor de opdrachtgever (eenmalig, twee minuten)

Ingelogd op Nederlanders.fr: open `https://www.nederlanders.fr/profiles/blog/new?title=TESTTITEL` en kijk of het titelveld "TESTTITEL" bevat. Zo niet, probeer `blogTitle` of `subject`. Werkt een van de drie, zet die naam dan in `FORUM_PREFILL_TITEL`; werkt geen enkele, dan blijft de kopieerknop de oplossing en is er niets te doen.
