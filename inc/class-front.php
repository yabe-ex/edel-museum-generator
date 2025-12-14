<?php

class EdelMuseumGeneratorFront {

    public function init() {
        add_shortcode('edel_museum', array($this, 'render_museum_shortcode'));
        add_shortcode('ai_museum', array($this, 'render_museum_shortcode'));
        add_action('wp_enqueue_scripts', array($this, 'front_enqueue'));
    }

    public function front_enqueue() {
        $is_edit_mode = isset($_GET['museum_edit']) && $_GET['museum_edit'] === '1';
        $version = (defined('EDEL_MUSEUM_GENERATOR_DEVELOP') && true === EDEL_MUSEUM_GENERATOR_DEVELOP) ? time() : EDEL_MUSEUM_GENERATOR_VERSION;

        wp_enqueue_script('three', 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', array(), '0.128.0', true);
        wp_enqueue_script('three-gltf-loader', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js', array('three'), '0.128.0', true);
        wp_enqueue_script('nipplejs', 'https://cdnjs.cloudflare.com/ajax/libs/nipplejs/0.10.1/nipple.min.js', array(), '0.10.1', true);

        // ★修正: Lite版のNonceとAction名
        $localize_data = array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce('edel-museum-generator'),
            'action_save'  => 'edel_museum_save_layout',
            'action_clear' => 'edel_museum_clear_layout',
            'txt_saved' => __('Saved!', 'edel-museum-generator'),
            'txt_error' => __('Error', 'edel-museum-generator'),
            'txt_reset' => __('Reset', 'edel-museum-generator'),
            'txt_confirm_reset' => __('Are you sure you want to reset layout?', 'edel-museum-generator')
        );

        if ($is_edit_mode) {
            wp_enqueue_script('three-orbitcontrols', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js', array('three'), '0.128.0', true);
            wp_enqueue_script('three-transformcontrols', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TransformControls.js', array('three'), '0.128.0', true);

            wp_enqueue_script(EDEL_MUSEUM_GENERATOR_SLUG . '-editor', EDEL_MUSEUM_GENERATOR_URL . '/js/edel-editor.js', array('jquery', 'three', 'three-orbitcontrols', 'three-transformcontrols', 'three-gltf-loader'), $version, true);
            wp_localize_script(EDEL_MUSEUM_GENERATOR_SLUG . '-editor', 'edel_vars', $localize_data);
        } else {
            wp_enqueue_script('three-pointerlockcontrols', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/PointerLockControls.js', array('three'), '0.128.0', true);

            wp_enqueue_script(EDEL_MUSEUM_GENERATOR_SLUG . '-viewer', EDEL_MUSEUM_GENERATOR_URL . '/js/edel-viewer.js', array('jquery', 'three', 'three-pointerlockcontrols', 'three-gltf-loader', 'nipplejs'), $version, true);
            wp_localize_script(EDEL_MUSEUM_GENERATOR_SLUG . '-viewer', 'edel_vars', $localize_data);
        }

        wp_enqueue_style(EDEL_MUSEUM_GENERATOR_SLUG . '-front', EDEL_MUSEUM_GENERATOR_URL . '/css/front.css', array(), $version);
    }

    private function build_layout_from_exhibition($exhibition_id) {
        $meta = get_post_meta($exhibition_id, '_edel_exhibition_data', true);
        if (!$meta) return null;

        $room_w = 16;
        $room_h = 4;
        $room_d = 16;
        $num_pillars = 0; // Lite: 柱なし
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
                    'y' => 1.5,
                    'z' => $pz,
                    'scale' => array('x' => 1, 'y' => 1, 'z' => 1),
                );
            }
        }
        return $layout;
    }

    public function render_museum_shortcode($atts) {
        $atts = shortcode_atts(array('id' => 0), $atts);
        $exhibition_id = intval($atts['id']);

        if (!$exhibition_id) return '<p>' . __('Error: Please specify Exhibition ID.', 'edel-museum-generator') . '</p>';

        $saved_json = get_post_meta($exhibition_id, '_edel_museum_layout', true);
        $layout = null;
        if (!empty($saved_json)) {
            $decoded = json_decode($saved_json, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) $layout = $decoded;
        }

        if (!$layout) {
            $layout = $this->build_layout_from_exhibition($exhibition_id);
        } else {
            $meta = get_post_meta($exhibition_id, '_edel_exhibition_data', true) ?: array();
            if (isset($layout['room'])) {
                $layout['room']['floor_image']   = isset($meta['floor_img']) ? $meta['floor_img'] : '';
                $layout['room']['wall_image']    = isset($meta['wall_img']) ? $meta['wall_img'] : '';
                $layout['room']['pillar_image']  = ''; // Lite: 柱画像なし
                $layout['room']['ceiling_image'] = isset($meta['ceiling_img']) ? $meta['ceiling_img'] : '';
                $layout['room']['room_brightness'] = isset($meta['room_brightness']) ? $meta['room_brightness'] : '1.2';
                $layout['room']['spot_brightness'] = isset($meta['spot_brightness']) ? $meta['spot_brightness'] : '1.0';
                $layout['room']['movement_speed'] = isset($meta['movement_speed']) ? $meta['movement_speed'] : '20.0';
            }

            if (isset($layout['artworks']) && is_array($layout['artworks'])) {
                foreach ($layout['artworks'] as &$art) {
                    if (isset($art['id'])) {
                        $p = get_post($art['id']);
                        if ($p) {
                            $art['title'] = $p->post_title;
                            $art['desc']  = wp_strip_all_tags($p->post_content);
                            $art['link']  = ''; // Lite: リンクなし
                            $img = get_the_post_thumbnail_url($art['id'], 'large');
                            if ($img) $art['image'] = $img;
                            $art['glb'] = ''; // Lite: GLBなし
                        }
                    }
                }
            }
        }

        if (!$layout) return '<p>' . __('Error: Data not found.', 'edel-museum-generator') . '</p>';

        $json_encoded = rawurlencode(wp_json_encode($layout, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $is_edit_mode = isset($_GET['museum_edit']) && $_GET['museum_edit'] === '1';
        $can_manage = current_user_can('edit_post', $exhibition_id);
        $toggle_url = $is_edit_mode ? remove_query_arg('museum_edit') : add_query_arg('museum_edit', '1');
        $toggle_text = $is_edit_mode ? __('Back to Viewer', 'edel-museum-generator') : __('Switch to Editor', 'edel-museum-generator');
        $toggle_class = $is_edit_mode ? 'button' : 'button button-primary';

        $data_id = 'edel-museum-data-' . $exhibition_id;

        ob_start();
?>
        <div class="ai-museum-container"
            data-json-id="<?php echo esc_attr($data_id); ?>"
            data-post-id="<?php echo esc_attr($exhibition_id); ?>"
            style="width:100%;max-width:900px;margin:0 auto; position:relative; overflow:hidden;">

            <?php if ($can_manage) : ?>
                <div style="position:absolute; top:10px; right:10px; z-index:1000;">
                    <a href="<?php echo esc_url($toggle_url); ?>" class="<?php echo esc_attr($toggle_class); ?>" style="text-decoration:none;">
                        <?php echo esc_html($toggle_text); ?>
                    </a>
                </div>
            <?php endif; ?>

            <div id="ai-crosshair"></div>

            <div id="ai-modal-overlay">
                <div id="ai-modal-content">
                    <span id="ai-modal-close">&times;</span>
                    <img id="ai-modal-image" src="" alt="">
                    <h3 id="ai-modal-title"></h3>
                    <div id="ai-modal-desc"></div>
                </div>
            </div>

            <div id="ai-joystick-zone" style="position:absolute; bottom:20px; left:20px; width:120px; height:120px; z-index:900; display:none;"></div>

            <canvas class="ai-museum-canvas" style="display:block; width:100%; background:#000;"></canvas>

            <?php if ($is_edit_mode) : ?>
                <div style="background: #333; color: #fff; padding: 10px; display:flex; gap:15px; align-items:center; justify-content:space-between; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div id="museum-scale-wrapper" style="display:none; align-items:center; gap:8px; background:#444; padding:2px 8px; border-radius:4px;">
                            <label for="scale-slider" style="font-size:13px;"><?php _e('Scale:', 'edel-museum-generator'); ?></label>
                            <input type="range" id="scale-slider" min="0.1" max="3.0" step="0.1" value="1.0">
                            <span id="scale-value" style="font-size:12px; min-width:30px;">1.0x</span>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button type="button" id="museum-clear" class="button" style="color: #d63638; border-color: #d63638;"><?php _e('Reset Layout', 'edel-museum-generator'); ?></button>
                        <button type="button" id="museum-save" class="button button-primary"><?php _e('Save Layout', 'edel-museum-generator'); ?></button>
                    </div>
                </div>
            <?php endif; ?>
        </div>

        <input type="hidden" id="<?php echo esc_attr($data_id); ?>" value="<?php echo $json_encoded; ?>">
<?php
        return ob_get_clean();
    }
}
