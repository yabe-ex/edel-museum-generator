jQuery(document).ready(function ($) {
    var container = document.querySelector('.ai-museum-container');
    if (!container) return;

    var $container = $(container);

    var jsonId = $container.attr('data-json-id');
    var layout = null;

    if (jsonId) {
        var inputElement = document.getElementById(jsonId);
        if (inputElement && inputElement.value) {
            try {
                layout = JSON.parse(decodeURIComponent(inputElement.value));
            } catch (e) {
                console.error('Edel Editor: JSON Parse Error', e);
            }
        }
    }

    if (!layout) {
        layout = $container.data('layout');
    }

    if (!layout || !layout.room) {
        return;
    }

    var postId = $container.data('post-id');
    var canvas = $container.find('.ai-museum-canvas')[0];

    // --- Loading ---
    var $loadingScreen = $('<div>')
        .attr('id', 'ai-loading-screen')
        .css({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#333',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: 'sans-serif'
        })
        .appendTo($container);

    var $loadingBarContainer = $('<div>')
        .css({
            width: '200px',
            height: '4px',
            background: '#555',
            marginTop: '10px',
            borderRadius: '2px',
            overflow: 'hidden'
        })
        .appendTo($loadingScreen);

    var $loadingBar = $('<div>')
        .css({
            width: '0%',
            height: '100%',
            background: '#2271b1',
            transition: 'width 0.2s'
        })
        .appendTo($loadingBarContainer);

    var $loadingText = $('<div>')
        .css({ marginTop: '8px', fontSize: '12px', color: '#ccc' })
        .text(edel_vars.txt_loading_assets + ' 0%')
        .appendTo($loadingScreen);

    const manager = new THREE.LoadingManager();
    manager.onProgress = function (url, itemsLoaded, itemsTotal) {
        const percent = Math.round((itemsLoaded / itemsTotal) * 100);
        $loadingBar.css('width', percent + '%');
        $loadingText.text(edel_vars.txt_loading_assets + ' ' + percent + '%');
    };
    manager.onLoad = function () {
        $loadingScreen.fadeOut(500);
    };
    manager.onError = function (url) {
        console.error('Error loading ' + url);
    };
    setTimeout(function () {
        if ($loadingScreen.is(':visible')) {
            $loadingScreen.fadeOut(500);
        }
    }, 5000);

    // --- UI Layout & Styling (Theme Conflict Fixes) ---
    var baseBtnStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 14px',
        fontSize: '13px',
        fontWeight: '500',
        lineHeight: 'normal',
        color: '#2271b1',
        backgroundColor: '#f6f7f7',
        border: '1px solid #2271b1',
        borderRadius: '4px',
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'all 0.2s',
        boxSizing: 'border-box',
        minHeight: '32px',
        verticalAlign: 'middle',
        appearance: 'none',
        boxShadow: 'none',
        margin: '0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif'
    };

    var activeBtnStyle = {
        color: '#fff',
        backgroundColor: '#2271b1',
        borderColor: '#2271b1'
    };

    var dangerBtnStyle = {
        color: '#d63638',
        backgroundColor: '#fff',
        borderColor: '#d63638'
    };

    // ★追加: 「閲覧モードに戻る」ボタンのスタイル修正
    var $switchBtn = $container.find('a.button');
    if ($switchBtn.length) {
        $switchBtn.css(
            $.extend({}, baseBtnStyle, {
                zIndex: '1001',
                backgroundColor: '#f6f7f7',
                color: '#2271b1',
                width: 'auto',
                height: 'auto'
            })
        );
        $switchBtn.hover(
            function () {
                $(this).css({ backgroundColor: '#f0f0f1', color: '#135e96' });
            },
            function () {
                $(this).css({ backgroundColor: '#f6f7f7', color: '#2271b1' });
            }
        );
    }

    var $saveBtn = $container.find('#museum-save');
    var $clearBtn = $container.find('#museum-clear');
    var $scaleSlider = $container.find('#scale-slider');
    var $scaleValue = $container.find('#scale-value');
    var $scaleWrapper = $container.find('#museum-scale-wrapper');

    // コントロールバーのスタイル
    var $controlsContainer = $saveBtn.parent();
    $controlsContainer.css({
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        justifyContent: 'flex-end',
        padding: '10px',
        background: '#f0f0f1',
        borderTop: '1px solid #ddd'
    });

    // ボタンにスタイル適用
    $saveBtn.css($.extend({}, baseBtnStyle, activeBtnStyle));
    $clearBtn.css($.extend({}, baseBtnStyle, dangerBtnStyle));

    $scaleSlider.attr('min', '0.1');

    var $rotateWrapper = $('<div>').attr('id', 'museum-rotate-wrapper').css({
        display: 'none',
        alignItems: 'center',
        gap: '8px',
        background: '#444',
        padding: '2px 8px',
        borderRadius: '4px',
        marginLeft: '10px'
    });
    // var $rotateLabel = $('<label>').css({ fontSize: '13px', color: '#fff' }).text('RotateA:');
    var $rotateLabel = $('<label>').css({ fontSize: '13px', color: '#fff', whiteSpace: 'nowrap' }).text(edel_vars.txt_rotate_label);
    var $rotateSlider = $('<input>').attr({ type: 'range', id: 'rotate-slider', min: '-180', max: '180', step: '15', value: '0' });
    var $rotateValue = $('<span>').attr('id', 'rotate-value').css({ fontSize: '12px', minWidth: '35px', color: '#fff' }).text('0°');
    $rotateWrapper.append($rotateLabel).append($rotateSlider).append($rotateValue);
    $scaleWrapper.after($rotateWrapper);

    var width = $container.width();
    var height = 500;

    var $notification = $('<div>')
        .css({
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '15px 30px',
            borderRadius: '8px',
            zIndex: 2000,
            display: 'none',
            fontSize: '16px',
            fontWeight: 'bold',
            pointerEvents: 'none'
        })
        .appendTo($container);

    function showNotification(message) {
        $notification.text(message).stop(true, true).fadeIn(300).delay(1500).fadeOut(500);
    }

    var $modeControls = $('<div>').css({ display: 'flex', gap: '8px', marginRight: 'auto' });
    $controlsContainer.prepend($modeControls);

    var $btnTranslate = $('<button type="button">' + edel_vars.txt_move_t + '</button>').appendTo($modeControls);
    var $btnRotate = $('<button type="button">' + edel_vars.txt_rotate_r + '</button>').appendTo($modeControls);

    $btnTranslate.css(baseBtnStyle);
    $btnRotate.css(baseBtnStyle);

    function updateModeButtons(mode) {
        if (mode === 'translate') {
            $btnTranslate.css(activeBtnStyle);
            $btnRotate.css($.extend({}, baseBtnStyle, { color: '#2271b1', backgroundColor: '#f6f7f7' }));
        } else {
            $btnTranslate.css($.extend({}, baseBtnStyle, { color: '#2271b1', backgroundColor: '#f6f7f7' }));
            $btnRotate.css(activeBtnStyle);
        }
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaaaaaa);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 8, 18);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.outputEncoding = THREE.sRGBEncoding;

    const orbit = new THREE.OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;

    const transform = new THREE.TransformControls(camera, renderer.domElement);
    transform.setMode('translate');
    updateModeButtons('translate');
    scene.add(transform);

    transform.addEventListener('dragging-changed', function (event) {
        orbit.enabled = !event.value;
    });

    $btnTranslate.on('click', function () {
        setTransformMode('translate');
    });
    $btnRotate.on('click', function () {
        setTransformMode('rotate');
    });

    function setTransformMode(mode) {
        transform.setMode(mode);
        updateModeButtons(mode);
        transform.setSpace('local');
        if (mode === 'rotate') {
            transform.showX = false;
            transform.showY = true;
            transform.showZ = false;
        } else {
            transform.showX = true;
            transform.showY = true;
            transform.showZ = true;
        }
    }

    window.addEventListener('keydown', function (event) {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
        switch (event.key.toLowerCase()) {
            case 't':
                setTransformMode('translate');
                break;
            case 'r':
                setTransformMode('rotate');
                break;
        }
    });

    const room = layout.room || {};
    const roomW = room.width || 16;
    const roomD = room.depth || 16;
    const roomH = room.height || 4;
    const pillars = layout.pillars || [];

    const floorUrl = room.floor_image || '';
    const wallUrl = room.wall_image || '';
    const pillarUrl = room.pillar_image || '';
    const ceilingUrl = room.ceiling_image || '';

    const roomBright = parseFloat(room.room_brightness) || 1.2;

    const useReflection = room.floor_reflection === true;
    const reflectionIntensity = parseFloat(room.reflection_intensity) || 0.3;

    scene.add(new THREE.AmbientLight(0xffffff, 0.1));
    const roomAmbient = new THREE.AmbientLight(0xffffff, 0.75 * roomBright);
    scene.add(roomAmbient);
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.6 * roomBright);
    dir1.position.set(5, 10, 7);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.4 * roomBright);
    dir2.position.set(-5, 5, -5);
    scene.add(dir2);

    scene.fog = new THREE.FogExp2(0xaaaaaa, 0.015);

    createRoom(
        scene,
        roomW,
        roomH,
        roomD,
        room.style,
        pillars,
        floorUrl,
        wallUrl,
        pillarUrl,
        ceilingUrl,
        useReflection,
        reflectionIntensity,
        manager
    );

    const artworks = [];
    const loader = new THREE.TextureLoader(manager);
    const gltfLoader = new THREE.GLTFLoader(manager);

    (layout.artworks || []).forEach((art, idx) => {
        let x = art.x;
        let y = art.y;
        let z = art.z;
        const wall = art.wall || 'north';
        const defaultY = 1.5;
        if (x === undefined || x === null || z === undefined || z === null) {
            const margin = 0.05;
            y = defaultY;
            const rW = roomW;
            const rD = roomD;
            switch (wall) {
                case 'north':
                    x = 0;
                    z = -rD / 2 + margin;
                    break;
                case 'south':
                    x = 0;
                    z = rD / 2 - margin;
                    break;
                case 'east':
                    x = rW / 2 - margin;
                    z = 0;
                    break;
                case 'west':
                    x = -rW / 2 + margin;
                    z = 0;
                    break;
                default:
                    x = 0;
                    z = -rD / 2 + margin;
                    break;
            }
        }

        let rotY = 0;
        if (wall === 'north') rotY = 0;
        if (wall === 'south') rotY = Math.PI;
        if (wall === 'east') rotY = -Math.PI / 2;
        if (wall === 'west') rotY = Math.PI / 2;

        if (art.rotationY !== undefined) {
            rotY = art.rotationY;
        }

        if (art.image) {
            const initialGeo = new THREE.PlaneGeometry(1, 1);
            const material = new THREE.MeshBasicMaterial({ map: null, side: THREE.DoubleSide });
            const plane = new THREE.Mesh(initialGeo, material);
            loader.load(art.image, (texture) => {
                texture.encoding = THREE.sRGBEncoding;
                plane.material.map = texture;
                plane.material.needsUpdate = true;
                const img = texture.image;
                const aspect = img.width / img.height;
                plane.geometry.dispose();
                plane.geometry = new THREE.PlaneGeometry(aspect, 1.0);
            });

            plane.position.set(x, y, z);
            plane.rotation.y = rotY;
            if (art.scale && typeof art.scale === 'object') {
                const s = art.scale.x ?? 1;
                plane.scale.set(s, s, 1);
            }

            plane.userData.index = idx;
            plane.userData.wall = wall;
            artworks.push(plane);
            scene.add(plane);
        }
    });

    transform.addEventListener('change', () => {
        const obj = transform.object;
        if (!obj) return;

        if (transform.getMode() === 'rotate') {
            obj.rotation.x = 0;
            obj.rotation.z = 0;
            if ($rotateWrapper.is(':visible')) {
                let deg = THREE.MathUtils.radToDeg(obj.rotation.y);
                deg = Math.round(deg) % 360;
                if (deg > 180) deg -= 360;
                else if (deg < -180) deg += 360;
                $rotateSlider.val(deg);
                $rotateValue.text(deg + '°');
            }
        }

        const wallKey = obj.userData.wall || 'north';
        const margin = 0.05;
        let padding = 0.5;

        if (wallKey === 'north') {
            obj.position.z = -(roomD / 2) + margin;
            obj.position.x = THREE.MathUtils.clamp(obj.position.x, -roomW / 2 + padding, roomW / 2 - padding);
        } else if (wallKey === 'south') {
            obj.position.z = roomD / 2 - margin;
            obj.position.x = THREE.MathUtils.clamp(obj.position.x, -roomW / 2 + padding, roomW / 2 - padding);
        } else if (wallKey === 'east') {
            obj.position.x = roomW / 2 - margin;
            obj.position.z = THREE.MathUtils.clamp(obj.position.z, -roomD / 2 + padding, roomD / 2 - padding);
        } else if (wallKey === 'west') {
            obj.position.x = -(roomW / 2) + margin;
            obj.position.z = THREE.MathUtils.clamp(obj.position.z, -roomD / 2 + padding, roomD / 2 - padding);
        }

        const halfH = roomH / 2;
        const limitY = halfH - 0.6;
        obj.position.y = THREE.MathUtils.clamp(obj.position.y, -limitY, limitY);
    });

    let selectedObject = null;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onPointerDown(event) {
        if (event.target !== canvas) return;
        if (transform.axis !== null) return;

        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(artworks, true);

        if (hits.length > 0) {
            let target = hits[0].object;
            while (target && !target.userData.wall && target.parent) {
                target = target.parent;
            }
            if (target && target.userData.wall) {
                selectArtwork(target);
            } else {
                deselectArtwork();
            }
        } else {
            deselectArtwork();
        }
    }

    function selectArtwork(obj) {
        selectedObject = obj;
        transform.attach(obj);
        transform.setSpace('local');

        if (transform.getMode() === 'rotate') {
            transform.showX = false;
            transform.showY = true;
            transform.showZ = false;
        } else {
            transform.showX = true;
            transform.showY = true;
            transform.showZ = true;
        }

        if ($scaleWrapper && $scaleSlider) {
            $scaleWrapper.css('display', 'flex');
            let currentRatio = 1.0;
            if (obj.userData.baseScale) {
                currentRatio = obj.scale.x / obj.userData.baseScale;
            } else {
                currentRatio = obj.scale.x;
            }
            $scaleSlider.val(currentRatio);
            $scaleValue.text(currentRatio.toFixed(1) + 'x');
        }

        if ($rotateWrapper && $rotateSlider) {
            $rotateWrapper.css('display', 'flex');
            let deg = THREE.MathUtils.radToDeg(obj.rotation.y);
            deg = Math.round(deg) % 360;
            if (deg > 180) deg -= 360;
            else if (deg < -180) deg += 360;
            $rotateSlider.val(deg);
            $rotateValue.text(deg + '°');
        }
    }

    function deselectArtwork() {
        selectedObject = null;
        transform.detach();
        if ($scaleWrapper) $scaleWrapper.hide();
        if ($rotateWrapper) $rotateWrapper.hide();
    }
    canvas.addEventListener('pointerdown', onPointerDown);

    $scaleSlider.on('input', function (e) {
        if (!selectedObject) return;
        const val = parseFloat($(this).val());
        if (selectedObject.userData.baseScale) {
            const s = val * selectedObject.userData.baseScale;
            selectedObject.scale.set(s, s, s);
        } else {
            selectedObject.scale.set(val, val, 1);
        }
        $scaleValue.text(val.toFixed(1) + 'x');
    });

    $rotateSlider.on('input', function (e) {
        if (!selectedObject) return;
        const deg = parseFloat($(this).val());
        const rad = THREE.MathUtils.degToRad(deg);
        selectedObject.rotation.y = rad;
        selectedObject.rotation.x = 0;
        selectedObject.rotation.z = 0;
        $rotateValue.text(deg + '°');
    });

    // --- Save Button ---
    $saveBtn.on('click', function () {
        if (!postId) return;
        var newLayout = JSON.parse(JSON.stringify(layout));
        artworks.forEach(function (mesh) {
            var idx = mesh.userData.index;
            newLayout.artworks[idx].x = mesh.position.x;
            newLayout.artworks[idx].y = mesh.position.y;
            newLayout.artworks[idx].z = mesh.position.z;
            newLayout.artworks[idx].scale = { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z };

            mesh.rotation.x = 0;
            mesh.rotation.z = 0;
            newLayout.artworks[idx].rotationY = mesh.rotation.y;
        });

        var originalText = $saveBtn.text();
        $saveBtn.prop('disabled', true).text(edel_vars.txt_loading || 'Saving...');

        $.ajax({
            url: edel_vars.ajaxurl,
            type: 'POST',
            data: { action: edel_vars.action_save, post_id: postId, layout: JSON.stringify(newLayout), _nonce: edel_vars.nonce },
            success: function (res) {
                $saveBtn.prop('disabled', false).text(originalText);
                if (res.success) {
                    showNotification(edel_vars.txt_saved);
                } else {
                    alert(edel_vars.txt_error);
                }
            },
            error: function () {
                $saveBtn.prop('disabled', false).text(originalText);
                alert(edel_vars.txt_error);
            }
        });
    });

    $clearBtn.on('click', function () {
        if (!postId || !confirm(edel_vars.txt_confirm_reset)) return;
        $clearBtn.prop('disabled', true).text('Processing...');
        $.ajax({
            url: edel_vars.ajaxurl,
            type: 'POST',
            data: { action: edel_vars.action_clear, post_id: postId, _nonce: edel_vars.nonce },
            success: function (res) {
                if (res.success) {
                    alert(res.data.message);
                    location.reload();
                } else {
                    alert(edel_vars.txt_error);
                    $clearBtn.prop('disabled', false).text(edel_vars.txt_reset);
                }
            },
            error: function () {
                alert(edel_vars.txt_error);
                $clearBtn.prop('disabled', false).text(edel_vars.txt_reset);
            }
        });
    });

    function animate() {
        requestAnimationFrame(animate);
        orbit.update();
        renderer.render(scene, camera);
    }
    animate();
    $(window).on('resize', function () {
        var w = $container.width();
        camera.aspect = w / 500;
        camera.updateProjectionMatrix();
        renderer.setSize(w, 500);
    });

    function createRoom(
        scene,
        width,
        height,
        depth,
        style,
        pillarsData,
        floorUrl,
        wallUrl,
        pillarUrl,
        ceilingUrl,
        useReflection,
        reflectionIntensity,
        manager
    ) {
        const styles = { gallery: { wallColor: 0xffffff, bgColor: 0xaaaaaa } };
        const s = styles.gallery;
        scene.background = new THREE.Color(s.bgColor);

        let wallMaterial;
        if (wallUrl) {
            const loader = new THREE.TextureLoader(manager);
            const wallTex = loader.load(wallUrl);
            wallTex.encoding = THREE.sRGBEncoding;
            wallTex.wrapS = THREE.RepeatWrapping;
            wallTex.wrapT = THREE.RepeatWrapping;
            wallTex.repeat.set(width / 4, height / 4);
            wallMaterial = new THREE.MeshStandardMaterial({ map: wallTex, color: 0xffffff, side: THREE.BackSide, roughness: 0.8 });
        } else {
            wallMaterial = new THREE.MeshStandardMaterial({ color: s.wallColor, side: THREE.BackSide, roughness: 0.9 });
        }
        const roomGeo = new THREE.BoxGeometry(width, height, depth);
        scene.add(new THREE.Mesh(roomGeo, wallMaterial));

        const floorGeo = new THREE.PlaneGeometry(width, depth);
        if (useReflection && typeof THREE.Reflector !== 'undefined') {
            const reflector = new THREE.Reflector(floorGeo, { clipBias: 0.003, textureWidth: 512, textureHeight: 512, color: 0x666666 });
            reflector.rotation.x = -Math.PI / 2;
            reflector.position.y = -height / 2 - 0.1;
            scene.add(reflector);
            if (floorUrl) {
                const loader = new THREE.TextureLoader(manager);
                const floorTex = loader.load(floorUrl);
                floorTex.encoding = THREE.sRGBEncoding;
                floorTex.wrapS = THREE.RepeatWrapping;
                floorTex.wrapT = THREE.RepeatWrapping;
                floorTex.repeat.set(width / 2, depth / 2);
                const opacity = Math.max(0, 1.0 - (reflectionIntensity || 0.3));
                const overlayMat = new THREE.MeshBasicMaterial({
                    map: floorTex,
                    transparent: true,
                    opacity: opacity,
                    depthWrite: false,
                    polygonOffset: true,
                    polygonOffsetFactor: -10,
                    polygonOffsetUnits: -10
                });
                const overlayMesh = new THREE.Mesh(floorGeo, overlayMat);
                overlayMesh.rotation.x = -Math.PI / 2;
                overlayMesh.position.y = -height / 2 + 0.05;
                overlayMesh.renderOrder = 1;
                scene.add(overlayMesh);
            }
        } else {
            let floorMaterial;
            if (floorUrl) {
                const loader = new THREE.TextureLoader(manager);
                const floorTex = loader.load(floorUrl);
                floorTex.encoding = THREE.sRGBEncoding;
                floorTex.wrapS = THREE.RepeatWrapping;
                floorTex.wrapT = THREE.RepeatWrapping;
                floorTex.repeat.set(width / 2, depth / 2);
                floorMaterial = new THREE.MeshStandardMaterial({ map: floorTex, color: 0xffffff, roughness: 0.8, metalness: 0.1 });
            } else {
                floorMaterial = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8, metalness: 0.1 });
            }
            const floorMesh = new THREE.Mesh(floorGeo, floorMaterial);
            floorMesh.rotation.x = -Math.PI / 2;
            floorMesh.position.y = -height / 2 + 0.01;
            scene.add(floorMesh);
        }

        let ceilingMaterial;
        if (ceilingUrl) {
            const loader = new THREE.TextureLoader(manager);
            const ceilTex = loader.load(ceilingUrl);
            ceilTex.encoding = THREE.sRGBEncoding;
            ceilTex.wrapS = THREE.RepeatWrapping;
            ceilTex.wrapT = THREE.RepeatWrapping;
            ceilTex.repeat.set(width / 2, depth / 2);
            ceilingMaterial = new THREE.MeshStandardMaterial({ map: ceilTex, color: 0xffffff, side: THREE.FrontSide, roughness: 0.9 });
        } else {
            ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.FrontSide, roughness: 0.9 });
        }
        const ceilingGeo = new THREE.PlaneGeometry(width, depth);
        const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMaterial);
        ceilingMesh.rotation.x = Math.PI / 2;
        ceilingMesh.position.y = height / 2 - 0.01;
        scene.add(ceilingMesh);
    }
});
