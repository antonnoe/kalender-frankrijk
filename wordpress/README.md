# WordPress-plugin Kalender Frankrijk

Met deze plugin zet u de Kalender Frankrijk op een pagina van Infofrankrijk.com. U typt één regel (een shortcode) en de kalender verschijnt, met een maandweergave, een weekweergave, een filter per rubriek en een knop om de kalender in uw eigen agenda-app te zetten.

De plugin vraagt zelf niets aan de server van Infofrankrijk: de browser van de bezoeker haalt de data op bij https://kalender-frankrijk.vercel.app. Er is geen instellingenpagina en er wordt niets in de database bewaard.

## Eerst bekijken

Hoe het blok eruitziet op een pagina met de achtergrond van Infofrankrijk, ziet u op https://kalender-frankrijk.vercel.app/pagina.html. Dat is exact dezelfde code als in de plugin.

## Installeren

1. Download https://kalender-frankrijk.vercel.app/download/kalender-frankrijk.zip (altijd de laatste versie).
2. Ga in WordPress naar Plugins, Nieuwe plugin, Plugin uploaden. Kies het zipbestand en klik op Nu installeren.
3. Klik op Plugin activeren.
4. Maak een nieuwe pagina met de titel "Kalender Frankrijk". Zorg dat het webadres (de slug) `kalender-frankrijk` wordt, zodat de pagina op https://infofrankrijk.com/kalender-frankrijk/ staat.
5. Zet in een tekstmodule (in Divi) de shortcode `[kalender_frankrijk]` en publiceer de pagina.

## Varianten

| Shortcode | Resultaat |
|---|---|
| `[kalender_frankrijk]` | de kalender in maandweergave |
| `[kalender_frankrijk weergave="week"]` | de kalender in weekweergave |
| `[kalender_frankrijk rubriek="fiscaal"]` | de kalender met de rubriek Fiscaal voorgekozen, voor een fiscale pagina |

De rubrieken zijn `fiscaal`, `uitkeringen`, `feestdagen`, `school`, `wonen`, `buiten`, `zorg`, `stemmen`, `genieten` en `verenigingen`. De bezoeker kan het filter altijd zelf aanpassen. De shortcode heeft ook een attribuut `api`; dat hoeft u normaal nooit te gebruiken.

## Bijwerken

Een nieuwe versie van de plugin staat altijd op dezelfde plek (het zipbestand hierboven). Upload hem opnieuw via Plugins, Nieuwe plugin, Plugin uploaden; WordPress vraagt dan of u de huidige versie wilt vervangen. De data in de kalender zelf werkt vanzelf bij, daarvoor hoeft u niets te doen.

## Voor wie de plugin wijzigt (beheer van de repo)

De bronbestanden staan in `wordpress/kalender-frankrijk/`: `kalender-frankrijk.php`, `kalender-frankrijk.js`, `kalender-frankrijk.css` en `readme.txt`. Verhoog bij een wijziging het versienummer in de pluginkop van `kalender-frankrijk.php` (en `Stable tag` in `readme.txt`) en draai `npm run bouw`. Dat kopieert JS en CSS naar `public/plugin/` (voor de voorbeeldpagina) en maakt `public/download/kalender-frankrijk.zip`. Commit al die bestanden mee; `npm test` faalt als ze niet gelijk zijn aan de bron.
