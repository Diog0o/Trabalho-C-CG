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

let cubeLights = [];
let cubeLightOn = true; // Track the state of the cube lights (inicialmente ligada)
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
    
        // Centralizar a faixa de Möbius no eixo Y
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

    function createGeometries() {
        return {
            kleinBottle: (() => {
                const widthSegments = 30;
                const heightSegments = 30;
    
                const geometry = new THREE.BufferGeometry();
                const vertices = [];
                const indices = [];
    
                for (let i = 0; i <= widthSegments; i++) {
                    const u = (i * Math.PI) / widthSegments;
    
                    for (let j = 0; j <= heightSegments; j++) {
                        const v = (j * 2 * Math.PI) / heightSegments;
                        const x =
                            (2 + Math.cos(u / 2) * Math.sin(v) -
                                Math.sin(u / 2) * Math.sin(2 * v)) *
                            Math.cos(u);
                        const y =
                            (2 + Math.cos(u / 2) * Math.sin(v) -
                                Math.sin(u / 2) * Math.sin(2 * v)) *
                            Math.sin(u);
                        const z =
                            Math.sin(u / 2) * Math.sin(v) +
                            Math.cos(u / 2) * Math.sin(2 * v);
    
                        vertices.push(x, y, z);
                    }
                }
    
                for (let i = 0; i < widthSegments; i++) {
                    for (let j = 0; j < heightSegments; j++) {
                        const a = i * (heightSegments + 1) + j;
                        const b = i * (heightSegments + 1) + j + 1;
                        const c = (i + 1) * (heightSegments + 1) + j;
                        const d = (i + 1) * (heightSegments + 1) + j + 1;
                        indices.push(a, b, d);
                        indices.push(a, d, c);
                    }
                }
    
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geometry.setIndex(indices);
                geometry.computeVertexNormals();
                geometry.scale(0.25, 0.25, 0.25);
    
                return geometry;
            })(),
            mobiusStrip: (() => {
                const geometry = new THREE.BufferGeometry();
                const vertices = [];
                const widthSegments = 100;
                const heightSegments = 6;
    
                for (let i = 0; i <= widthSegments; i++) {
                    const u = (i / widthSegments) * Math.PI * 2;
                    for (let j = 0; j <= heightSegments; j++) {
                        const v = (j / heightSegments - 0.5) * 2;
                        const x = Math.cos(u) * (1 + v / 2 * Math.cos(u / 2));
                        const y = Math.sin(u) * (1 + v / 2 * Math.cos(u / 2));
                        const z = v / 2 * Math.sin(u / 2);
                        vertices.push(x, y, z);
                    }
                }
    
                const indices = [];
                for (let i = 1; i <= widthSegments; i++) {
                    for (let j = 1; j <= heightSegments; j++) {
                        const a = (heightSegments + 1) * i + j - 1;
                        const b = (heightSegments + 1) * (i - 1) + j - 1;
                        const c = (heightSegments + 1) * (i - 1) + j;
                        const d = (heightSegments + 1) * i + j;
                        indices.push(a, b, d);
                        indices.push(b, c, d);
                    }
                }
    
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geometry.setIndex(indices);
                geometry.computeVertexNormals();
                geometry.scale(0.5, 0.5, 0.5);
    
                return geometry;
            })(),
            torus: (() => {
                const geometry = new THREE.BufferGeometry();
                const vertices = [];
                const widthSegments = 30;
                const heightSegments = 30;
                const radius = 1;
                const tube = 0.4;
    
                for (let i = 0; i <= widthSegments; i++) {
                    const u = (i / widthSegments) * Math.PI * 2;
                    for (let j = 0; j <= heightSegments; j++) {
                        const v = (j / heightSegments) * Math.PI * 2;
                        const x = (radius + tube * Math.cos(v)) * Math.cos(u);
                        const y = (radius + tube * Math.cos(v)) * Math.sin(u);
                        const z = tube * Math.sin(v);
                        vertices.push(x, y, z);
                    }
                }
    
                const indices = [];
                for (let i = 1; i <= widthSegments; i++) {
                    for (let j = 1; j <= heightSegments; j++) {
                        const a = (heightSegments + 1) * i + j - 1;
                        const b = (heightSegments + 1) * (i - 1) + j - 1;
                        const c = (heightSegments + 1) * (i - 1) + j;
                        const d = (heightSegments + 1) * i + j;
                        indices.push(a, b, d);
                        indices.push(b, c, d);
                    }
                }
    
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geometry.setIndex(indices);
                geometry.computeVertexNormals();
                geometry.scale(0.5, 0.5, 0.5);
    
                return geometry;
            })(),
            sphere: (() => {
                const geometry = new THREE.BufferGeometry();
                const vertices = [];
                const widthSegments = 30;
                const heightSegments = 30;
                const radius = 1;
    
                for (let i = 0; i <= widthSegments; i++) {
                    const u = (i / widthSegments) * Math.PI * 2;
                    for (let j = 0; j <= heightSegments; j++) {
                        const v = (j / heightSegments) * Math.PI;
                        const x = radius * Math.sin(v) * Math.cos(u);
                        const y = radius * Math.sin(v) * Math.sin(u);
                        const z = radius * Math.cos(v);
                        vertices.push(x, y, z);
                    }
                }
    
                const indices = [];
                for (let i = 1; i <= widthSegments; i++) {
                    for (let j = 1; j <= heightSegments; j++) {
                        const a = (heightSegments + 1) * i + j - 1;
                        const b = (heightSegments + 1) * (i - 1) + j - 1;
                        const c = (heightSegments + 1) * (i - 1) + j;
                        const d = (heightSegments + 1) * i + j;
                        indices.push(a, b, d);
                        indices.push(b, c, d);
                    }
                }
    
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geometry.setIndex(indices);
                geometry.computeVertexNormals();
                geometry.scale(0.5, 0.5, 0.5);
    
                return geometry;
            })(),
            plane: (() => {
                const geometry = new THREE.BufferGeometry();
                const vertices = [];
                const widthSegments = 10;
                const heightSegments = 10;
                const width = 1;
                const height = 1;
    
                for (let i = 0; i <= widthSegments; i++) {
                    const x = (i / widthSegments) * width - width / 2;
                    for (let j = 0; j <= heightSegments; j++) {
                        const y = (j / heightSegments) * height - height / 2;
                        vertices.push(x, y, 0);
                    }
                }
    
                const indices = [];
                for (let i = 1; i <= widthSegments; i++) {
                    for (let j = 1; j <= heightSegments; j++) {
                        const a = (heightSegments + 1) * i + j - 1;
                        const b = (heightSegments + 1) * (i - 1) + j - 1;
                        const c = (heightSegments + 1) * (i - 1) + j;
                        const d = (heightSegments + 1) * i + j;
                        indices.push(a, b, d);
                        indices.push(b, c, d);
                    }
                }
    
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geometry.setIndex(indices);
                geometry.computeVertexNormals();
                geometry.scale(0.5, 0.5, 0.5);
    
                return geometry;
            })(),
            cone: (() => {
                const geometry = new THREE.BufferGeometry();
                const vertices = [];
                const radius = 1;
                const height = 2;
                const radialSegments = 30;
                const heightSegments = 1;
    
                for (let y = 0; y <= heightSegments; y++) {
                    const v = y / heightSegments;
                    const radiusY = radius * (1 - v);
    
                    for (let x = 0; x <= radialSegments; x++) {
                        const u = x / radialSegments * Math.PI * 2;
                        const vertexX = radiusY * Math.cos(u);
                        const vertexY = -v * height + height / 2;
                        const vertexZ = radiusY * Math.sin(u);
                        vertices.push(vertexX, vertexY, vertexZ);
                    }
                }
    
                vertices.push(0, height / 2, 0); // apex
    
                const indices = [];
                const apexIndex = vertices.length / 3 - 1;
                for (let y = 0; y < heightSegments; y++) {
                    for (let x = 0; x < radialSegments; x++) {
                        const a = y * (radialSegments + 1) + x;
                        const b = y * (radialSegments + 1) + x + 1;
                        const c = (y + 1) * (radialSegments + 1) + x;
                        const d = (y + 1) * (radialSegments + 1) + x + 1;
                        indices.push(a, b, d);
                        indices.push(a, d, c);
                    }
                }
    
                for (let x = 0; x < radialSegments; x++) {
                    const a = x;
                    const b = x + 1;
                    indices.push(apexIndex, a, b);
                }
    
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geometry.setIndex(indices);
                geometry.computeVertexNormals();
                geometry.scale(0.5, 0.5, 0.5);
    
                return geometry;
            })(),
            ellipsoid: (() => {
                const geometry = new THREE.BufferGeometry();
                const vertices = [];
                const widthSegments = 30;
                const heightSegments = 30;
                const radiusX = 1;
                const radiusY = 1.5;
                const radiusZ = 1;
    
                for (let i = 0; i <= widthSegments; i++) {
                    const u = (i / widthSegments) * Math.PI * 2;
                    for (let j = 0; j <= heightSegments; j++) {
                        const v = (j / heightSegments) * Math.PI;
                        const x = radiusX * Math.sin(v) * Math.cos(u);
                        const y = radiusY * Math.sin(v) * Math.sin(u);
                        const z = radiusZ * Math.cos(v);
                        vertices.push(x, y, z);
                    }
                }
    
                const indices = [];
                for (let i = 1; i <= widthSegments; i++) {
                    for (let j = 1; j <= heightSegments; j++) {
                        const a = (heightSegments + 1) * i + j - 1;
                        const b = (heightSegments + 1) * (i - 1) + j - 1;
                        const c = (heightSegments + 1) * (i - 1) + j;
                        const d = (heightSegments + 1) * i + j;
                        indices.push(a, b, d);
                        indices.push(b, c, d);
                    }
                }
    
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geometry.setIndex(indices);
                geometry.computeVertexNormals();
                geometry.scale(0.5, 0.5, 0.5);
    
                return geometry;
            })(),
            torusKnot: (() => {
                const geometry = new THREE.BufferGeometry();
                const vertices = [];
                const p = 2;
                const q = 3;
                const radius = 1;
                const tube = 0.4;
                const tubularSegments = 64;
                const radialSegments = 8;
    
                for (let i = 0; i <= tubularSegments; i++) {
                    const u = (i / tubularSegments) * Math.PI * 2 * p;
                    const x = radius * (2 + Math.cos(q * u)) * Math.cos(u);
                    const y = radius * (2 + Math.cos(q * u)) * Math.sin(u);
                    const z = radius * Math.sin(q * u);
    
                    for (let j = 0; j <= radialSegments; j++) {
                        const v = (j / radialSegments) * Math.PI * 2;
                        const vertexX = x + tube * Math.cos(v) * Math.cos(u);
                        const vertexY = y + tube * Math.cos(v) * Math.sin(u);
                        const vertexZ = z + tube * Math.sin(v);
                        vertices.push(vertexX, vertexY, vertexZ);
                    }
                }
    
                const indices = [];
                for (let i = 0; i < tubularSegments; i++) {
                    for (let j = 0; j < radialSegments; j++) {
                        const a = i * (radialSegments + 1) + j;
                        const b = i * (radialSegments + 1) + j + 1;
                        const c = (i + 1) * (radialSegments + 1) + j;
                        const d = (i + 1) * (radialSegments + 1) + j + 1;
                        indices.push(a, b, d);
                        indices.push(a, d, c);
                    }
                }
    
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geometry.setIndex(indices);
                geometry.computeVertexNormals();
                geometry.scale(0.2, 0.2, 0.2);
    
                return geometry;
            })(),
        };
    }
    
    
    

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    function addParametricObjectsToRing(ring, radius, geometries, numObjects) {
        const angleStep = (Math.PI * 2) / numObjects;
        const geometryKeys = Object.keys(geometries);
    
        // Embaralhar as chaves das geometrias para ordem aleatória
        const shuffledKeys = shuffleArray([...geometryKeys]);
    
        for (let i = 0; i < numObjects; i++) {
            const angle = i * angleStep;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
    
            // Selecionar a geometria embaralhada
            const geometry = geometries[shuffledKeys[i % shuffledKeys.length]];
            const parametricMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
            const parametricObject = new THREE.Mesh(geometry, parametricMaterial);
    
            // Centralizar os objetos na espessura do anel
            parametricObject.position.set(x, y, -1);
            ring.add(parametricObject);
    
            // Adicionar uma luz spot abaixo do objeto paramétrico
            const light = new THREE.SpotLight(0xffffff, 1, 10);
            light.position.set(x, y, -1/2); // Posição abaixo do objeto paramétrico
            ring.add(light);
            cubeLights.push(light);
        }
    }
    
    
    
    

    const ringGeometry1 = createRingGeometry(1, 3, 4, 32);
    const ringMaterial1 = new THREE.MeshLambertMaterial({ color: 0x0000ff, side: THREE.DoubleSide });
    const ring1 = new THREE.Mesh(ringGeometry1, ringMaterial1);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.set(0, 0, 0);
    rings.push(ring1);
    scene.add(ring1);

    const geometries = createGeometries();
    addParametricObjectsToRing(ring1, 2, geometries, 8);

    //addCubesToRing(ring1, 2, 0.5, 8);


    const ringGeometry2 = createRingGeometry(3, 5, 4, 32);
    const ringMaterial2 = new THREE.MeshLambertMaterial({ color: 0x0000ff, side: THREE.DoubleSide });
    const ring2 = new THREE.Mesh(ringGeometry2, ringMaterial2);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.set(0, 0, 0);
    rings.push(ring2);
    scene.add(ring2);
    addParametricObjectsToRing(ring2, 4, geometries, 8);

    const ringGeometry3 = createRingGeometry(5, 7, 4, 32);
    const ringMaterial3 = new THREE.MeshLambertMaterial({ color: 0x0000ff, side: THREE.DoubleSide });
    const ring3 = new THREE.Mesh(ringGeometry3, ringMaterial3);
    ring3.rotation.x = Math.PI / 2;
    ring3.position.set(0, 0, 0);
    rings.push(ring3);
    scene.add(ring3);
    addParametricObjectsToRing(ring3, 6, geometries, 8);

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
        new THREE.MeshPhongMaterial({ color: 0x00ff00 }),
        new THREE.MeshToonMaterial({ color: 0xff0000 }),
        new THREE.MeshNormalMaterial()
    ];

    let currentMaterialIndex = 0;
    let previousMaterialIndex = 0; // Armazena o índice do material antes de alternar para o material básico
    let useBasicMaterial = false; // Controla se o material básico (sem iluminação) está sendo usado

    function updateMaterials() {
        if (useBasicMaterial) {
            rings.forEach(ring => {
                ring.material = new THREE.MeshBasicMaterial({ color: ring.material.color });
            });
        } else {
            rings.forEach(ring => {
                ring.material = materials[currentMaterialIndex];
            });
        }
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
                pointLights.forEach(light => light.visible = pointLightOn);
                break;
            case 't':
                if (!useBasicMaterial) {
                    // Salva o índice do material antes de alternar para o material básico
                    previousMaterialIndex = currentMaterialIndex;
                    currentMaterialIndex = materials.length; // Índice para o material básico
                } else {
                    // Volta para o material anterior (com iluminação)
                    currentMaterialIndex = previousMaterialIndex;
                }
                useBasicMaterial = !useBasicMaterial; // Alterna entre o material básico (sem iluminação) e o material atual
                break;
            case 's':
                cubeLightOn = !cubeLightOn;
                cubeLights.forEach(light => light.visible = cubeLightOn);
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