jQuery(document).ready(function ($) {
    var container = document.querySelector('.ai-museum-container');
    if (!container) return;

    var $container = $(container);

    // --- データ取得ロジック (Pro版と同じ安全な方式) ---
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
    // ----------------------------------

    var postId = $container.data('post-id');
    var canvas = $container.find('.ai-museum-canvas')[0];

    var $saveBtn = $container.find('#museum-save');
    var $clearBtn = $container.find('#museum-clear');
    var $scaleSlider = $container.find('#scale-slider');
    var $scaleValue = $container.find('#scale-value');
    var $scaleWrapper = $container.find('#museum-scale-wrapper');

    var width = $container.width();
    var height = 500;

    // Notification UI
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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 8, 18);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(width, height);

    const orbit = new THREE.OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;

    const transform = new THREE.TransformControls(camera, renderer.domElement);
    transform.setMode('translate');
    scene.add(transform);
    transform.addEventListener('dragging-changed', function (event) {
        orbit.enabled = !event.value;
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

    scene.add(new THREE.AmbientLight(0xffffff, 0.1));
    const roomAmbient = new THREE.AmbientLight(0xffffff, 0.6 * roomBright);
    scene.add(roomAmbient);
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.6 * roomBright);
    dir1.position.set(5, 10, 7);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.4 * roomBright);
    dir2.position.set(-5, 5, -5);
    scene.add(dir2);

    createRoom(scene, roomW, roomH, roomD, room.style, pillars, floorUrl, wallUrl, pillarUrl, ceilingUrl);

    const artworks = [];
    const loader = new THREE.TextureLoader();
    (layout.artworks || []).forEach((art, idx) => {
        const initialGeo = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ map: null, side: THREE.DoubleSide });
        const plane = new THREE.Mesh(initialGeo, material);
        loader.load(art.image, (texture) => {
            plane.material.map = texture;
            plane.material.needsUpdate = true;
            const img = texture.image;
            const aspect = img.width / img.height;
            plane.geometry.dispose();
            plane.geometry = new THREE.PlaneGeometry(aspect, 1.0);
        });
        let x = art.x;
        let y = art.y;
        let z = art.z;
        const wall = art.wall || 'north';
        const defaultY = 1.5;
        if (x === undefined || x === null || z === undefined || z === null) {
            const margin = 0.05;
            y = defaultY;
            if (wall.includes('_') && (wall.startsWith('p1') || wall.startsWith('p2'))) {
                const parts = wall.split('_');
                const pId = parts[0];
                const dir = parts[1];
                const pillar = pillars.find((p) => p.id === pId);
                if (pillar) {
                    const pX = pillar.x || 0;
                    const pZ = pillar.z || 0;
                    const pW = pillar.w || 2;
                    const pD = pillar.d || 2;
                    if (dir === 'north') {
                        x = pX;
                        z = pZ - pD / 2 - margin;
                    } else if (dir === 'south') {
                        x = pX;
                        z = pZ + pD / 2 + margin;
                    } else if (dir === 'east') {
                        x = pX + pW / 2 + margin;
                        z = pZ;
                    } else if (dir === 'west') {
                        x = pX - pW / 2 - margin;
                        z = pZ;
                    }
                } else {
                    x = 0;
                    z = 0;
                }
            } else {
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
        }
        plane.position.set(x, y, z);
        if (art.scale && typeof art.scale === 'object') {
            const s = art.scale.x ?? 1;
            plane.scale.set(s, s, 1);
        }

        const isPillar = wall.includes('_');
        let direction = wall;
        if (isPillar) direction = wall.split('_')[1];
        if (isPillar) {
            switch (direction) {
                case 'north':
                    plane.rotation.y = Math.PI;
                    break;
                case 'south':
                    plane.rotation.y = 0;
                    break;
                case 'east':
                    plane.rotation.y = Math.PI / 2;
                    break;
                case 'west':
                    plane.rotation.y = -Math.PI / 2;
                    break;
            }
        } else {
            switch (direction) {
                case 'north':
                    plane.rotation.y = 0;
                    break;
                case 'south':
                    plane.rotation.y = Math.PI;
                    break;
                case 'east':
                    plane.rotation.y = -Math.PI / 2;
                    break;
                case 'west':
                    plane.rotation.y = Math.PI / 2;
                    break;
            }
        }
        plane.userData.index = idx;
        plane.userData.wall = wall;
        artworks.push(plane);
        scene.add(plane);
    });

    transform.addEventListener('change', () => {
        const obj = transform.object;
        if (!obj) return;
        const wallKey = obj.userData.wall || 'north';
        const margin = 0.05;
        let padding = 0.5;

        if (wallKey.includes('_') && (wallKey.startsWith('p1') || wallKey.startsWith('p2'))) {
            const parts = wallKey.split('_');
            const pId = parts[0];
            const dir = parts[1];
            const pillar = pillars.find((p) => p.id === pId);
            if (pillar) {
                const pX = pillar.x || 0;
                const pZ = pillar.z || 0;
                const pW = pillar.w || 2;
                const pD = pillar.d || 2;
                padding = 0.1;
                if (dir === 'north') {
                    obj.position.z = pZ - pD / 2 - margin;
                    obj.position.x = THREE.MathUtils.clamp(obj.position.x, pX - pW / 2 + padding, pX + pW / 2 - padding);
                } else if (dir === 'south') {
                    obj.position.z = pZ + pD / 2 + margin;
                    obj.position.x = THREE.MathUtils.clamp(obj.position.x, pX - pW / 2 + padding, pX + pW / 2 - padding);
                } else if (dir === 'east') {
                    obj.position.x = pX + pW / 2 + margin;
                    obj.position.z = THREE.MathUtils.clamp(obj.position.z, pZ - pD / 2 + padding, pZ + pD / 2 - padding);
                } else if (dir === 'west') {
                    obj.position.x = pX - pW / 2 - margin;
                    obj.position.z = THREE.MathUtils.clamp(obj.position.z, pZ - pD / 2 + padding, pZ + pD / 2 - padding);
                }
            }
        } else {
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
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(artworks);
        if (hits.length > 0) selectArtwork(hits[0].object);
        else deselectArtwork();
    }
    function selectArtwork(obj) {
        selectedObject = obj;
        transform.attach(obj);
        transform.showX = true;
        transform.showY = true;
        transform.showZ = true;
        if ($scaleWrapper && $scaleSlider) {
            $scaleWrapper.css('display', 'flex');
            $scaleSlider.val(obj.scale.x);
            $scaleValue.text(obj.scale.x.toFixed(1) + 'x');
        }
    }
    function deselectArtwork() {
        selectedObject = null;
        transform.detach();
        if ($scaleWrapper) $scaleWrapper.hide();
    }
    canvas.addEventListener('pointerdown', onPointerDown);
    $scaleSlider.on('input', function (e) {
        if (!selectedObject) return;
        const val = parseFloat($(this).val());
        selectedObject.scale.set(val, val, 1);
        $scaleValue.text(val.toFixed(1) + 'x');
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
            newLayout.artworks[idx].scale = { x: mesh.scale.x, y: mesh.scale.y, z: 1 };
        });

        var originalText = $saveBtn.text();
        $saveBtn.prop('disabled', true).text('Saving...');

        $.ajax({
            url: edel_vars.ajaxurl,
            type: 'POST',
            data: { action: 'edel_museum_save_layout', post_id: postId, layout: JSON.stringify(newLayout), _nonce: edel_vars.nonce },
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
            data: { action: 'edel_museum_clear_layout', post_id: postId, _nonce: edel_vars.nonce },
            success: function (res) {
                if (res.success) {
                    alert(res.data.message);
                    location.reload();
                } else {
                    alert(edel_vars.txt_error);
                    $clearBtn.prop('disabled', false).text('Reset Layout');
                }
            },
            error: function () {
                alert(edel_vars.txt_error);
                $clearBtn.prop('disabled', false).text('Reset Layout');
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
        scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(roomGeo), new THREE.LineBasicMaterial({ color: 0xcccccc })));

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
});
