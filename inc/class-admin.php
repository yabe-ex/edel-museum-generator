<?php

class EdelMuseumGeneratorAdmin {

    public function init() {
        add_action('init', array($this, 'register_cpt'));
        add_action('add_meta_boxes', array($this, 'add_meta_boxes'));
        add_action('save_post', array($this, 'save_meta_fields'));

        add_action('wp_ajax_edel_museum_save_layout', array($this, 'ajax_save_layout'));
        add_action('wp_ajax_edel_museum_clear_layout', array($this, 'ajax_clear_layout'));

        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));

        add_action('admin_menu', array($this, 'add_help_menu'));

        // ショートコード表示機能
        add_filter('manage_edel_exhibition_posts_columns', array($this, 'add_shortcode_column_head'));
        add_action('manage_edel_exhibition_posts_custom_column', array($this, 'add_shortcode_column_content'), 10, 2);
        add_action('edit_form_after_title', array($this, 'render_shortcode_after_title'));
        // Inline scripts removed (moved to js/admin.js)
    }

    public function enqueue_admin_scripts($hook) {
        global $post_type;
        if ('edel_exhibition' === $post_type) {
            wp_enqueue_media();

            // Enqueue Admin CSS
            wp_enqueue_style(
                'edel-museum-admin-css',
                EDEL_MUSEUM_GENERATOR_URL . '/css/admin.css',
                array(),
                EDEL_MUSEUM_GENERATOR_VERSION
            );

            // Enqueue Admin JS
            wp_enqueue_script(
                'edel-museum-admin-js',
                EDEL_MUSEUM_GENERATOR_URL . '/js/admin.js',
                array('jquery'),
                EDEL_MUSEUM_GENERATOR_VERSION,
                true
            );

            // Localize script for translations
            wp_localize_script('edel-museum-admin-js', 'edel_admin_vars', array(
                'copied_msg' => __('Copied!', 'edel-museum-generator'),
                'select_texture_title' => __('Select Texture Image', 'edel-museum-generator'),
                'use_image_btn' => __('Use this image', 'edel-museum-generator'),
            ));
        }
    }

    public function add_help_menu() {
        add_submenu_page(
            'edit.php?post_type=edel_exhibition',
            __('Usage Guide', 'edel-museum-generator'),
            __('Usage Guide', 'edel-museum-generator'),
            'edit_posts',
            'edel-museum-help',
            array($this, 'render_help_page')
        );
    }

    public function render_help_page() {
?>
        <div class="wrap">
            <h1><?php esc_html_e('Edel Museum Generator - Usage Guide', 'edel-museum-generator'); ?></h1>

            <div style="max-width: 1000px; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-top: 20px;">

                <div style="margin-bottom: 30px; padding: 15px; background: #e5f5fa; border-left: 4px solid #2271b1;">
                    <strong><?php esc_html_e('For more detailed instructions and tutorials, please visit:', 'edel-museum-generator'); ?></strong><br>
                    <a href="https://edel-hearts.com/edel-museum-generator-usage" target="_blank" style="font-size: 16px; font-weight: bold; text-decoration: none; display: inline-block; margin-top: 5px;">
                        https://edel-hearts.com/edel-museum-generator-usage <span class="dashicons dashicons-external" style="font-size:18px; vertical-align: bottom;"></span>
                    </a>
                </div>

                <h2 style="border-bottom: 2px solid #2271b1; padding-bottom: 10px; margin-bottom: 20px;">
                    <span class="dashicons dashicons-art" style="font-size:24px;width:24px;height:24px;margin-right:5px;"></span>
                    <?php esc_html_e('Step 1: Add Artworks', 'edel-museum-generator'); ?>
                </h2>
                <p><?php esc_html_e('Register the 2D artworks (paintings/photos) you want to display.', 'edel-museum-generator'); ?></p>
                <ol style="margin-left: 20px; line-height: 1.8;">
                    <li><?php echo wp_kses_post(__('Go to <strong>Museum Artworks > Add New Artwork</strong>.', 'edel-museum-generator')); ?></li>
                    <li><?php echo wp_kses_post(__('Enter the <strong>Title</strong> and <strong>Description</strong>.', 'edel-museum-generator')); ?></li>
                    <li>
                        <strong><?php esc_html_e('Set Featured Image:', 'edel-museum-generator'); ?></strong><br>
                        <?php esc_html_e('Upload the image you want to display on the wall using the "Featured Image" box in the right sidebar.', 'edel-museum-generator'); ?>
                    </li>
                </ol>

                <h2 style="border-bottom: 2px solid #2271b1; padding-bottom: 10px; margin-bottom: 20px; margin-top: 40px;">
                    <span class="dashicons dashicons-building" style="font-size:24px;width:24px;height:24px;margin-right:5px;"></span>
                    <?php esc_html_e('Step 2: Create Exhibition Room', 'edel-museum-generator'); ?>
                </h2>
                <p><?php esc_html_e('Configure the room and place your artworks on the walls.', 'edel-museum-generator'); ?></p>
                <ol style="margin-left: 20px; line-height: 1.8;">
                    <li><?php echo wp_kses_post(__('Go to <strong>Exhibition Settings > Add New Exhibition</strong>.', 'edel-museum-generator')); ?></li>
                    <li><strong><?php esc_html_e('Textures:', 'edel-museum-generator'); ?></strong> <?php esc_html_e('Select images for Floor, Wall, and Ceiling.', 'edel-museum-generator'); ?></li>
                    <li><strong><?php esc_html_e('Placement:', 'edel-museum-generator'); ?></strong>
                        <?php echo wp_kses_post(__('Click the <strong>"Select"</strong> button next to each wall (North, South, East, West) to choose artworks from your library.', 'edel-museum-generator')); ?>
                    </li>
                    <li><strong><?php esc_html_e('Settings:', 'edel-museum-generator'); ?></strong> <?php echo wp_kses_post(__('Adjust Brightness and <strong>Movement Speed</strong>.', 'edel-museum-generator')); ?></li>
                </ol>

                <h2 style="border-bottom: 2px solid #2271b1; padding-bottom: 10px; margin-bottom: 20px; margin-top: 40px;">
                    <span class="dashicons dashicons-move" style="font-size:24px;width:24px;height:24px;margin-right:5px;"></span>
                    <?php esc_html_e('Step 3: 3D Layout Editor', 'edel-museum-generator'); ?>
                </h2>
                <p><?php esc_html_e('Adjust the layout in 3D space.', 'edel-museum-generator'); ?></p>
                <div style="background: #f0f0f1; padding: 15px; border-left: 4px solid #2271b1;">
                    <strong><span class="dashicons dashicons-lightbulb"></span> <?php esc_html_e('Tip:', 'edel-museum-generator'); ?></strong> <?php echo wp_kses_post(__('You must <strong>Publish/Update</strong> the post first to generate the preview.', 'edel-museum-generator')); ?>
                </div>
                <ol style="margin-left: 20px; line-height: 1.8; margin-top: 15px;">
                    <li><?php echo wp_kses_post(__('View the Exhibition post on the front-end.', 'edel-museum-generator')); ?></li>
                    <li><?php echo wp_kses_post(__('Click <strong>"Switch to Editor"</strong>.', 'edel-museum-generator')); ?></li>
                    <li><strong><?php esc_html_e('Select & Move:', 'edel-museum-generator'); ?></strong> <?php esc_html_e('Click an artwork and use the arrows to move it.', 'edel-museum-generator'); ?></li>
                    <li><strong><?php esc_html_e('Scale:', 'edel-museum-generator'); ?></strong> <?php esc_html_e('Use the slider to resize the artwork.', 'edel-museum-generator'); ?></li>
                    <li><?php echo wp_kses_post(__('Click <strong>"Save Layout"</strong>.', 'edel-museum-generator')); ?></li>
                </ol>

                <h2 style="border-bottom: 2px solid #2271b1; padding-bottom: 10px; margin-bottom: 20px; margin-top: 40px;">
                    <span class="dashicons dashicons-shortcode" style="font-size:24px;width:24px;height:24px;margin-right:5px;"></span>
                    <?php esc_html_e('Step 4: Display', 'edel-museum-generator'); ?>
                </h2>
                <code style="background: #e5e5e5; padding: 10px; display: block; margin: 10px 0; font-size: 16px;">
                    [edel_museum id="123"]
                </code>

                <hr style="margin: 40px 0;">
                <p style="text-align: right; color: #888;">
                    Edel Museum Generator Lite v<?php echo esc_html(EDEL_MUSEUM_GENERATOR_VERSION); ?>
                </p>
            </div>
        </div>
    <?php
    }

    public function add_shortcode_column_head($columns) {
        $new_columns = array();
        foreach ($columns as $key => $value) {
            if ($key === 'date') $new_columns['shortcode'] = __('Shortcode', 'edel-museum-generator');
            $new_columns[$key] = $value;
        }
        return $new_columns;
    }

    public function add_shortcode_column_content($column_name, $post_id) {
        if ($column_name == 'shortcode') {
            $shortcode = '[edel_museum id="' . $post_id . '"]';
            echo '<div style="display:flex; align-items:center; gap:5px;">';
            echo '<input type="text" value="' . esc_attr($shortcode) . '" readonly style="width:160px; background:#f0f0f1; border:1px solid #ccc; font-size:12px; padding:2px 5px;" onclick="this.select();">';
            echo '<button type="button" class="button button-small edel-copy-btn" data-code="' . esc_attr($shortcode) . '"><span class="dashicons dashicons-admin-page" style="line-height:26px; font-size:14px;"></span></button>';
            echo '</div>';
        }
    }

    public function render_shortcode_after_title($post) {
        if ($post->post_type !== 'edel_exhibition') return;
        if ($post->post_status === 'auto-draft') {
            echo '<div style="margin-top:10px; color:#666;">' . esc_html__('Save draft to generate shortcode.', 'edel-museum-generator') . '</div>';
            return;
        }
        $shortcode = '[edel_museum id="' . $post->ID . '"]';
    ?>
        <div style="margin-top: 15px; display: flex; align-items: center; gap: 10px; background: #fff; padding: 10px; border: 1px solid #ccd0d4; border-left: 4px solid #2271b1; box-shadow: 0 1px 1px rgba(0,0,0,0.04);">
            <strong style="font-size:13px;"><?php esc_html_e('Shortcode:', 'edel-museum-generator'); ?></strong>
            <input type="text" id="edel-top-shortcode" value="<?php echo esc_attr($shortcode); ?>" readonly style="background:#f9f9f9; border:1px solid #ddd; width:200px; font-family:monospace;" onclick="this.select();">
            <button type="button" class="button edel-copy-btn" data-code="<?php echo esc_attr($shortcode); ?>">
                <?php esc_html_e('Copy to Clipboard', 'edel-museum-generator'); ?>
            </button>
            <span id="edel-copy-msg" style="color:green; display:none; font-weight:bold; font-size:12px;"><?php esc_html_e('Copied!', 'edel-museum-generator'); ?></span>
        </div>
    <?php
    }

    // print_admin_scripts was removed as functionality moved to js/admin.js

    public function register_cpt() {
        register_post_type('edel_artwork', array(
            'labels' => array(
                'name' => __('Museum Artworks', 'edel-museum-generator'),
                'singular_name' => __('Artwork', 'edel-museum-generator'),
                'add_new' => __('Add New Artwork', 'edel-museum-generator'),
                'add_new_item' => __('Add New Artwork', 'edel-museum-generator'),
                'edit_item' => __('Edit Artwork', 'edel-museum-generator'),
            ),
            'public' => true,
            'supports' => array('title', 'editor', 'thumbnail'),
            'menu_icon' => 'dashicons-art',
            'show_in_rest' => true,
        ));

        register_post_type('edel_exhibition', array(
            'labels' => array(
                'name' => __('Exhibition Settings', 'edel-museum-generator'),
                'singular_name' => __('Exhibition', 'edel-museum-generator'),
                'add_new' => __('Add New Exhibition', 'edel-museum-generator'),
                'add_new_item' => __('Add New Exhibition', 'edel-museum-generator'),
                'edit_item' => __('Edit Exhibition', 'edel-museum-generator'),
            ),
            'public' => true,
            'supports' => array('title'),
            'menu_icon' => 'dashicons-building',
            'show_in_rest' => false,
        ));
    }

    public function add_meta_boxes() {
        add_meta_box('edel_room_meta', __('Room Settings & Artwork Placement', 'edel-museum-generator'), array($this, 'render_room_meta'), 'edel_exhibition', 'normal', 'high');
    }

    public function render_room_meta($post) {
        $meta = get_post_meta($post->ID, '_edel_exhibition_data', true) ?: array();
        $defaults = array(
            'floor_img' => '',
            'wall_img' => '',
            'ceiling_img' => '',
            'room_brightness' => '1.2',
            'spot_brightness' => '1.0',
            'movement_speed' => '20.0',
            'north' => '',
            'south' => '',
            'east' => '',
            'west' => '',
        );
        $meta = array_merge($defaults, $meta);

        wp_nonce_field('edel_museum_meta_save', 'edel_museum_meta_nonce');

        $artworks = get_posts(array('post_type' => 'edel_artwork', 'posts_per_page' => -1, 'post_status' => 'publish'));
    ?>
        <div class="edel-section-title"><?php esc_html_e('Lighting & Movement', 'edel-museum-generator'); ?></div>
        <table class="edel-meta-table">
            <tr>
                <th><?php esc_html_e('Room Brightness', 'edel-museum-generator'); ?></th>
                <td><input type="number" name="edel_room[room_brightness]" value="<?php echo esc_attr($meta['room_brightness']); ?>" step="0.1" min="0" max="2.5"></td>
            </tr>
            <tr>
                <th><?php esc_html_e('Spotlight Brightness', 'edel-museum-generator'); ?></th>
                <td><input type="number" name="edel_room[spot_brightness]" value="<?php echo esc_attr($meta['spot_brightness']); ?>" step="0.1" min="0" max="2.5"></td>
            </tr>
            <tr>
                <th><?php esc_html_e('Movement Speed', 'edel-museum-generator'); ?></th>
                <td>
                    <input type="number" name="edel_room[movement_speed]" value="<?php echo esc_attr($meta['movement_speed']); ?>" step="1.0" min="1.0" max="50.0">
                    <p class="description" style="font-size:11px;">Default: 20.0 (Range: 1.0 - 50.0)</p>
                </td>
            </tr>
        </table>

        <div class="edel-section-title"><?php esc_html_e('Textures (Image URL)', 'edel-museum-generator'); ?></div>
        <table class="edel-meta-table">
            <?php
            $textures = array(
                'floor_img' => __('Floor', 'edel-museum-generator'),
                'wall_img' => __('Wall', 'edel-museum-generator'),
                'ceiling_img' => __('Ceiling', 'edel-museum-generator')
            );
            foreach ($textures as $key => $label):
            ?>
                <tr>
                    <th><?php echo esc_html($label); ?></th>
                    <td>
                        <div style="display:flex;">
                            <input type="text" id="edel_room_<?php echo esc_attr($key); ?>" name="edel_room[<?php echo esc_attr($key); ?>]" value="<?php echo esc_attr($meta[$key]); ?>">
                            <button type="button" class="button edel-upload-texture" data-target="edel_room_<?php echo esc_attr($key); ?>"><?php esc_html_e('Select Image', 'edel-museum-generator'); ?></button>
                        </div>
                    </td>
                </tr>
            <?php endforeach; ?>
        </table>

        <div class="edel-section-title"><?php esc_html_e('Wall Placement (Images)', 'edel-museum-generator'); ?></div>
        <table class="edel-meta-table">
            <?php
            $walls = array('north' => __('North Wall', 'edel-museum-generator'), 'south' => __('South Wall', 'edel-museum-generator'), 'east' => __('East Wall', 'edel-museum-generator'), 'west' => __('West Wall', 'edel-museum-generator'));
            foreach ($walls as $key => $label):
            ?>
                <tr>
                    <th><?php echo esc_html($label); ?></th>
                    <td>
                        <div style="display:flex;">
                            <input type="text" id="edel_room_<?php echo esc_attr($key); ?>" class="edel-placement-input" name="edel_room[<?php echo esc_attr($key); ?>]" value="<?php echo esc_attr($meta[$key]); ?>">
                            <button type="button" class="button edel-open-picker" data-target="edel_room_<?php echo esc_attr($key); ?>"><?php esc_html_e('Select', 'edel-museum-generator'); ?></button>
                        </div>
                    </td>
                </tr>
            <?php endforeach; ?>
        </table>

        <div id="edel-art-picker-modal">
            <div id="edel-picker-content">
                <div id="edel-picker-header">
                    <h3 id="edel-picker-title"><?php esc_html_e('Select Artworks', 'edel-museum-generator'); ?></h3>
                    <button type="button" id="edel-picker-close" class="button"><?php esc_html_e('Close', 'edel-museum-generator'); ?></button>
                </div>
                <div id="edel-picker-body">
                    <?php if ($artworks): foreach ($artworks as $art):
                            $img_url = get_the_post_thumbnail_url($art->ID, 'thumbnail');
                            $has_img = $img_url ? '1' : '0';
                    ?>
                            <div class="edel-art-item"
                                data-id="<?php echo esc_attr($art->ID); ?>"
                                data-has-img="<?php echo esc_attr($has_img); ?>">
                                <?php if ($img_url): ?><img src="<?php echo esc_url($img_url); ?>" class="edel-art-thumb"><?php else: ?><div class="edel-art-thumb" style="display:flex;align-items:center;justify-content:center;color:#ccc;font-size:10px;">No Image</div><?php endif; ?>
                                <div class="edel-art-title"><?php echo esc_html($art->post_title); ?></div>
                                <div style="font-size:10px;color:#888;">ID: <?php echo esc_html($art->ID); ?></div>
                            </div>
                        <?php endforeach;
                    else: ?>
                        <p style="padding:20px;"><?php esc_html_e('No artworks found.', 'edel-museum-generator'); ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </div>

<?php
    }

    public function save_meta_fields($post_id) {
        $nonce = isset($_POST['edel_museum_meta_nonce']) ? sanitize_key(wp_unslash($_POST['edel_museum_meta_nonce'])) : '';
        if (!wp_verify_nonce($nonce, 'edel_museum_meta_save')) return;

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (!current_user_can('edit_post', $post_id)) return;

        if (isset($_POST['edel_room'])) {
            $clean_data = array();
            $edel_room_raw = wp_unslash($_POST['edel_room']);

            if (is_array($edel_room_raw)) {
                foreach ($edel_room_raw as $k => $v) {
                    $clean_data[$k] = sanitize_text_field($v);
                }
            }
            update_post_meta($post_id, '_edel_exhibition_data', $clean_data);

            $old_json = get_post_meta($post_id, '_edel_museum_layout', true);
            $old_json = is_string($old_json) ? wp_unslash($old_json) : $old_json;
            $old_layout = $old_json ? json_decode($old_json, true) : null;
            $new_layout = $this->generate_layout_data($post_id, $clean_data);

            if ($old_layout && isset($old_layout['artworks']) && isset($new_layout['artworks'])) {
                $old_map = array();
                foreach ($old_layout['artworks'] as $art) {
                    $key = $art['id'] . '_' . $art['wall'];
                    $old_map[$key] = $art;
                }
                foreach ($new_layout['artworks'] as &$new_art) {
                    $key = $new_art['id'] . '_' . $new_art['wall'];
                    if (isset($old_map[$key])) {
                        $old_art = $old_map[$key];
                        $new_art['x'] = $old_art['x'];
                        $new_art['y'] = $old_art['y'];
                        $new_art['z'] = $old_art['z'];
                        if (isset($old_art['scale'])) $new_art['scale'] = $old_art['scale'];
                        if (isset($old_art['rotationY'])) $new_art['rotationY'] = $old_art['rotationY'];
                    }
                }
            }
            $json = wp_json_encode($new_layout, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            update_post_meta($post_id, '_edel_museum_layout', wp_slash($json));
        }
    }

    private function generate_layout_data($post_id, $meta) {
        $room_w = 16;
        $room_h = 4;
        $room_d = 16;
        $num_pillars = 0;
        $pillars_data = array();

        $layout = array(
            'room' => array(
                'width' => $room_w,
                'height' => $room_h,
                'depth' => $room_d,
                'floor_image'   => $meta['floor_img'],
                'wall_image'    => $meta['wall_img'],
                'pillar_image'  => '',
                'ceiling_image' => $meta['ceiling_img'],
                'room_brightness' => isset($meta['room_brightness']) ? $meta['room_brightness'] : '1.2',
                'spot_brightness' => isset($meta['spot_brightness']) ? $meta['spot_brightness'] : '1.0',
                'movement_speed'  => isset($meta['movement_speed']) ? $meta['movement_speed'] : '20.0',
            ),
            'pillars' => $pillars_data,
            'artworks' => array(),
        );
        $walls_map = array(
            'north' => $meta['north'],
            'south' => $meta['south'],
            'east'  => $meta['east'],
            'west'  => $meta['west'],
        );

        foreach ($walls_map as $wall_key => $ids_str) {
            if (empty($ids_str)) continue;
            $ids = array_filter(array_map('trim', explode(',', $ids_str)));
            if (empty($ids)) continue;

            $wall_w = ($wall_key === 'north' || $wall_key === 'south') ? $room_w : $room_d;
            $margin = 0.5;
            $count = count($ids);
            $spacing = 2.0;
            if ($count * $spacing > ($wall_w - 1.0)) $spacing = ($wall_w - 1.0) / $count;
            $total_span = ($count - 1) * $spacing;
            $start_pos = - ($total_span / 2);

            foreach ($ids as $i => $art_id) {
                $art_post = get_post($art_id);
                if (!$art_post || $art_post->post_type !== 'edel_artwork') continue;
                $img_url = get_the_post_thumbnail_url($art_id, 'large');
                if (!$img_url) continue;

                $offset = $start_pos + ($i * $spacing);
                $px = 0;
                $pz = 0;
                $p_offset = 0.05;

                if ($wall_key === 'north') {
                    $px = $offset;
                    $pz = - ($room_d / 2) + $p_offset;
                } elseif ($wall_key === 'south') {
                    $px = $offset;
                    $pz = ($room_d / 2) - $p_offset;
                } elseif ($wall_key === 'east') {
                    $pz = $offset;
                    $px = ($room_w / 2) - $p_offset;
                } elseif ($wall_key === 'west') {
                    $pz = $offset;
                    $px = - ($room_w / 2) + $p_offset;
                }

                $layout['artworks'][] = array(
                    'id'    => $art_id,
                    'image' => $img_url,
                    'title' => $art_post->post_title,
                    'desc'  => wp_strip_all_tags($art_post->post_content),
                    'link'  => '',
                    'wall'  => $wall_key,
                    'x'     => $px,
                    'y'     => 1.5,
                    'z'     => $pz,
                    'scale' => array('x' => 1, 'y' => 1, 'z' => 1),
                );
            }
        }
        return $layout;
    }

    public function ajax_save_layout() {
        if (!current_user_can('edit_posts')) wp_send_json_error(array('message' => __('Permission denied', 'edel-museum-generator')));
        check_ajax_referer(EDEL_MUSEUM_GENERATOR_SLUG, '_nonce');

        $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;
        $layout_raw = isset($_POST['layout']) ? wp_unslash($_POST['layout']) : '';

        if (!$post_id || !$layout_raw) wp_send_json_error(array('message' => __('Missing data', 'edel-museum-generator')));

        $layout_json = json_decode($layout_raw, true);
        if ($layout_json && is_array($layout_json)) {
            $layout_clean = $this->sanitize_layout_recursive($layout_json);
            $layout = wp_json_encode($layout_clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            update_post_meta($post_id, '_edel_museum_layout', wp_slash($layout));
            wp_send_json_success(array('message' => __('Saved successfully!', 'edel-museum-generator')));
        } else {
            wp_send_json_error(array('message' => __('Invalid data', 'edel-museum-generator')));
        }
    }

    private function sanitize_layout_recursive($data) {
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                $data[$key] = $this->sanitize_layout_recursive($value);
            }
            return $data;
        } elseif (is_string($data)) {
            return sanitize_text_field($data);
        } elseif (is_numeric($data)) {
            return $data;
        } elseif (is_bool($data)) {
            return $data;
        }
        return '';
    }

    public function ajax_clear_layout() {
        if (!current_user_can('edit_posts')) wp_send_json_error(array('message' => __('Permission denied', 'edel-museum-generator')));
        check_ajax_referer(EDEL_MUSEUM_GENERATOR_SLUG, '_nonce');

        $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;
        if (!$post_id) wp_send_json_error(array('message' => __('Missing data', 'edel-museum-generator')));

        delete_post_meta($post_id, '_edel_museum_layout');
        wp_send_json_success(array('message' => __('Reset to default layout.', 'edel-museum-generator')));
    }
}
