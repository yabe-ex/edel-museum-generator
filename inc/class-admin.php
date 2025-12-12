<?php

class EdelMuseumGeneratorAdmin {

    public function init() {
        add_action('init', array($this, 'register_cpt'));
        add_action('add_meta_boxes', array($this, 'add_meta_boxes'));
        add_action('save_post', array($this, 'save_meta_fields'));

        // AJAX Handles
        add_action('wp_ajax_edel_museum_save_layout', array($this, 'ajax_save_layout'));
        add_action('wp_ajax_edel_museum_clear_layout', array($this, 'ajax_clear_layout'));
    }

    public function register_cpt() {
        // Artwork CPT
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

        // Exhibition CPT
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
        // 作品用 (Lite版制限表示)
        add_meta_box(
            'edel_art_meta',
            __('Artwork Options', 'edel-museum-generator'),
            array($this, 'render_art_meta'), // Lite用に変更済み
            'edel_artwork',
            'normal',
            'high'
        );

        // 展示室設定 (メイン)
        add_meta_box(
            'edel_room_meta',
            __('Room Settings & Artwork Placement', 'edel-museum-generator'),
            array($this, 'render_room_meta'),
            'edel_exhibition',
            'normal',
            'high'
        );

        // ★追加: Pro版への導線サイドバー
        add_meta_box(
            'edel_pro_sidebar',
            __('Upgrade to Pro', 'edel-museum-generator'),
            array($this, 'render_pro_sidebar'),
            'edel_exhibition',
            'side',
            'high'
        );
    }

    /**
     * 作品用メタボックス (Lite版仕様: リンク入力不可・Pro誘導)
     */
    public function render_art_meta($post) {
?>
        <div style="background: #f0f6fc; padding: 15px; border-left: 4px solid #72aee6;">
            <p style="margin-top:0; font-weight:bold; color: #1d2327;">
                <?php _e('Link feature is available in Pro version.', 'edel-museum-generator'); ?>
            </p>
            <p style="color: #50575e;">
                <?php _e('In the Pro version, you can set a URL for each artwork to link to your shop or portfolio.', 'edel-museum-generator'); ?>
            </p>
            <a href="https://edel-hearts.com/edel-museum-generator-pro/" target="_blank" class="button button-primary">
                <?php _e('Get Pro Version', 'edel-museum-generator'); ?>
            </a>
        </div>
    <?php
    }

    /**
     * ★追加: 展示室設定画面のサイドバー (Pro誘導)
     */
    public function render_pro_sidebar() {
    ?>
        <div style="text-align: center;">
            <p><strong>Edel Museum Generator Pro</strong></p>
            <p style="font-size:13px; color:#666;"><?php _e('Unlock powerful features:', 'edel-museum-generator'); ?></p>
            <ul style="text-align: left; list-style: disc; margin-left: 20px; font-size: 12px; color:#444;">
                <li><?php _e('Link Artworks to URLs', 'edel-museum-generator'); ?></li>
                <li><?php _e('Place 3D Models (GLB)', 'edel-museum-generator'); ?></li>
                <li><?php _e('Auto-Tour Mode', 'edel-museum-generator'); ?></li>
                <li><?php _e('Premium Support', 'edel-museum-generator'); ?></li>
            </ul>
            <a href="https://edel-hearts.com/edel-museum-generator-pro/" target="_blank" class="button button-primary" style="width:100%; text-align:center; margin-top:10px;">
                <?php _e('Upgrade Now', 'edel-museum-generator'); ?>
            </a>
        </div>
    <?php
    }

