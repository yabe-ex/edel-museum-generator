<?php

/**
 * Plugin Name: Edel Museum Generator
 * Description: Easily create immersive 3D virtual museums and galleries. Walk through the space, view artworks, and customize textures.
 * Version: 1.0.0
 * Author: Edel Hearts
 * Author URI: https://edel-hearts.com
 * Text Domain: edel-museum-generator
 * Domain Path: /languages
 * License: GPLv2 or later
 */

if (!defined('ABSPATH')) exit;

$info = get_file_data(__FILE__, array('plugin_name' => 'Plugin Name', 'version' => 'Version'));

define('EDEL_MUSEUM_GENERATOR_URL', plugins_url('', __FILE__));
define('EDEL_MUSEUM_GENERATOR_PATH', dirname(__FILE__));
define('EDEL_MUSEUM_GENERATOR_SLUG', 'edel-museum-generator');
define('EDEL_MUSEUM_GENERATOR_VERSION', $info['version']);
define('EDEL_MUSEUM_GENERATOR_DEVELOP', true);

class EdelMuseumGenerator {
    public function init() {
        // 言語ファイルの読み込み
        add_action('plugins_loaded', array($this, 'load_textdomain'));

        // 管理画面側の処理
        require_once EDEL_MUSEUM_GENERATOR_PATH . '/inc/class-admin.php';
        $admin = new EdelMuseumGeneratorAdmin();
        $admin->init();

        // フロントエンドの処理
        require_once EDEL_MUSEUM_GENERATOR_PATH . '/inc/class-front.php';
        $front = new EdelMuseumGeneratorFront();
        $front->init();
    }

    public function load_textdomain() {
        load_plugin_textdomain(
            'edel-museum-generator',
            false,
            dirname(plugin_basename(__FILE__)) . '/languages'
        );
    }
}

$instance = new EdelMuseumGenerator();
$instance->init();
