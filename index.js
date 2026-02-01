import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import spline from "./spline.js";
import { EffectComposer } from "jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "jsm/postprocessing/UnrealBloomPass.js";

const w = window.innerWidth;
const h = window.innerHeight;

const scene = new THREE.Scene();
// Dark background to let the green dots pop
scene.background = new THREE.Color(0x000205); 
scene.fog = new THREE.FogExp2(0x000000, 0.25);

const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- POST-PROCESSING ---
const renderScene = new RenderPass(scene, camera);
// Threshold is key: 
// Increasing it ensures only the brightest objects (green dots) glow.
const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 100);
bloomPass.threshold = 0.5; // High threshold ignores the dim purple lines
bloomPass.strength = 2.5; 
bloomPass.radius = 0.1; 

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- TUBE GEOMETRY ---
const tubeGeo = new THREE.TubeGeometry(spline, 222, 0.65, 16, true);

// 1. THE FILL (Subtle Purple)
const tubeMat = new THREE.MeshBasicMaterial({
  color: 0x550066, // Darker purple so it stays below bloom threshold
  side: THREE.BackSide,
  transparent: true,
  opacity: 0.4
});
const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
scene.add(tubeMesh);

// 2. THE LINES (Dim Purple/Pink)
const edges = new THREE.EdgesGeometry(tubeGeo, 0.2);
const lineMat = new THREE.LineBasicMaterial({ 
  color: 0xffffff, // Dim color so it doesn't glow
  transparent: false, 
  opacity: 0.2
});
const tubeLines = new THREE.LineSegments(edges, lineMat);
scene.add(tubeLines);

// 3. THE GLOWING DOTS (Green)
// We use the same tubeGeo vertices for the points
const pointsMat = new THREE.PointsMaterial({
  color: 0x00ff88, // Bright Neon Green
  size: 0.012,     // Small, sharp dots
  transparent: true,
  blending: THREE.AdditiveBlending
});
const tubePoints = new THREE.Points(tubeGeo, pointsMat);
scene.add(tubePoints);

// --- FLOATING BOXES ---
const numBoxes = 55;
const size = 0.075;
const boxGeo = new THREE.BoxGeometry(size, size, size);
for (let i = 0; i < numBoxes; i += 1) {
  const p = (i / numBoxes + Math.random() * 0.1) % 1;
  const pos = tubeGeo.parameters.path.getPointAt(p);
  pos.x += Math.random() - 0.4;
  pos.z += Math.random() - 0.4;
  
  const boxEdges = new THREE.EdgesGeometry(boxGeo, 0.2);
  // Using HSL to keep these in the green/cyan range
  const color = new THREE.Color().setHSL(1, 0.1, 1); 
  const boxLineMat = new THREE.LineBasicMaterial({ color });
  const boxLines = new THREE.LineSegments(boxEdges, boxLineMat);
  boxLines.position.copy(pos);
  boxLines.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
  scene.add(boxLines);
}

function updateCamera(t) {
  const time = t * 0.1;
  const looptime = 15 * 1000;
  const p = (time % looptime) / looptime;
  const pos = tubeGeo.parameters.path.getPointAt(p);
  const lookAt = tubeGeo.parameters.path.getPointAt((p + 0.01) % 1);
  camera.position.copy(pos);
  camera.lookAt(lookAt);
}

function animate(t = 0) {
  requestAnimationFrame(animate);
  updateCamera(t);
  composer.render(scene, camera);
  controls.update();
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});