    public function render_room_meta($post) {
        $meta = get_post_meta($post->ID, '_edel_exhibition_data', true) ?: array();
        $defaults = array(
            'floor_img' => '',
            'wall_img' => '',
            'pillar_img' => '',
            'ceiling_img' => '',
            'pillars' => '0',
            'room_brightness' => '1.2',
            'spot_brightness' => '1.0',
            'north' => '',
            'south' => '',
            'east' => '',
            'west' => '',
            'p1_north' => '',
            'p1_south' => '',
            'p1_east' => '',
            'p1_west' => '',
            'p2_north' => '',
            'p2_south' => '',
            'p2_east' => '',
            'p2_west' => '',
        );
        $meta = array_merge($defaults, $meta);

        wp_nonce_field('edel_museum_meta_save', 'edel_museum_meta_nonce');
    ?>
        <style>
            .edel-meta-table {
                width: 100%;
                border-collapse: collapse;
            }

            .edel-meta-table th {
                text-align: left;
                width: 200px;
                padding: 10px 0;
                border-bottom: 1px solid #eee;
            }

            .edel-meta-table td {
                padding: 10px 0;
                border-bottom: 1px solid #eee;
            }

            .edel-meta-table input[type="text"],
            .edel-meta-table input[type="number"] {
                width: 100%;
            }

            .edel-section-title {
                background: #f0f0f1;
                padding: 10px;
                margin: 20px 0 10px;
                font-weight: bold;
            }
        </style>

        <div class="edel-section-title"><?php _e('Lighting Settings (Default)', 'edel-museum-generator'); ?></div>
        <table class="edel-meta-table">
            <tr>
                <th><?php _e('Room Brightness', 'edel-museum-generator'); ?></th>
                <td><input type="number" name="edel_room[room_brightness]" value="<?php echo esc_attr($meta['room_brightness']); ?>" step="0.1" min="0" max="2.5"></td>
            </tr>
            <tr>
                <th><?php _e('Spotlight Brightness', 'edel-museum-generator'); ?></th>
                <td><input type="number" name="edel_room[spot_brightness]" value="<?php echo esc_attr($meta['spot_brightness']); ?>" step="0.1" min="0" max="2.5"></td>
            </tr>
        </table>

        <div class="edel-section-title"><?php _e('Textures (Image URL)', 'edel-museum-generator'); ?></div>
        <table class="edel-meta-table">
            <tr>
                <th><?php _e('Floor', 'edel-museum-generator'); ?></th>
                <td><input type="text" name="edel_room[floor_img]" value="<?php echo esc_attr($meta['floor_img']); ?>"></td>
            </tr>
            <tr>
                <th><?php _e('Wall', 'edel-museum-generator'); ?></th>
                <td><input type="text" name="edel_room[wall_img]" value="<?php echo esc_attr($meta['wall_img']); ?>"></td>
            </tr>
            <tr>
                <th><?php _e('Pillar', 'edel-museum-generator'); ?></th>
                <td><input type="text" name="edel_room[pillar_img]" value="<?php echo esc_attr($meta['pillar_img']); ?>"></td>
            </tr>
            <tr>
                <th><?php _e('Ceiling', 'edel-museum-generator'); ?></th>
                <td><input type="text" name="edel_room[ceiling_img]" value="<?php echo esc_attr($meta['ceiling_img']); ?>"></td>
            </tr>
        </table>

        <div class="edel-section-title"><?php _e('Structure', 'edel-museum-generator'); ?></div>
        <table class="edel-meta-table">
            <tr>
                <th><?php _e('Number of Pillars (0-2)', 'edel-museum-generator'); ?></th>
                <td><input type="number" name="edel_room[pillars]" value="<?php echo esc_attr($meta['pillars']); ?>" min="0" max="2"></td>
            </tr>
        </table>

        <div class="edel-section-title"><?php _e('Artwork Placement (Comma separated IDs)', 'edel-museum-generator'); ?></div>
        <table class="edel-meta-table">
            <tr>
                <th><?php _e('North Wall', 'edel-museum-generator'); ?></th>
                <td><input type="text" name="edel_room[north]" value="<?php echo esc_attr($meta['north']); ?>"></td>
            </tr>
            <tr>
                <th><?php _e('South Wall', 'edel-museum-generator'); ?></th>
                <td><input type="text" name="edel_room[south]" value="<?php echo esc_attr($meta['south']); ?>"></td>
            </tr>
            <tr>
                <th><?php _e('East Wall', 'edel-museum-generator'); ?></th>
                <td><input type="text" name="edel_room[east]" value="<?php echo esc_attr($meta['east']); ?>"></td>
            </tr>
            <tr>
                <th><?php _e('West Wall', 'edel-museum-generator'); ?></th>
                <td><input type="text" name="edel_room[west]" value="<?php echo esc_attr($meta['west']); ?>"></td>
            </tr>
        </table>

        <div class="edel-section-title"><?php _e('Pillar Placement', 'edel-museum-generator'); ?></div>
        <table class="edel-meta-table">
            <tr>
                <th><?php _e('Pillar 1 North', 'edel-museum-generator'); ?></th>
                <td><input type="text" name="edel_room[p1_north]" value="<?php echo esc_attr($meta['p1_north']); ?>"></td>
            </tr>
            <tr>
                <th><?php _e('Pillar 1 South', 'edel-museum-generator'); ?></th>
                <td><input type="text" name="edel_room[p1_south]" value="<?php echo esc_attr($meta['p1_south']); ?>"></td>
            </tr>
            <tr>
                <th><?php _e('Pillar 1 East', 'edel-museum-generator'); ?></th>
                <td><input type="text" name="edel_room[p1_east]" value="<?php echo esc_attr($meta['p1_east']); ?>"></td>
            </tr>
            <tr>
                <th><?php _e('Pillar 1 West', 'edel-museum-generator'); ?></th>
                <td><input type="text" name="edel_room[p1_west]" value="<?php echo esc_attr($meta['p1_west']); ?>"></td>
            </tr>
            <tr>
                <td colspan="2" style="background:#fafafa;"></td>
            </tr>
            <tr>
                <th><?php _e('Pillar 2 North', 'edel-museum-generator'); ?></th>
                <td><input type="text" name="edel_room[p2_north]" value="<?php echo esc_attr($meta['p2_north']); ?>"></td>
            </tr>
            <tr>
                <th><?php _e('Pillar 2 South', 'edel-museum-generator'); ?></th>
                <td><input type="text" name="edel_room[p2_south]" value="<?php echo esc_attr($meta['p2_south']); ?>"></td>
            </tr>
            <tr>
                <th><?php _e('Pillar 2 East', 'edel-museum-generator'); ?></th>
                <td><input type="text" name="edel_room[p2_east]" value="<?php echo esc_attr($meta['p2_east']); ?>"></td>
            </tr>
            <tr>
                <th><?php _e('Pillar 2 West', 'edel-museum-generator'); ?></th>
                <td><input type="text" name="edel_room[p2_west]" value="<?php echo esc_attr($meta['p2_west']); ?>"></td>
            </tr>
        </table>
<?php
    }

