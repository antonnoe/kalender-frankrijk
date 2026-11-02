// De twee bestemmingen van de keuzepagina op de startpagina (public/index.html).
// Dit is de ENIGE plek waar ze staan. Pas het adres hier aan, draai `npm run bouw`
// en commit de gegenereerde public/index.html mee (de test controleert dat ze gelijk zijn).
//
// Beide bestemmingen zijn sinds 2 november 2026 de echte pagina's: de pagina Kalender Frankrijk op
// Infofrankrijk (WordPress-plugin, zie wordpress/README.md) en het scherm Kalender in InfoPoche.
export const AFNEMERS = {
  infofrankrijk: {
    knop: 'Op Infofrankrijk',
    uitleg: 'website, met de fiscale kalender als rubriek',
    url: 'https://infofrankrijk.com/kalender-frankrijk/',
  },
  infopoche: {
    knop: 'In InfoPoche',
    uitleg: 'app voor op uw telefoon',
    url: 'https://infopoche.fr/#/kalender',
  },
};
