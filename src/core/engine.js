/**
 * 渲染器、場景、攝影機。整個遊戲共用同一組。
 */
import * as THREE from 'three';
import { $ } from './dom.js';

THREE.ColorManagement.legacyMode = false;
/* ---------- renderer / scene ---------- */
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#cfe8f7',140,560);
const camera = new THREE.PerspectiveCamera(55,innerWidth/innerHeight,0.25,1200);
document.body.classList.add('title');

export { camera, renderer, scene };
