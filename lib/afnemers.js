// De twee bestemmingen van de keuzepagina op de startpagina (public/index.html).
// Dit is de ENIGE plek waar ze staan. Pas het adres hier aan, draai `npm run bouw`
// en commit de gegenereerde public/index.html mee (de test controleert dat ze gelijk zijn).
//
// Voorlopige adressen: ze worden omgezet zodra de echte pagina's bestaan.
//  - infofrankrijk: de pagina "Kalender Frankrijk" op Infofrankrijk bestaat nog niet (de plugin staat klaar,
//    zie wordpress/README.md), voorlopig de pagina van de Fiscale kalender.
//  - infopoche: het scherm "Kalender" in InfoPoche bestaat nog niet,
//    voorlopig de startpagina van InfoPoche.
export const AFNEMERS = {
  infofrankrijk: {
    knop: 'Op Infofrankrijk',
    uitleg: 'website, met de fiscale kalender en abonnementen',
    url: 'https://infofrankrijk.com/fiscale-kalender-frankrijk/',
    // Zodra de pagina "Kalender Frankrijk" bestaat (WordPress-plugin, zie wordpress/README.md): hierboven vervangen door
    // url: 'https://infofrankrijk.com/kalender-frankrijk/',
    // en dan `npm run bouw` draaien. Pas daarna ook de uitleg hierboven aan (de pagina heeft de fiscale kalender als rubriek).
  },
  infopoche: {
    knop: 'In InfoPoche',
    uitleg: 'app voor op uw telefoon',
    url: 'https://infopoche.fr/',
  },
};
