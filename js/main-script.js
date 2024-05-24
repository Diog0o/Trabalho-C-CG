import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import Stats from 'three/addons/libs/stats.module.js';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

let scene, camera, renderer, controls, stats, cylinder;
let rings = [];
let keyState = {};
let ringSpeeds = [0.01, 0.01, 0.01];
const ringLimits = { min: -1, max: 3 };
const ringMoveSpeeds = [0.02, 0.02, 0.02];
let ringDirections = [1, 1, 1];

const ambientLightColor = 0xffa500;
const ambientLightIntensity = 0.2;
const directionalLightColor = 0xffffff;
const directionalLightIntensity = 1;
let directionalLight;
let directionalLightOn = true;

let pointLights = [];
let pointLightOn = true;

let cubeLights = [];
let cubeLightOn = true;
function createScene() {
    'use strict';

    scene = new THREE.Scene();

    function createMobiusStrip() {
        const totalSegments = 2048;
        const calc = 256;
        const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
        let mobiusStrip = new THREE.Object3D();
    
        for (let i = 0; i < totalSegments; i++) {
            const angle = Math.PI / totalSegments * 2 * i;
    
            if (i % calc === 0) {
                let light = new THREE.PointLight(new THREE.Color('white'), 50, 50);
                light.castShadow = true;
                light.shadow.mapSize.width = 1024;
                light.shadow.mapSize.height = 1024;
                light.shadow.camera.near = 0.1;
                light.shadow.camera.far = 50;
    
                light.position.set(Math.cos(angle), Math.sin(angle * 5) / 30, Math.sin(angle));
                light.position.multiplyScalar(10);
                mobiusStrip.add(light);
                pointLights.push(light);
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

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    function addParametricObjectsToRing(ring, radius, numObjects, flag) {
        const angleStep = (Math.PI * 2) / numObjects;
        
        for (let i = 0; i < numObjects; i++) {
            const angle = i * angleStep;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
    
            const parametricFunction = function (u, v, target) {
                const x = Math.sin(u * Math.PI) * Math.cos(v * Math.PI);
                const y = Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
                const z = Math.cos(u * Math.PI);
                target.set(x, y, z);
            };

            const parametricPlane = function (u, v, target) {
                const x = u - 0.5;
                const y = v - 0.5;
                const z = 0;
                target.set(x, y, z);
            };

            const parametricTorus = function (u, v, target) {
                const R = 1;
                const r = 0.3;
                const x = (R + r * Math.cos(v * Math.PI * 2)) * Math.cos(u * Math.PI * 2);
                const y = (R + r * Math.cos(v * Math.PI * 2)) * Math.sin(u * Math.PI * 2);
                const z = r * Math.sin(v * Math.PI * 2);
                target.set(x, y, z);
            };

            const parametricKleinBottle = function (u, v, target) {
                u *= Math.PI;
                v *= 2 * Math.PI;
                u = u * 2;
                const x = (Math.cos(u) * (6 + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v)));
                const y = (Math.sin(u) * (6 + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v)));
                const z = (Math.sin(u / 2) * Math.sin(v) + Math.cos(u / 2) * Math.sin(2 * v));
                target.set(x, y, z);
            };

            const parametricMobiusStrip = function (u, v, target) {
                u *= Math.PI * 2;
                v = v * 2 - 1;
                const x = Math.cos(u) * (1 + v / 2 * Math.cos(u / 2));
                const y = Math.sin(u) * (1 + v / 2 * Math.cos(u / 2));
                const z = v / 2 * Math.sin(u / 2);
                target.set(x, y, z);
            };

            const parametricEllipsoid = function (u, v, target) {
                const a = 1;
                const b = 1.5;
                const c = 1;
                u *= Math.PI;
                v *= 2 * Math.PI;
                const x = a * Math.sin(u) * Math.cos(v);
                const y = b * Math.sin(u) * Math.sin(v);
                const z = c * Math.cos(u);
                target.set(x, y, z);
            };

            const parametricTorusKnot = function (u, v, target) {
                const p = 2;
                const q = 3;
                const r = 0.4;
                u *= 2 * Math.PI;
                v *= 2 * Math.PI;
                const x = (2 + Math.cos(q * u)) * Math.cos(p * u);
                const y = (2 + Math.cos(q * u)) * Math.sin(p * u);
                const z = Math.sin(q * u);
                target.set(x + r * Math.cos(v), y + r * Math.sin(v), z);
            };

            const parametricCylinder = function (u, v, target) {
                const radius = 1;
                const height = 2;
                u *= 2 * Math.PI;
                v = v * height - height / 2;
                const x = radius * Math.cos(u);
                const y = v;
                const z = radius * Math.sin(u);
                target.set(x, y, z);
            };

            const numbers = Array.from({ length: 8 }, (_, i) => i + 1);
            const shuffledNumbers = shuffleArray(numbers);
            const geometryIndex = shuffledNumbers[0];
            numbers.shift();
            
            let geometry;
            let parametricMaterial;
            let parametricObject;

            if (geometryIndex === 1) {
                geometry = new ParametricGeometry(parametricPlane, 25, 25);
                parametricMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
                parametricObject = new THREE.Mesh(geometry, parametricMaterial);
                geometry.scale(0.5, 0.5, 0.5);
            } else if (geometryIndex === 2) {
                geometry = new ParametricGeometry(parametricTorus, 25, 25);
                parametricMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
                parametricObject = new THREE.Mesh(geometry, parametricMaterial);
                geometry.scale(0.5, 0.5, 0.5);
            }else if (geometryIndex === 3) {
                geometry = new ParametricGeometry(parametricKleinBottle, 25, 25);
                parametricMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
                parametricObject = new THREE.Mesh(geometry, parametricMaterial);
                geometry.scale(0.05, 0.05, 0.05);
            }else if (geometryIndex === 4) {
                geometry = new ParametricGeometry(parametricMobiusStrip, 25, 25);
                parametricMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
                parametricObject = new THREE.Mesh(geometry, parametricMaterial);
                geometry.scale(0.5, 0.5, 0.5);
            }else if (geometryIndex === 5) {
                geometry = new ParametricGeometry(parametricEllipsoid, 25, 25);
                parametricMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
                parametricObject = new THREE.Mesh(geometry, parametricMaterial);
                geometry.scale(0.5, 0.5, 0.5);
            }else if (geometryIndex === 6) {
                geometry = new ParametricGeometry(parametricTorusKnot, 25, 25);
                parametricMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
                parametricObject = new THREE.Mesh(geometry, parametricMaterial);
                geometry.scale(0.15, 0.15, 0.15);
            }else if (geometryIndex === 7) {
                geometry = new ParametricGeometry(parametricCylinder, 25, 25);
                parametricMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
                parametricObject = new THREE.Mesh(geometry, parametricMaterial);
                geometry.scale(0.5, 0.5, 0.5);
            }else if (geometryIndex === 8) {
                geometry = new ParametricGeometry(parametricFunction, 25, 25);
                parametricMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
                parametricObject = new THREE.Mesh(geometry, parametricMaterial);
                geometry.scale(0.5, 0.5, 0.5);
            }
    
            if (flag == 3) {
                parametricObject.scale.set(1.5, 1.5, 1.5);
            } else if (flag == 1) {
                parametricObject.scale.set(0.75, 0.75, 0.75);
            }

            parametricObject.rotation.x = Math.random() * 2 * Math.PI;
            parametricObject.rotation.y = Math.random() * 2 * Math.PI;
            parametricObject.rotation.z = Math.random() * 2 * Math.PI;
    
            parametricObject.position.set(x, y, -1);
            ring.add(parametricObject);
    
            const light = new THREE.SpotLight(0xffffff, 5, 5);
            light.position.set(x, y, -1.5);
            light.target = parametricObject;
            ring.add(light);
            ring.add(light.target);
            cubeLights.push(light);
        }
    }
    
    const ringGeometry1 = createRingGeometry(1, 3, 2, 32);
    const ringMaterial1 = new THREE.MeshLambertMaterial({ color: 0x0000ff});
    const ring1 = new THREE.Mesh(ringGeometry1, ringMaterial1);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.set(0, 0, 0);
    rings.push(ring1);
    scene.add(ring1);

    addParametricObjectsToRing(ring1, 2, 8, 1);

    const ringGeometry2 = createRingGeometry(3, 5, 2, 32);
    const ringMaterial2 = new THREE.MeshLambertMaterial({ color: 0x0000ff});
    const ring2 = new THREE.Mesh(ringGeometry2, ringMaterial2);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.set(0, 0, 0);
    rings.push(ring2);
    scene.add(ring2);
    addParametricObjectsToRing(ring2, 4, 8, 2);

    const ringGeometry3 = createRingGeometry(5, 7, 2, 32);
    const ringMaterial3 = new THREE.MeshLambertMaterial({ color: 0x0000ff });
    const ring3 = new THREE.Mesh(ringGeometry3, ringMaterial3);
    ring3.rotation.x = Math.PI / 2;
    ring3.position.set(0, 0, 0);    
    rings.push(ring3);
    scene.add(ring3);
    addParametricObjectsToRing(ring3, 6, 8, 3);

    const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 6, 32);
    const cylinderMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff});
    cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.position.set(0, 0, 0);
    scene.add(cylinder);

    const loader = new THREE.TextureLoader();
    const texture = loader.load('imagem.png');

    const skyGeometry = new THREE.SphereGeometry(500, 60, 40, 0, Math.PI * 2, 0, Math.PI / 2);
    const skyMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
    });
    const skydome = new THREE.Mesh(skyGeometry, skyMaterial);

    scene.add(skydome);

    createMobiusStrip();
}