    public function save_meta_fields($post_id) {
        if (!isset($_POST['edel_museum_meta_nonce']) || !wp_verify_nonce($_POST['edel_museum_meta_nonce'], 'edel_museum_meta_save')) return;
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (!current_user_can('edit_post', $post_id)) return;

        // ★Lite版のため、作品リンク(_edel_art_link)の保存処理は削除しました

        // 展示室の設定保存
        if (isset($_POST['edel_room'])) {
            $clean_data = array();
            foreach ($_POST['edel_room'] as $k => $v) {
                $clean_data[$k] = sanitize_text_field($v);
            }
            update_post_meta($post_id, '_edel_exhibition_data', $clean_data);

            // レイアウトのマージ処理 (座標維持)
            $old_json = get_post_meta($post_id, '_edel_museum_layout', true);
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
                        if (isset($old_art['scale'])) {
                            $new_art['scale'] = $old_art['scale'];
                        }
                    }
                }
            }

            update_post_meta($post_id, '_edel_museum_layout', wp_json_encode($new_layout));
        }
    }

    private function generate_layout_data($post_id, $meta) {
        $room_w = 16;
        $room_h = 4;
        $room_d = 16;
        $num_pillars = intval($meta['pillars']);
        $pillars_data = array();
        $pillar_size = 2;

        if ($num_pillars === 1) {
            $pillars_data[] = array('id' => 'p1', 'x' => 0, 'z' => 0, 'w' => $pillar_size, 'd' => $pillar_size);
        } elseif ($num_pillars === 2) {
            $pillars_data[] = array('id' => 'p1', 'x' => -3, 'z' => 0, 'w' => $pillar_size, 'd' => $pillar_size);
            $pillars_data[] = array('id' => 'p2', 'x' => 3, 'z' => 0, 'w' => $pillar_size, 'd' => $pillar_size);
        }

        $layout = array(
            'room' => array(
                'width' => $room_w,
                'height' => $room_h,
                'depth' => $room_d,
                'floor_image'   => $meta['floor_img'],
                'wall_image'    => $meta['wall_img'],
                'pillar_image'  => $meta['pillar_img'],
                'ceiling_image' => $meta['ceiling_img'],
                'room_brightness' => isset($meta['room_brightness']) ? $meta['room_brightness'] : '1.2',
                'spot_brightness' => isset($meta['spot_brightness']) ? $meta['spot_brightness'] : '1.0',
            ),
            'pillars' => $pillars_data,
            'artworks' => array(),
        );

        $walls_map = array(
            'north' => $meta['north'],
            'south' => $meta['south'],
            'east'  => $meta['east'],
            'west'  => $meta['west'],
            'p1_north' => $meta['p1_north'],
            'p1_south' => $meta['p1_south'],
            'p1_east'  => $meta['p1_east'],
            'p1_west'  => $meta['p1_west'],
            'p2_north' => $meta['p2_north'],
            'p2_south' => $meta['p2_south'],
            'p2_east'  => $meta['p2_east'],
            'p2_west'  => $meta['p2_west'],
        );

        foreach ($walls_map as $wall_key => $ids_str) {
            if (empty($ids_str)) continue;
            $ids = array_filter(array_map('trim', explode(',', $ids_str)));
            if (empty($ids)) continue;

            $is_pillar = (strpos($wall_key, 'p1_') === 0 || strpos($wall_key, 'p2_') === 0);
            $target_pillar = null;
            if ($is_pillar) {
                $pid = substr($wall_key, 0, 2);
                foreach ($pillars_data as $p) {
                    if ($p['id'] === $pid) {
                        $target_pillar = $p;
                        break;
                    }
                }
                if (!$target_pillar) continue;
            }

            if ($is_pillar) {
                $dir = substr($wall_key, 3);
                $wall_w = ($dir === 'north' || $dir === 'south') ? $target_pillar['w'] : $target_pillar['d'];
            } else {
                $wall_w = ($wall_key === 'north' || $wall_key === 'south') ? $room_w : $room_d;
            }

            $margin = 0.5;
            $effective_width = $wall_w - ($margin * 2);
            $count = count($ids);
            $spacing = 2.0;
            if ($count * $spacing > $effective_width) $spacing = $effective_width / $count;
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

                if (!$is_pillar) {
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
                } else {
                    $cx = $target_pillar['x'];
                    $cz = $target_pillar['z'];
                    $hw = $target_pillar['w'] / 2;
                    $hd = $target_pillar['d'] / 2;
                    $dir = substr($wall_key, 3);
                    if ($dir === 'north') {
                        $px = $cx + $offset;
                        $pz = $cz - $hd - $p_offset;
                    } elseif ($dir === 'south') {
                        $px = $cx + $offset;
                        $pz = $cz + $hd + $p_offset;
                    } elseif ($dir === 'east') {
                        $pz = $cz + $offset;
                        $px = $cx + $hw + $p_offset;
                    } elseif ($dir === 'west') {
                        $pz = $cz + $offset;
                        $px = $cx - $hw - $p_offset;
                    }
                }

                $layout['artworks'][] = array(
                    'id'    => $art_id,
                    'image' => $img_url,
                    'title' => $art_post->post_title,
                    'desc'  => wp_strip_all_tags($art_post->post_content),
                    'link'  => get_post_meta($art_id, '_edel_art_link', true),
                    'wall'  => $wall_key,
                    'x'     => $px,
                    'y' => 1.5,
                    'z' => $pz,
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
        $layout  = isset($_POST['layout'])  ? wp_unslash($_POST['layout']) : '';

        if (!$post_id || !$layout) wp_send_json_error(array('message' => __('Missing data', 'edel-museum-generator')));

        update_post_meta($post_id, '_edel_museum_layout', $layout);
        wp_send_json_success(array('message' => __('Saved successfully!', 'edel-museum-generator')));
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
