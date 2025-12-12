jQuery(document).ready(function ($) {
    $('.ai-museum-container').each(function () {
        initMuseum(this);
    });

    function initMuseum(container) {
        var $container = $(container);
        var layout = $container.data('layout');
        var canvas = $container.find('.ai-museum-canvas')[0];

        // UI
        var $crosshair = $container.find('#ai-crosshair');
        var $modalOverlay = $container.find('#ai-modal-overlay');
        var $modalClose = $container.find('#ai-modal-close');
        var $modalImage = $container.find('#ai-modal-image');
        var $modalTitle = $container.find('#ai-modal-title');
        var $modalDesc = $container.find('#ai-modal-desc');
        var $modalLink = $container.find('#ai-modal-link');

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

        let currentEyeHeight = 1.6;
        const floorY = -roomH / 2;

        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
        camera.position.set(0, floorY + currentEyeHeight, roomD / 2 - 0.5);

        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;

        const baseAmbient = new THREE.AmbientLight(0xffffff, 0.1);
        scene.add(baseAmbient);

        const roomLights = [];
        const roomAmbient = new THREE.AmbientLight(0xffffff, 0.6);
        roomAmbient.userData.baseIntensity = 0.6;
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

        createRoom(scene, roomW, roomH, roomD, roomStyle, pillars, floorUrl, wallUrl, pillarUrl, ceilingUrl);

        const interactableObjects = [];
        if (Array.isArray(layout.artworks)) {
            layout.artworks.forEach((art) => {
                addArtworkPlane(scene, art, roomW, roomH, roomD, artLights, defaultSpotBrightness, interactableObjects);
            });
        }

        // UI Controls (jQuery)
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
        $roomGroup.append($('<span>').text('Room').css({ width: '70px', textAlign: 'right' }));
        var $roomSlider = $('<input>', { type: 'range', min: 0, max: 2.5, step: 0.1, value: defaultRoomBrightness }).css({
            flex: 1,
            cursor: 'pointer'
        });
        $roomGroup.append($roomSlider);
        $uiContainer.append($roomGroup);

        var $spotGroup = $('<div>').css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '200px' });
        $spotGroup.append($('<span>').text('Spotlight').css({ width: '70px', textAlign: 'right' }));
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
        $uiContainer.find('input').on('mousedown click', function (e) {
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
            if (controls.isLocked) {
                if (hoveredObj) {
                    openModal(hoveredObj.userData);
                    controls.unlock();
                }
            } else {
                controls.lock();
            }
        });

        function openModal(data) {
            $modalImage.attr('src', data.image);
            $modalTitle.text(data.title || 'No Title');
            $modalDesc.text(data.desc || '');
            if (data.link) {
                $modalLink.attr('href', data.link).show();
            } else {
                $modalLink.hide();
            }
            $modalOverlay.css('display', 'flex');
        }

        $modalClose.on('click', function () {
            $modalOverlay.hide();
        });
        $modalOverlay.on('click', function (e) {
            if (e.target === this) $(this).hide();
        });

        const clock = new THREE.Clock();
        const velocity = new THREE.Vector3();
        const direction = new THREE.Vector3();
        const move = { forward: false, back: false, left: false, right: false, up: false, down: false };

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

        function animate() {
            requestAnimationFrame(animate);
            if (controls.isLocked === true) {
                const delta = clock.getDelta();
                velocity.x -= velocity.x * 10.0 * delta;
                velocity.z -= velocity.z * 10.0 * delta;
                direction.z = Number(move.forward) - Number(move.back);
                direction.x = Number(move.right) - Number(move.left);
                direction.normalize();
                const speed = 30.0;
                if (move.forward || move.back) velocity.z -= direction.z * speed * delta;
                if (move.left || move.right) velocity.x -= direction.x * speed * delta;
                controls.moveRight(-velocity.x * delta);
                controls.moveForward(-velocity.z * delta);
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
            const hits = raycaster.intersectObjects(interactableObjects);
            if (hits.length > 0) {
                hoveredObj = hits[0].object;
                $crosshair.addClass('hover');
            } else {
                hoveredObj = null;
                $crosshair.removeClass('hover');
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

    function createRoom(scene, width, height, depth, style, pillarsData, floorUrl, wallUrl, pillarUrl, ceilingUrl) {
        const styles = { gallery: { wallColor: 0xffffff, bgColor: 0x202020 } };
        const s = styles.gallery;
        scene.background = new THREE.Color(s.bgColor);

        let wallMaterial;
        if (wallUrl) {
            const loader = new THREE.TextureLoader();
            const wallTex = loader.load(wallUrl);
            wallTex.wrapS = THREE.RepeatWrapping;
            wallTex.wrapT = THREE.RepeatWrapping;
            wallTex.repeat.set(width / 4, height / 4);
            wallMaterial = new THREE.MeshStandardMaterial({ map: wallTex, side: THREE.BackSide, roughness: 0.8 });
        } else {
            wallMaterial = new THREE.MeshStandardMaterial({ color: s.wallColor, side: THREE.BackSide, roughness: 0.9 });
        }
        const roomGeo = new THREE.BoxGeometry(width, height, depth);
        scene.add(new THREE.Mesh(roomGeo, wallMaterial));

        let floorMaterial;
        if (floorUrl) {
            const loader = new THREE.TextureLoader();
            const floorTex = loader.load(floorUrl);
            floorTex.wrapS = THREE.RepeatWrapping;
            floorTex.wrapT = THREE.RepeatWrapping;
            floorTex.repeat.set(width / 2, depth / 2);
            floorMaterial = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8, metalness: 0.1 });
        } else {
            floorMaterial = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8, metalness: 0.1 });
        }
        const floorGeo = new THREE.PlaneGeometry(width, depth);
        const floorMesh = new THREE.Mesh(floorGeo, floorMaterial);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.position.y = -height / 2 + 0.01;
        scene.add(floorMesh);

        let ceilingMaterial;
        if (ceilingUrl) {
            const loader = new THREE.TextureLoader();
            const ceilTex = loader.load(ceilingUrl);
            ceilTex.wrapS = THREE.RepeatWrapping;
            ceilTex.wrapT = THREE.RepeatWrapping;
            ceilTex.repeat.set(width / 2, depth / 2);
            ceilingMaterial = new THREE.MeshStandardMaterial({ map: ceilTex, side: THREE.FrontSide, roughness: 0.9 });
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
                const loader = new THREE.TextureLoader();
                const pTex = loader.load(pillarUrl);
                pTex.wrapS = THREE.RepeatWrapping;
                pTex.wrapT = THREE.RepeatWrapping;
                pTex.repeat.set(1, height / 2);
                pillarMat = new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.8 });
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

    function addArtworkPlane(scene, art, roomW, roomH, roomD, artLights, initialBrightness, interactableObjects) {
        const loader = new THREE.TextureLoader();
        loader.load(art.image, (texture) => {
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
            mesh.position.set(x, y, z);
            const isPillar = wall.includes('_');
            let direction = wall;
            if (isPillar) direction = wall.split('_')[1];
            if (isPillar) {
                switch (direction) {
                    case 'north':
                        mesh.rotation.y = Math.PI;
                        break;
                    case 'south':
                        mesh.rotation.y = 0;
                        break;
                    case 'east':
                        mesh.rotation.y = Math.PI / 2;
                        break;
                    case 'west':
                        mesh.rotation.y = -Math.PI / 2;
                        break;
                }
            } else {
                switch (direction) {
                    case 'north':
                        mesh.rotation.y = 0;
                        break;
                    case 'south':
                        mesh.rotation.y = Math.PI;
                        break;
                    case 'east':
                        mesh.rotation.y = -Math.PI / 2;
                        break;
                    case 'west':
                        mesh.rotation.y = Math.PI / 2;
                        break;
                }
            }
            scene.add(mesh);
            mesh.userData = { title: art.title, desc: art.desc, link: art.link, image: art.image };
            if (interactableObjects) interactableObjects.push(mesh);
            addSpotlight(scene, mesh, direction, isPillar, artLights, initialBrightness);
        });
    }

    function addSpotlight(scene, targetMesh, direction, isPillar, artLights, initialBrightness) {
        const geo = targetMesh.geometry;
        const w = geo.parameters ? geo.parameters.width : 1;
        const h = geo.parameters ? geo.parameters.height : 1;
        const artWidth = w * targetMesh.scale.x;
        const artHeight = h * targetMesh.scale.y;
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
