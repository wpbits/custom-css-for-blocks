<?php
/**
 * Custom CSS for Blocks
 *
 * @link    https://wpbits.net/custom-css-for-blocks/
 * @since   1.0.0
 * @package custom-css-for-blocks
 *
 * Plugin Name: Custom CSS for Blocks
 * Plugin URI: wpbits.net
 * Description: Custom CSS for Blocks blocks
 * Version: 1.0
 * Author: WPBits
 * License: GPL3
 * License URI: https://www.gnu.org/licenses/gpl-3.0.txt
 * Text Domain: custom-css-for-blocks
 * Domain Path: /i18n/languages/
 */

defined( 'ABSPATH' ) || exit;

/**
 * Load plugin text domain
 */
function ccfg_load_plugin_textdomain() {
	load_plugin_textdomain( 'custom-css-for-blocks', false, plugin_dir_path( __FILE__ ) . 'languages' );
}

add_action( 'plugins_loaded', 'ccfg_load_plugin_textdomain', 10 );


/**
 * Register block scripts
 */
function ccfg_register_block_scripts() {

	if ( ! is_admin() ) {
		return;
	}

	$assets_file = plugin_dir_path( __FILE__ ) . 'build/index.asset.php';

	if ( ! file_exists( $assets_file ) ) {
		return false;
	}

	$assets_array = include $assets_file;

	wp_register_script(
		'custom-css-for-blocks-js',
		plugins_url( '/', __FILE__ ) . 'build/index.js',
		array_merge( $assets_array['dependencies'], array( 'wp-blocks' ) ),
		$assets_array['version'],
		true
	);

	if ( function_exists( 'wp_set_script_translations' ) ) {
		wp_set_script_translations( 'custom-css-for-blocks-js', 'custom-css-for-blocks', plugin_dir_path( plugin_basename( __FILE__ ) ) . 'languages' );
	}

}
add_action( 'init', 'ccfg_register_block_scripts', 10 );


/**
 * Enqueue Block Editor Assets
 */
function ccfg_enqueue_block_scripts() {
	wp_enqueue_script( 'custom-css-for-blocks-js' );
}
add_action( 'enqueue_block_editor_assets', 'ccfg_enqueue_block_scripts', 10 );

/**
 * Get Custom CSS codes of blocks
 *
 * @param  array $blocks block list.
 * @return string $css the generated css code.
 */
function ccfg_get_css( $blocks ) {

	$css = '';

	foreach ( $blocks as $block ) {

		// top level blocks.
		if ( isset( $block['attrs'] ) && isset( $block['attrs']['customCSS'] ) ) {
			$css .= $block['attrs']['customCSS'];
		}

		// inner blocks.
		if ( $block['innerBlocks'] ) {
			$css .= ccfg_get_css( $block['innerBlocks'] );
		}

		// reusable blocks.
		if ( 'core/block' === $block['blockName'] && ! empty( $block['attrs']['ref'] ) ) {
			$css .= ccfg_get_custom_css( $block['attrs']['ref'] );
		}
	}

	return $css;
}

 
/**
 * Get custom css of a post
 *
 * @param  string $post_id post id.
 * @return string call the function.
 */
function ccfg_get_custom_css( $post_id = '' ) {

	if ( ! $post_id ) {
		global $post;
		$the_post = $post;
	} else {
		$the_post = get_post( $post_id );
	}

	if ( ! is_object( $the_post ) ) {
		return;
	}

	if ( ! isset( $the_post->ID ) ) {
		return;
	}

	if ( ! has_blocks( $the_post->ID ) || ! isset( $the_post->post_content ) ) {
		return;
	}

	$blocks = parse_blocks( $the_post->post_content );

	return ccfg_get_css( $blocks );
}


/**
 * Get global custom css of a post
 *
 * @param  string $post_id post id.
 * @return string call the function.
 */
function ccfg_get_global_css(){

	global $post; 

	if( ! is_object( $post ) ){
		return;
	}

	if ( ! isset( $post->ID ) ) {
		return;
	}

	$css = get_post_meta( $post->ID, 'ccfg_customCSS', true );

	return $css;
}


add_action(
	'wp_print_styles',
	function() {
		$block_CSS = ccfg_get_custom_css();
		$global_CSS = ccfg_get_global_css();
		$all_CSS = ccfg_minify_css( $block_CSS . $global_CSS );

		wp_add_inline_style( 'global-styles', $all_CSS );
	}
);

/**
 *
 *  Restroute for SCSS compiler
 */
function ccfg_rest_route() {

	if ( ! is_user_logged_in() ) {
		return;
	}

	if ( ! current_user_can( 'edit_posts' ) ) {
		return;
	}

	register_rest_route(
		'ccfg-rest',
		'/scss',
		array(
			'methods' => 'POST',
			'callback' => function( $data ) {

				if ( ! isset( $data['scss'] ) || empty( $data['scss'] ) ) {
					return rest_ensure_response('');
				}

				try {
					require_once 'php-vendor/scssphp/scss.inc.php';
					$compiler = new \ScssPhp\ScssPhp\Compiler();

					$css = $compiler->compileString( $data['scss'] )->getCss();
					return rest_ensure_response( $css );
				} catch ( \Exception $e ) {
					return rest_ensure_response( 'error' );
				}

			},
			'permission_callback' => '__return_true',
		)
	);

}
add_action( 'rest_api_init', 'ccfg_rest_route', 10 );


/**
 * Register meta box for custom CSS
 */
function ccfg_register_post_meta() {
    register_post_meta( '', 'ccfg_rawCSS', array(
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
    ) );

	register_post_meta( '', 'ccfg_customCSS', array(
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
    ) );
}
add_action( 'init', 'ccfg_register_post_meta' );

/**
 * Minify CSS
 *
 * @param  string $css CSS code.
 * @return string $css minified CSS code.
 */
function ccfg_minify_css($css) {

	// Remove comments
	$css = preg_replace('#/\*.*?\*/#s', '', $css);

	// Remove whitespace
	$css = preg_replace('/\s*([{}|:;,])\s+/', '$1', $css);

	// Remove trailing whitespace at the start
	$css = preg_replace('/\s\s+(.*)/', '$1', $css);

	// Remove unnecesairy ;'s
	$css = str_replace(';}', '}', $css);

	//Remove the tabs
	$css = str_replace("\t", "", $css);

	//Strip slashes
	$css = stripslashes($css);

	return $css;
  }
  