var cameraGroup;
function createCamera() {
    'use strict';

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    cameraGroup = new THREE.Group();
    cameraGroup.position.set(10, 10, 20);
    cameraGroup.add(camera);
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
    let previousMaterialIndex = 0;
    let useBasicMaterial = false;

    function updateMaterials() {
        if (useBasicMaterial) {
            rings.forEach(ring => {
                ring.material = new THREE.MeshBasicMaterial({ color: ring.material.color });
            });
        } else {
            rings.forEach(ring => {
                ring.material = materials[currentMaterialIndex];
                cylinder.material = materials[currentMaterialIndex];
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
                    previousMaterialIndex = currentMaterialIndex;
                    currentMaterialIndex = materials.length; 
                } else {
                    currentMaterialIndex = previousMaterialIndex;
                }
                useBasicMaterial = !useBasicMaterial;
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

    document.body.appendChild(VRButton.createButton(renderer));
    renderer.xr.enabled = true;

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

    if (cylinder) {
        cylinder.rotation.y += 0.01;
    }

    rings.forEach((ring, index) => {
        ring.rotation.z += ringSpeeds[index];
        ring.position.y += ringDirections[index] * ringMoveSpeeds[index];

        if (ring.position.y > ringLimits.max || ring.position.y < ringLimits.min) {
            ringDirections[index] *= -1;
        }
    });

    rings.forEach(ring => {
        ring.children.forEach(child => {
            if (child instanceof THREE.Mesh) {
                child.position.sub(ring.position);
                child.rotation.x += 0.01;
                child.rotation.y += 0.01;
                child.position.add(ring.position);
            }
        });
    });

        controls.update();
        stats.update();
        renderer.render(scene, cameraGroup.children[0]);
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