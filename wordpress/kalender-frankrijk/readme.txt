=== Kalender Frankrijk ===
Contributors: communitiesabroad
Tags: kalender, frankrijk, agenda
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0.1
License: GPLv2 or later

Toont de Kalender Frankrijk met een shortcode: data die ertoe doen voor Nederlanders en Belgen in Frankrijk.

== Description ==

Kalender Frankrijk is een uitgave van Communities Abroad. Eén kalender met belastingdata, uitkeringen en pensioenen, feestdagen, schoolvakanties, seizoen, verkiezingen en verenigingen. Alleen data die tegen de bron zijn gecontroleerd.

Het blok heeft een maand- en een weekweergave, een filter per rubriek en een knop om de kalender (of één rubriek) in uw eigen agenda-app te zetten.

De data komt uit de openbare API van Kalender Frankrijk. De browser van de bezoeker haalt hem op; uw website doet geen aanroepen, er is geen opties-pagina en er wordt niets in de database bewaard.

Shortcode:

* `[kalender_frankrijk]` toont de maand
* `[kalender_frankrijk weergave="week"]` toont de week
* `[kalender_frankrijk rubriek="fiscaal"]` toont de kalender met de fiscale rubriek voorgekozen

Rubrieken: fiscaal, uitkeringen, feestdagen, school, wonen, buiten, zorg, stemmen, genieten, verenigingen.

== Installation ==

1. Ga naar Plugins, Nieuwe plugin, Plugin uploaden en kies kalender-frankrijk.zip.
2. Activeer de plugin.
3. Maak een pagina en zet de shortcode `[kalender_frankrijk]` in een tekstmodule.

== Changelog ==

= 1.0.1 =
* De kalender vult de kolom van het artikel en lijnt links uit met de tekst (was 760 px gecentreerd).

= 1.0.0 =
* Eerste versie.
