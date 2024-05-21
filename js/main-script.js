import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js'; // vr
import Stats from 'three/addons/libs/stats.module.js';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

let scene, camera, renderer, controls, stats, gui;
let cylinder, rings = [], parametricSurfaces = [];
let keyState = {};
let materials, currentMaterialIndex = 0;

const ambientLightColor = 0xffa500;
const ambientLightIntensity = 0.2;
const directionalLightColor = 0xffffff;
const directionalLightIntensity = 1;
let directionalLight;
let ringSpeeds = [0, 0, 0];
const ringLimits = { min: -1, max: 1 };

function createScene() {
    'use strict';

    scene = new THREE.Scene();

    // Create the central cylinder
    const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 2, 32);
    const cylinderMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    scene.add(cylinder);

    // Create the concentric flat rings and rotate them to be horizontal
    for (let i = 0; i < 3; i++) {
        const ringGeometry = new THREE.RingGeometry(2.5 + i * 2, 2 + i * 2, 32);
        const ringMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2; // Rotate to be horizontal
        ring.position.y = -1 + i * 0.5; // Adjust vertical position to stack without gaps
        rings.push(ring);
        scene.add(ring);

        // Create parametric surfaces associated with each ring
        const parametricMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff });

        for (let j = 0; j < 8; j++) {
            const parametricGeometry = new ParametricGeometry((u, v, target) => {
                const x = u * 2 - 1;
                const y = v * 2 - 1;
                const z = Math.sin(x * Math.PI);
                target.set(x, y, z);
            }, 10, 10);
            const surface = new THREE.Mesh(parametricGeometry, parametricMaterial);
            surface.position.set(Math.cos(j * Math.PI / 4) * (2.5 + i * 2), -1 + i * 0.5, Math.sin(j * Math.PI / 4) * (2.5 + i * 2));
            parametricSurfaces.push({ mesh: surface, ring: ring });
            scene.add(surface);
        }
    }

    // Create a skydome
    const loader = new THREE.TextureLoader();
    const texture = loader.load('imagem.png'); // Correct path to your image file

    const skyGeometry = new THREE.SphereGeometry(500, 60, 40);
    const skyMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
    });
    const skydome = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skydome);
}

function createCamera() {
    'use strict';

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;
}

function createLights() {
    'use strict';

    const ambientLight = new THREE.AmbientLight(ambientLightColor, ambientLightIntensity); // Low intensity orange light
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(directionalLightColor, directionalLightIntensity);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
}

function createObjects() {
    'use strict';
    
    // Add material and shading setup
    materials = [
        new THREE.MeshLambertMaterial({ color: 0x0000ff }),
        new THREE.MeshPhongMaterial({ color: 0x0000ff }),
        new THREE.MeshToonMaterial({ color: 0x0000ff }),
        new THREE.MeshNormalMaterial()
    ];

    function updateMaterials() {
        [cylinder, ...rings, ...parametricSurfaces.map(ps => ps.mesh)].forEach(obj => {
            obj.material = materials[currentMaterialIndex];
        });
    }

    document.addEventListener('keydown', (event) => {
        switch (event.key.toLowerCase()) {
            case 'q':
                currentMaterialIndex = 0;
                break;
            case 'w':
                currentMaterialIndex = 1;
                break;
            case 'e':
                currentMaterialIndex = 2;
                break;
            case 'r':
                currentMaterialIndex = 3;
                break;
            case 't':
                materials.forEach(material => material.needsUpdate = !material.needsUpdate);
                break;
            case '1':
                ringSpeeds[0] = ringSpeeds[0] === 0 ? 0.01 : 0;
                break;
            case '2':
                ringSpeeds[1] = ringSpeeds[1] === 0 ? 0.01 : 0;
                break;
            case '3':
                ringSpeeds[2] = ringSpeeds[2] === 0 ? 0.01 : 0;
                break;
        }
        updateMaterials();
    });
}

function init() {
    'use strict';

    // Create scene, camera, lights, and objects
    createScene();
    createCamera();
    createLights();
    createObjects();

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    document.body.appendChild( VRButton.createButton( renderer ) ); // vr
    renderer.xr.enabled = true; // enabling xr rendering

    // OrbitControls setup
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Stats setup
    stats = new Stats();
    document.body.appendChild(stats.dom);

    window.addEventListener('resize', onResize, false);
    window.addEventListener('keydown', onKeyDown, false);

    animate();
}

function animate() {
    renderer.setAnimationLoop( function () {

        rings.forEach((ring, index) => {
            ring.position.y += ringSpeeds[index];
            if (ring.position.y > ringLimits.max || ring.position.y < ringLimits.min) {
                ringSpeeds[index] *= -1;
            }
            const surfaces = parametricSurfaces.filter(ps => ps.ring === ring).map(ps => ps.mesh);
            surfaces.forEach(surface => {
                surface.position.y = ring.position.y;
            });
        });

        controls.update();
        stats.update();
        renderer.render(scene, camera);
    });
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    keyState[event.key] = true;
}

init();
