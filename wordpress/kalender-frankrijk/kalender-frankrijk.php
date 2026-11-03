<?php
/**
 * Plugin Name: Kalender Frankrijk
 * Description: Toont met de shortcode [kalender_frankrijk] de Kalender Frankrijk: alle data die ertoe doen voor Nederlanders en Belgen in Frankrijk, met maand- en weekweergave, filter per rubriek en abonneren in uw eigen agenda.
 * Version: 1.0.2
 * Author: Communities Abroad
 * Author URI: https://www.communitiesabroad.com
 * Text Domain: kalender-frankrijk
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 *
 * Gebruik:
 *   [kalender_frankrijk]                      maandweergave
 *   [kalender_frankrijk weergave="week"]      weekweergave
 *   [kalender_frankrijk rubriek="fiscaal"]    met een voorgekozen rubriek
 *
 * De plugin roept de API zelf niet aan: de browser van de bezoeker haalt de data op bij
 * https://kalender-frankrijk.vercel.app. Er is geen opties-pagina en er wordt niets in de database bewaard.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Het versienummer staat alleen in de pluginkop hierboven; JS en CSS krijgen het mee tegen oude cache. */
function kfr_versie() {
	static $versie = null;
	if ( null === $versie ) {
		$kop    = get_file_data( __FILE__, array( 'Version' => 'Version' ) );
		$versie = ! empty( $kop['Version'] ) ? $kop['Version'] : '1.0.0';
	}
	return $versie;
}

/** Zet de shortcode om in het blok. JS en CSS worden alleen geladen op pagina's waar de shortcode staat. */
function kfr_shortcode( $atts ) {
	$standaard_api = 'https://kalender-frankrijk.vercel.app';

	$a = shortcode_atts(
		array(
			'weergave' => 'maand',
			'rubriek'  => '',
			'api'      => $standaard_api,
		),
		$atts,
		'kalender_frankrijk'
	);

	$weergave = ( 'week' === strtolower( trim( $a['weergave'] ) ) ) ? 'week' : 'maand';
	$rubriek  = sanitize_key( $a['rubriek'] );
	$api      = esc_url_raw( trim( $a['api'] ), array( 'https' ) );
	if ( '' === $api ) {
		$api = $standaard_api;
	}
	$api = untrailingslashit( $api );

	wp_enqueue_style(
		'kalender-frankrijk',
		plugins_url( 'kalender-frankrijk.css', __FILE__ ),
		array(),
		kfr_versie()
	);
	wp_enqueue_script(
		'kalender-frankrijk',
		plugins_url( 'kalender-frankrijk.js', __FILE__ ),
		array(),
		kfr_versie(),
		true
	);

	$terugval = sprintf(
		/* translators: %s: link naar de kalender op kalender-frankrijk.vercel.app */
		esc_html__( 'De kalender heeft JavaScript nodig. Bekijk hem anders op %s.', 'kalender-frankrijk' ),
		'<a href="' . esc_url( $standaard_api . '/' ) . '">kalender-frankrijk.vercel.app</a>'
	);

	return '<div class="kfr" data-kfr data-weergave="' . esc_attr( $weergave ) . '" data-rubriek="' . esc_attr( $rubriek ) . '" data-api="' . esc_attr( $api ) . '">'
		. '<p class="kfr-terugval">' . wp_kses( $terugval, array( 'a' => array( 'href' => array() ) ) ) . '</p>'
		. '</div>';
}
add_shortcode( 'kalender_frankrijk', 'kfr_shortcode' );
