jQuery(document).ready(function ($) {
    // 修正: クラス名を変更 (.edel-ai-museum-container)
    $('.edel-ai-museum-container').each(function () {
        initMuseum(this);
    });

    function initMuseum(container) {
        var $container = $(container);
        var jsonId = $container.attr('data-json-id');
        var layout = null;

        if (jsonId) {
            var inputElement = document.getElementById(jsonId);
            if (inputElement && inputElement.value) {
                try {
                    layout = JSON.parse(decodeURIComponent(inputElement.value));
                } catch (e) {
                    console.error('Edel Museum: JSON Parse Error', e);
                }
            }
        }
        if (!layout) layout = $container.data('layout');
        if (!layout || !layout.room) return;

        // 修正: クラス名を変更 (.edel-ai-museum-canvas)
        var canvas = $container.find('.edel-ai-museum-canvas')[0];

        // --- Loading ---
        // 修正: ID名を変更 (edel-ai-loading-screen)
        var $loadingScreen = $('<div>')
            .attr('id', 'edel-ai-loading-screen')
            .css({
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: '#000',
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
                background: '#333',
                marginTop: '10px',
                borderRadius: '2px',
                overflow: 'hidden'
            })
            .appendTo($loadingScreen);

        var $loadingBar = $('<div>')
            .css({
                width: '0%',
                height: '100%',
                background: '#fff',
                transition: 'width 0.2s'
            })
            .appendTo($loadingBarContainer);

        var $loadingText = $('<div>')
            .css({ marginTop: '8px', fontSize: '12px', color: '#888' })
            .text(edel_vars.txt_loading + ' 0%')
            .appendTo($loadingScreen);

        const manager = new THREE.LoadingManager();
        manager.onProgress = function (url, itemsLoaded, itemsTotal) {
            const percent = itemsTotal > 0 ? Math.round((itemsLoaded / itemsTotal) * 100) : 100;
            $loadingBar.css('width', percent + '%');
            $loadingText.text(edel_vars.txt_loading + ' ' + percent + '%');
        };
        manager.onLoad = function () {
            console.log('Loading Complete.');
            $loadingScreen.fadeOut(500);
        };
        manager.onError = function (url) {
            console.error('Error loading ' + url);
        };
        setTimeout(function () {
            if ($loadingScreen.is(':visible')) $loadingScreen.fadeOut(500);
        }, 5000);

        function setImportantStyles(element, styles) {
            if (!element) return;
            var domEl = element.jquery ? element[0] : element;
            if (!domEl || !domEl.style) return;

            for (var prop in styles) {
                domEl.style.setProperty(prop, styles[prop], 'important');
            }
        }

        var baseBtnStyle = {
            display: 'inline-flex',
            'align-items': 'center',
            'justify-content': 'center',
            padding: '6px 14px',
            'font-size': '13px',
            'font-weight': '500',
            'line-height': 'normal',
            color: '#2271b1',
            'background-color': '#f6f7f7',
            border: '1px solid #2271b1',
            'border-radius': '4px',
            cursor: 'pointer',
            'text-decoration': 'none',
            transition: 'all 0.2s',
            'box-sizing': 'border-box',
            'min-height': '32px',
            'vertical-align': 'middle',
            appearance: 'none',
            'box-shadow': 'none',
            margin: '0',
            'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            width: 'auto',
            height: 'auto',
            'z-index': '1001'
        };

        var $switchBtn = $container.find('a').filter(function () {
            var text = $(this).text().trim();
            return text.indexOf('編集') !== -1 || text.indexOf('Edit') !== -1 || $(this).hasClass('button');
        });

        if ($switchBtn.length) {
            $switchBtn.each(function () {
                setImportantStyles(this, baseBtnStyle);
                setImportantStyles(this, {
                    'background-color': '#f6f7f7',
                    color: '#2271b1'
                });

                $(this)
                    .on('mouseenter', function () {
                        this.style.setProperty('background-color', '#f0f0f1', 'important');
                        this.style.setProperty('color', '#135e96', 'important');
                    })
                    .on('mouseleave', function () {
                        this.style.setProperty('background-color', '#f6f7f7', 'important');
                        this.style.setProperty('color', '#2271b1', 'important');
                    });
            });
        }

        // 修正: ID名変更 (edel-ai-...)
        var $crosshair = $container.find('#edel-ai-crosshair');
        var $modalOverlay = $container.find('#edel-ai-modal-overlay');
        var $modalClose = $container.find('#edel-ai-modal-close');
        var $modalImage = $container.find('#edel-ai-modal-image');
        var $modalTitle = $container.find('#edel-ai-modal-title');
        var $modalDesc = $container.find('#edel-ai-modal-desc');
        var $modalLink = $container.find('#edel-ai-modal-link');
        var $joystickZone = $container.find('#edel-ai-joystick-zone');

        var width = $container.width();
        var height = 500;

        const scene = new THREE.Scene();
        const room = layout.room || {};
        const roomW = room.width || 16;
        const roomH = room.height || 4;
        const roomD = room.depth || 16;
        const roomStyle = room.style || 'gallery';
        const pillars = layout.pillars || [];

        const floorUrl = room.floor_image || '';
        const wallUrl = room.wall_image || '';
        const pillarUrl = room.pillar_image || '';
        const ceilingUrl = room.ceiling_image || '';

        const defaultRoomBrightness = parseFloat(room.room_brightness) || 1.2;
        const defaultSpotBrightness = parseFloat(room.spot_brightness) || 1.0;
        const useReflection = room.floor_reflection === true;
        const reflectionIntensity = parseFloat(room.reflection_intensity) || 0.3;
        const moveSpeed = parseFloat(room.movement_speed) || 20.0;

        let currentEyeHeight = 1.6;
        const floorY = -roomH / 2;

        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
        camera.position.set(0, floorY + currentEyeHeight, roomD / 2 - 0.5);

        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.outputEncoding = THREE.sRGBEncoding;

        const baseAmbient = new THREE.AmbientLight(0xffffff, 0.1);
        scene.add(baseAmbient);

        const roomLights = [];
        const roomAmbient = new THREE.AmbientLight(0xffffff, 0.75);
        roomAmbient.userData.baseIntensity = 0.75;
        scene.add(roomAmbient);
        roomLights.push(roomAmbient);

        const dir1 = new THREE.DirectionalLight(0xffffff, 0.6);
        dir1.userData.baseIntensity = 0.6;
        dir1.position.set(5, 10, 7);
        dir1.castShadow = true;
        scene.add(dir1);
        roomLights.push(dir1);

        const dir2 = new THREE.DirectionalLight(0xffffff, 0.4);
        dir2.userData.baseIntensity = 0.4;
        dir2.position.set(-5, 5, -5);
        scene.add(dir2);
        roomLights.push(dir2);

        const artLights = [];

        scene.fog = new THREE.FogExp2(0xaaaaaa, 0.015);

        createRoom(
            scene,
            roomW,
            roomH,
            roomD,
            roomStyle,
            pillars,
            floorUrl,
            wallUrl,
            pillarUrl,
            ceilingUrl,
            useReflection,
            reflectionIntensity,
            manager
        );

        const interactableObjects = [];
        if (Array.isArray(layout.artworks)) {
            layout.artworks.forEach((art) => {
                addArtworkPlane(scene, art, roomW, roomH, roomD, artLights, defaultSpotBrightness, interactableObjects, manager);
            });
        }

        // --- Help UI ---
        var $helpContainer = $('<div>')
            .css({
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                zIndex: 1000,
                fontFamily: 'sans-serif',
                fontSize: '13px',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '5px'
            })
            .appendTo($container);

        var $helpContent = $('<div>')
            .css({
                background: 'rgba(0, 0, 0, 0.6)',
                padding: '12px 15px',
                borderRadius: '6px',
                lineHeight: '1.6',
                marginBottom: '5px',
                backdropFilter: 'blur(2px)'
            })
            .html(
                '<strong style="border-bottom:1px solid #999; color:#fff; display:block; margin-bottom:5px;">' +
                    edel_vars.txt_controls_title +
                    '</strong>' +
                    '<span style="color:#ccc">' +
                    edel_vars.txt_move +
                    '</span> W, A, S, D<br>' +
                    '<span style="color:#ccc">' +
                    edel_vars.txt_height +
                    '</span> E (Up), Q (Down)<br>' +
                    '<span style="color:#ccc">' +
                    edel_vars.txt_look +
                    '</span> Mouse<br>' +
                    '<span style="color:#ccc">' +
                    edel_vars.txt_cursor +
                    '</span> ' +
                    edel_vars.txt_esc_desc
            )
            .appendTo($helpContainer);

        var $helpBtn = $('<button>')
            .text('?')
            .css({
                background: '#444',
                color: '#fff',
                border: '1px solid #666',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                cursor: 'pointer',
                fontSize: '12px',
                padding: 0,
                fontWeight: 'bold'
            })
            .appendTo($helpContainer);

        $helpBtn.on('click', function (e) {
            e.stopPropagation();
            $helpContent.slideToggle(200);
            if ($uiContainer) $uiContainer.fadeToggle(200);
        });

        $helpContainer.on('mousedown click', function (e) {
            e.stopPropagation();
        });

        // --- Settings UI ---
        var $uiContainer = $('<div>')
            .css({
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '8px',
                zIndex: 1000,
                background: 'rgba(0, 0, 0, 0.6)',
                padding: '12px',
                borderRadius: '8px',
                color: '#fff',
                fontFamily: 'sans-serif',
                fontSize: '12px'
            })
            .appendTo($container);

        var $roomGroup = $('<div>').css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '200px' });
        $roomGroup.append($('<span>').text(edel_vars.txt_room).css({ width: '70px', textAlign: 'right' }));
        var $roomSlider = $('<input>', { type: 'range', min: 0, max: 2.5, step: 0.1, value: defaultRoomBrightness }).css({
            flex: 1,
            cursor: 'pointer'
        });
        $roomGroup.append($roomSlider);
        $uiContainer.append($roomGroup);

        var $spotGroup = $('<div>').css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '200px' });
        $spotGroup.append($('<span>').text(edel_vars.txt_spotlight).css({ width: '70px', textAlign: 'right' }));
        var $spotSlider = $('<input>', { type: 'range', min: 0, max: 2.5, step: 0.1, value: defaultSpotBrightness }).css({
            flex: 1,
            cursor: 'pointer'
        });
        $spotGroup.append($spotSlider);
        $uiContainer.append($spotGroup);

        var updateRoomLights = function (val) {
            roomLights.forEach((l) => (l.intensity = l.userData.baseIntensity * val));
        };
        $roomSlider.on('input', function () {
            updateRoomLights(parseFloat($(this).val()));
        });
        var updateSpotLights = function (val) {
            artLights.forEach((l) => (l.intensity = l.userData.baseIntensity * val));
        };
        $spotSlider.on('input', function () {
            updateSpotLights(parseFloat($(this).val()));
        });
        updateRoomLights(defaultRoomBrightness);
        $uiContainer.find('input').on('mousedown click touchstart', function (e) {
            e.stopPropagation();
        });
        var toggleSlider = function ($slider, func) {
            var val = parseFloat($slider.val());
            var n = val > 0 ? 0 : 1.0;
            $slider.val(n);
            func(n);
        };

        const controls = new THREE.PointerLockControls(camera, renderer.domElement);
        scene.add(controls.getObject());
        const raycaster = new THREE.Raycaster();
        const center = new THREE.Vector2(0, 0);
        let hoveredObj = null;

        $container.on('click', 'canvas', function () {
            if ($modalOverlay.css('display') === 'flex') return;
            if (!isTouchDevice()) {
                if (controls.isLocked) {
                    if (hoveredObj) {
                        openModal(hoveredObj.userData);
                        controls.unlock();
                    }
                } else {
                    controls.lock();
                }
            } else {
                if (hoveredObj) {
                    openModal(hoveredObj.userData);
                }
            }
        });

        function isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }

        function openModal(data) {
            $modalImage.attr('src', data.image || '');
            if (!data.image) $modalImage.hide();
            else $modalImage.show();
            $modalTitle.text(data.title || 'No Title');
            $modalDesc.text(data.desc || '');
            if ($modalLink.length) {
                if (data.link) {
                    $modalLink.attr('href', data.link).show();
                } else {
                    $modalLink.hide();
                }
            }
            $modalOverlay.css('display', 'flex');
        }

        function closeModal() {
            $modalOverlay.hide();
            if (!isTouchDevice()) controls.lock();
        }
        $modalClose.on('click', function () {
            closeModal();
        });
        $modalOverlay.on('click', function (e) {
            if (e.target === this) closeModal();
        });

        const clock = new THREE.Clock();
        const velocity = new THREE.Vector3();
        const direction = new THREE.Vector3();
        const move = { forward: false, back: false, left: false, right: false, up: false, down: false };

        if (isTouchDevice()) {
            $helpContainer.hide();
            if (typeof nipplejs !== 'undefined') {
                var joystick = nipplejs.create({
                    zone: $joystickZone[0],
                    mode: 'static',
                    position: { left: '50%', top: '50%' },
                    color: 'white',
                    size: 80
                });
                joystick.on('move', function (evt, data) {
                    if (data && data.vector) {
                        move.forward = data.vector.y > 0.1;
                        move.back = data.vector.y < -0.1;
                        move.left = data.vector.x < -0.1;
                        move.right = data.vector.x > 0.1;
                    }
                });
                joystick.on('end', function () {
                    move.forward = move.back = move.left = move.right = false;
                });
            }
            let touchStartX = 0,
                touchStartY = 0;
            const lookSpeed = 0.004;
            canvas.addEventListener(
                'touchstart',
                function (e) {
                    // 修正: ID名変更
                    if (e.touches.length === 1 && !$(e.target).closest('#edel-ai-joystick-zone').length) {
                        touchStartX = e.touches[0].pageX;
                        touchStartY = e.touches[0].pageY;
                    }
                },
                { passive: true }
            );
            canvas.addEventListener(
                'touchmove',
                function (e) {
                    // 修正: ID名変更
                    if (e.touches.length === 1 && !$(e.target).closest('#edel-ai-joystick-zone').length) {
                        const deltaX = e.touches[0].pageX - touchStartX;
                        const deltaY = e.touches[0].pageY - touchStartY;
                        camera.rotation.y -= deltaX * lookSpeed;
                        camera.rotation.x -= deltaY * lookSpeed;
                        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
                        touchStartX = e.touches[0].pageX;
                        touchStartY = e.touches[0].pageY;
                    }
                },
                { passive: true }
            );
        }

        const onKeyDown = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    move.forward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    move.left = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    move.back = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    move.right = true;
                    break;
                case 'KeyE':
                    move.up = true;
                    break;
                case 'KeyQ':
                    move.down = true;
                    break;
                case 'KeyR':
                    toggleSlider($roomSlider, updateRoomLights);
                    break;
                case 'KeyL':
                    toggleSlider($spotSlider, updateSpotLights);
                    break;
            }
        };
        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    move.forward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    move.left = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    move.back = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    move.right = false;
                    break;
                case 'KeyE':
                    move.up = false;
                    break;
                case 'KeyQ':
                    move.down = false;
                    break;
            }
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        function checkCollision(position) {
            const playerRadius = 0.5;
            for (let i = 0; i < pillars.length; i++) {
                const p = pillars[i];
                const pW = (p.w || 2) / 2;
                const pD = (p.d || 2) / 2;
                const minX = p.x - pW - playerRadius;
                const maxX = p.x + pW + playerRadius;
                const minZ = p.z - pD - playerRadius;
                const maxZ = p.z + pD + playerRadius;
                if (position.x > minX && position.x < maxX && position.z > minZ && position.z < maxZ) return true;
            }
            return false;
        }

        function animate() {
            requestAnimationFrame(animate);
            if (controls.isLocked === true || isTouchDevice()) {
                const delta = clock.getDelta();
                velocity.x -= velocity.x * 10.0 * delta;
                velocity.z -= velocity.z * 10.0 * delta;
                direction.z = Number(move.forward) - Number(move.back);
                direction.x = Number(move.right) - Number(move.left);
                direction.normalize();

                const speed = moveSpeed;
                if (move.forward || move.back) velocity.z -= direction.z * speed * delta;
                if (move.left || move.right) velocity.x -= direction.x * speed * delta;

                const moveRight = -velocity.x * delta;
                const moveForward = -velocity.z * delta;
                controls.moveRight(moveRight);
                controls.moveForward(moveForward);

                const currentPos = controls.getObject().position;
                if (checkCollision(currentPos)) {
                    controls.moveRight(-moveRight);
                    controls.moveForward(-moveForward);
                    velocity.x = 0;
                    velocity.z = 0;
                }

                const verticalSpeed = 2.0;
                if (move.up) currentEyeHeight += verticalSpeed * delta;
                if (move.down) currentEyeHeight -= verticalSpeed * delta;
                if (currentEyeHeight < 0.5) currentEyeHeight = 0.5;
                if (currentEyeHeight > roomH - 0.5) currentEyeHeight = roomH - 0.5;
                const obj = controls.getObject();
                const margin = 0.5;
                if (obj.position.x > roomW / 2 - margin) obj.position.x = roomW / 2 - margin;
                if (obj.position.x < -roomW / 2 + margin) obj.position.x = -roomW / 2 + margin;
                if (obj.position.z > roomD / 2 - margin) obj.position.z = roomD / 2 - margin;
                if (obj.position.z < -roomD / 2 + margin) obj.position.z = -roomD / 2 + margin;
                obj.position.y = floorY + currentEyeHeight;
            }
            raycaster.setFromCamera(center, camera);
            raycaster.far = 5.0;
            const hits = raycaster.intersectObjects(interactableObjects, true);
            if (hits.length > 0) {
                let target = hits[0].object;
                while (target.parent && !target.userData.title && target.parent !== scene) {
                    target = target.parent;
                }

                if (target && target.userData.title) {
                    hoveredObj = target;
                    if (!isTouchDevice()) $crosshair.addClass('hover');
                } else {
                    hoveredObj = null;
                    if (!isTouchDevice()) $crosshair.removeClass('hover');
                }
            } else {
                hoveredObj = null;
                if (!isTouchDevice()) $crosshair.removeClass('hover');
            }
            renderer.render(scene, camera);
        }
        animate();

        $(window).on('resize', function () {
            var w = $container.width();
            camera.aspect = w / 500;
            camera.updateProjectionMatrix();
            renderer.setSize(w, 500);
        });
    }

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

        if (Array.isArray(pillarsData)) {
            let pillarMat;
            if (pillarUrl) {
                const loader = new THREE.TextureLoader(manager);
                const pTex = loader.load(pillarUrl);
                pTex.encoding = THREE.sRGBEncoding;
                pTex.wrapS = THREE.RepeatWrapping;
                pTex.wrapT = THREE.RepeatWrapping;
                pTex.repeat.set(1, height / 2);
                pillarMat = new THREE.MeshStandardMaterial({ map: pTex, color: 0xffffff, roughness: 0.8 });
            } else {
                pillarMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            }
            pillarsData.forEach((p) => {
                const pW = p.w || 2;
                const pD = p.d || 2;
                const pGeo = new THREE.BoxGeometry(pW, height, pD);
                const pMesh = new THREE.Mesh(pGeo, pillarMat);
                pMesh.position.set(p.x, 0, p.z);
                scene.add(pMesh);
            });
        }
    }

    function addArtworkPlane(scene, art, roomW, roomH, roomD, artLights, initialBrightness, interactableObjects, manager) {
        let x = art.x;
        let y = art.y;
        let z = art.z;
        const wall = art.wall || 'north';
        if (x === undefined) {
            y = 1.5;
            switch (wall) {
                case 'north':
                    x = 0;
                    z = -roomD / 2 + 0.01;
                    break;
                default:
                    x = 0;
                    z = 0;
                    break;
            }
        }

        const isPillar = wall.includes('_');
        let direction = wall;
        if (isPillar) direction = wall.split('_')[1];

        let rotY = 0;
        if (isPillar) {
            switch (direction) {
                case 'north':
                    rotY = Math.PI;
                    break;
                case 'south':
                    rotY = 0;
                    break;
                case 'east':
                    rotY = Math.PI / 2;
                    break;
                case 'west':
                    rotY = -Math.PI / 2;
                    break;
            }
        } else {
            switch (direction) {
                case 'north':
                    rotY = 0;
                    break;
                case 'south':
                    rotY = Math.PI;
                    break;
                case 'east':
                    rotY = -Math.PI / 2;
                    break;
                case 'west':
                    rotY = Math.PI / 2;
                    break;
            }
        }

        if (art.rotationY !== undefined) {
            rotY = parseFloat(art.rotationY);
        }

        if (art.image) {
            const loader = new THREE.TextureLoader(manager);
            loader.load(art.image, (texture) => {
                texture.encoding = THREE.sRGBEncoding;
                const img = texture.image;
                const aspect = img && img.width && img.height ? img.width / img.height : 1.5;
                const baseHeight = 1.0;
                const baseWidth = baseHeight * aspect;
                const geo = new THREE.PlaneGeometry(baseWidth, baseHeight);
                const mat = new THREE.MeshStandardMaterial({ map: texture });
                const mesh = new THREE.Mesh(geo, mat);

                if (art.scale && typeof art.scale === 'object') {
                    const s = art.scale.x ?? 1;
                    mesh.scale.set(s, s, 1);
                }

                mesh.position.set(x, y, z);
                mesh.rotation.y = rotY;

                scene.add(mesh);
                mesh.userData = { title: art.title, desc: art.desc, link: art.link, image: art.image };

                // Lite版でもinteractableObjectsに追加してRaycaster対象にする
                if (interactableObjects) interactableObjects.push(mesh);

                addSpotlight(scene, mesh, direction, isPillar, artLights, initialBrightness);
            });
        }
    }

    function addSpotlight(scene, targetMesh, direction, isPillar, artLights, initialBrightness) {
        const geo = targetMesh.geometry;
        let artWidth = 1;
        let artHeight = 1;
        if (geo) {
            const w = geo.parameters ? geo.parameters.width : 1;
            const h = geo.parameters ? geo.parameters.height : 1;
            artWidth = w * targetMesh.scale.x;
            artHeight = h * targetMesh.scale.y;
        }

        const diagonal = Math.sqrt(artWidth * artWidth + artHeight * artHeight);
        const angle = Math.PI / 6;
        const penumbra = 0.4;
        const decay = 1;
        const intensity = 1.5;
        const color = 0xffffee;
        const radius = (diagonal / 2) * 1.1;
        const distRequired = radius / Math.tan(angle / 2);
        const finalDist = Math.max(2.5, distRequired);
        const spotLight = new THREE.SpotLight(color, intensity, finalDist * 3, angle, penumbra, decay);
        spotLight.userData.baseIntensity = intensity;
        spotLight.intensity = intensity * (initialBrightness !== undefined ? initialBrightness : 1.0);

        const offset = finalDist * 0.7;
        const heightOffset = finalDist * 0.7;
        const pos = targetMesh.position.clone();

        if (isPillar) {
            switch (direction) {
                case 'north':
                    pos.z -= offset;
                    break;
                case 'south':
                    pos.z += offset;
                    break;
                case 'east':
                    pos.x += offset;
                    break;
                case 'west':
                    pos.x -= offset;
                    break;
            }
        } else {
            switch (direction) {
                case 'north':
                    pos.z += offset;
                    break;
                case 'south':
                    pos.z -= offset;
                    break;
                case 'east':
                    pos.x -= offset;
                    break;
                case 'west':
                    pos.x += offset;
                    break;
            }
        }
        pos.y += heightOffset;
        spotLight.position.copy(pos);
        spotLight.target = targetMesh;
        scene.add(spotLight);
        scene.add(spotLight.target);
        if (artLights) artLights.push(spotLight);
    }
});
