import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js'; // vr
import Stats from 'three/addons/libs/stats.module.js';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';
import { ParametricGeometries } from 'three/addons/geometries/ParametricGeometries.js';

let scene, camera, renderer, controls, stats, gui;
let rings = [];
let keyState = {};
let ringSpeeds = [0.01, 0.01, 0.01];
const ringLimits = { min: 0, max: 4 };
const ringMoveSpeeds = [0.02, 0.02, 0.02];  // Speed of movement along the y-axis
let ringDirections = [1, 1, 1];  // Direction of movement along the y-axis

const ambientLightColor = 0xffa500;
const ambientLightIntensity = 0.2;
const directionalLightColor = 0xffffff;
const directionalLightIntensity = 1;
let directionalLight;
let directionalLightOn = true; // Track the state of the directional light

let pointLights = [];
let pointLightOn = true; // Track the state of the point light (inicialmente ligada)

function createScene() {
    'use strict';

    scene = new THREE.Scene();

   
    function createMobiusStrip() {
        const totalSegments = 2048;
        const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
        let mobiusStrip = new THREE.Object3D();
    
        for (let i = 0; i < totalSegments; i++) {
            const angle = Math.PI / totalSegments * 2 * i;
    
            if (i % (totalSegments / 8) === 0) {
                let light = new THREE.PointLight(new THREE.Color('white'), 50, 50);
                light.castShadow = true;
                light.shadow.mapSize.width = 1024;
                light.shadow.mapSize.height = 1024;
                light.shadow.camera.near = 0.1;
                light.shadow.camera.far = 50;
    
                light.position.set(Math.cos(angle), Math.sin(angle * 5) / 30, Math.sin(angle));
                light.position.multiplyScalar(10);
                mobiusStrip.add(light);
                pointLights.push(light); // Armazenar a luz pontual
            }
    
            const segment = new THREE.Object3D();
            segment.position.set(Math.cos(angle), Math.sin(angle * 5) / 30, Math.sin(angle));
            segment.position.multiplyScalar(10);
            segment.lookAt(0, 0, 0);
            mobiusStrip.add(segment);
    
            const material = new THREE.MeshLambertMaterial();
            material.color.set(new THREE.Color(`hsl(${5},55%,55%)`));
            const boxMesh = new THREE.Mesh(boxGeometry, material);
            boxMesh.scale.set(0.3, 0.3, 0.001);
            boxMesh.castShadow = true;
            boxMesh.receiveShadow = true;
            boxMesh.rotation.x = angle / 2;
    
            segment.add(boxMesh);
        }
    
        
        mobiusStrip.position.set(0, 10, 0);
        scene.add(mobiusStrip);
    }
    
    
    

    function createRingGeometry(innerRadius, outerRadius, thickness, segments) {
        const shape = new THREE.Shape();
        shape.moveTo(outerRadius, 0);
        shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

        const hole = new THREE.Path();
        hole.moveTo(innerRadius, 0);
        hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
        shape.holes.push(hole);

        const extrudeSettings = {
            steps: 1,
            depth: thickness,
            bevelEnabled: false
        };

        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }

    function addCubesToRing(ring, radius, cubeSize, numCubes) {
        const angleStep = (Math.PI * 2) / numCubes;
        for (let i = 0; i < numCubes; i++) {
            const angle = i * angleStep;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
            const cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
            const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
            // Center the cubes on the ring's thickness
            cube.position.set(x, y, cubeSize / 2 -1); 
            ring.add(cube);
        }
    }

    const ringGeometry1 = createRingGeometry(1, 3, 4, 32);
    const ringMaterial1 = new THREE.MeshLambertMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    const ring1 = new THREE.Mesh(ringGeometry1, ringMaterial1);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.set(0, 0, 0);
    rings.push(ring1);
    scene.add(ring1);

    addCubesToRing(ring1, 2, 0.5, 8);


    const ringGeometry2 = createRingGeometry(3, 5, 4, 32);
    const ringMaterial2 = new THREE.MeshPhongMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    const ring2 = new THREE.Mesh(ringGeometry2, ringMaterial2);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.set(0, 0, 0);
    rings.push(ring2);
    scene.add(ring2);
    addCubesToRing(ring2, 4, 0.5, 8);

    const ringGeometry3 = createRingGeometry(5, 7, 4, 32);
    const ringMaterial3 = new THREE.MeshToonMaterial({ color: 0x0000ff, side: THREE.DoubleSide });
    const ring3 = new THREE.Mesh(ringGeometry3, ringMaterial3);
    ring3.rotation.x = Math.PI / 2;
    ring3.position.set(0, 0, 0);
    rings.push(ring3);
    scene.add(ring3);
    addCubesToRing(ring3, 6, 0.5, 8);

    const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 8, 32);
    const cylinderMaterial = new THREE.MeshNormalMaterial();
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.position.set(0, 0, 0);
    scene.add(cylinder);

    const loader = new THREE.TextureLoader();
    const texture = loader.load('imagem.png');

    const skyGeometry = new THREE.SphereGeometry(500, 60, 40);
    const skyMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
    });
    const skydome = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skydome);

    createMobiusStrip();
}

function createCamera() {
    'use strict';

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;
}

function createLights() {
    'use strict';

    const ambientLight = new THREE.AmbientLight(ambientLightColor, ambientLightIntensity);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(directionalLightColor, directionalLightIntensity);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
}

function createObjects() {
    'use strict';

    const materials = [
        new THREE.MeshLambertMaterial({ color: 0x0000ff }),
        new THREE.MeshPhongMaterial({ color: 0x0000ff }),
        new THREE.MeshToonMaterial({ color: 0x0000ff }),
        new THREE.MeshNormalMaterial()
    ];

    let currentMaterialIndex = 0;

    function updateMaterials() {
        rings.forEach(ring => {
            ring.material = materials[currentMaterialIndex];
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
            case '1':
                ringMoveSpeeds[0] = ringMoveSpeeds[0] === 0 ? 0.02 : 0;
                break;
            case '2':
                ringMoveSpeeds[1] = ringMoveSpeeds[1] === 0 ? 0.02 : 0;
                break;
            case '3':
                ringMoveSpeeds[2] = ringMoveSpeeds[2] === 0 ? 0.02 : 0;
                break;
            case 'd':
                directionalLightOn = !directionalLightOn;
                directionalLight.visible = directionalLightOn;
                break;
            case 'p':
                pointLightOn = !pointLightOn;
                pointLights.forEach(light => light.visible = pointLightOn); // Alternar visibilidade
                break;
        }
        updateMaterials();
    });
    
}
function init() {
    'use strict';

    createScene();
    createCamera();
    createLights();
    createObjects();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    document.body.appendChild(VRButton.createButton(renderer)); // vr
    renderer.xr.enabled = true; // enabling xr rendering

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    stats = new Stats();
    document.body.appendChild(stats.dom);

    window.addEventListener('resize', onResize, false);
    window.addEventListener('keydown', onKeyDown, false);

    animate();
}

function animate() {
    renderer.setAnimationLoop( function () {

    rings.forEach((ring, index) => {
        ring.rotation.z += ringSpeeds[index];

        // Move rings along the y-axis
        ring.position.y += ringDirections[index] * ringMoveSpeeds[index];

        // Reverse direction if ring hits the limits
        if (ring.position.y > ringLimits.max || ring.position.y < ringLimits.min) {
            ringDirections[index] *= -1;
        }
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
