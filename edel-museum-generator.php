<?php

/**
 * Plugin Name: Edel Museum Generator
 * Description: Create a 3D virtual museum easily.
 * Version: 1.3.2
 * Author: Edel Hearts
 * Author URI: https://edel-hearts.com
 * Text Domain: edel-museum-generator
 * Domain Path: /languages
 * License: GPLv2 or later
 */

if (!defined('ABSPATH')) exit;

$info = get_file_data(__FILE__, array('version' => 'Version'));

// ★定数名を修正
define('EDEL_MUSEUM_GENERATOR_SLUG', 'edel-museum-generator');
define('EDEL_MUSEUM_GENERATOR_VERSION', $info['version']);
define('EDEL_MUSEUM_GENERATOR_DEVELOP', false);
define('EDEL_MUSEUM_GENERATOR_URL', plugins_url('', __FILE__));
define('EDEL_MUSEUM_GENERATOR_PATH', dirname(__FILE__));

class EdelMuseumGenerator {
    public function init() {
        add_action('plugins_loaded', array($this, 'load_textdomain'));

        add_filter('plugin_action_links_' . plugin_basename(__FILE__), array($this, 'add_plugin_links'));

        // 定数を使って読み込み
        require_once EDEL_MUSEUM_GENERATOR_PATH . '/inc/class-admin.php';
        $admin = new EdelMuseumGeneratorAdmin();
        $admin->init();

        require_once EDEL_MUSEUM_GENERATOR_PATH . '/inc/class-front.php';
        $front = new EdelMuseumGeneratorFront();
        $front->init();
    }

    public function load_textdomain() {
        load_plugin_textdomain('edel-museum-generator', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }

    public function add_plugin_links($links) {
        $url = admin_url('edit.php?post_type=edel_exhibition&page=edel-museum-help');
        $settings_link = '<a href="' . esc_url($url) . '" style="font-weight:bold;">' . __('Usage Guide', 'edel-museum-generator') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    }
}

$instance = new EdelMuseumGenerator();
$instance->init();
