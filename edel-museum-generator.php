<?php

/**
 * Plugin Name: Edel Museum Generator
 * Description: Create a 3D virtual museum easily.
 * Version: 1.2.0
 * Author: Edel Hearts
 * Author URI: https://edel-hearts.com
 * Text Domain: edel-museum-generator
 * Domain Path: /languages
 * License: GPLv2 or later
 */

if (!defined('ABSPATH')) exit;

$edel_museum_info = get_file_data(__FILE__, array('version' => 'Version'));

define('EDEL_MUSEUM_GENERATOR_SLUG', 'edel-museum-generator');
define('EDEL_MUSEUM_GENERATOR_VERSION', $edel_museum_info['version']);
define('EDEL_MUSEUM_GENERATOR_DEVELOP', false);
define('EDEL_MUSEUM_GENERATOR_URL', plugins_url('', __FILE__));
define('EDEL_MUSEUM_GENERATOR_PATH', dirname(__FILE__));

class EdelMuseumGenerator {
    public function init() {

        add_filter('plugin_action_links_' . plugin_basename(__FILE__), array($this, 'add_plugin_links'));

        require_once EDEL_MUSEUM_GENERATOR_PATH . '/inc/class-admin.php';
        $admin = new EdelMuseumGeneratorAdmin();
        $admin->init();

        require_once EDEL_MUSEUM_GENERATOR_PATH . '/inc/class-front.php';
        $front = new EdelMuseumGeneratorFront();
        $front->init();
    }

    public function add_plugin_links($links) {
        $url = admin_url('edit.php?post_type=edel_exhibition&page=edel-museum-help');
        $settings_link = '<a href="' . esc_url($url) . '" style="font-weight:bold;">' . esc_html__('Usage Guide', 'edel-museum-generator') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    }
}

$edel_museum_instance = new EdelMuseumGenerator();
$edel_museum_instance->init();
