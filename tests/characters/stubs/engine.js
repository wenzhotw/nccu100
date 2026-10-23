// 替身：不建 WebGL 渲染器，只給一個空場景。
import * as THREE from 'three';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.25, 1200);
const renderer = { domElement: {}, setSize() {}, setPixelRatio() {}, render() {}, shadowMap: {} };
const MOBILE = false;   // 正式版在觸控裝置是 true（手機省電設定）；快照固定用電腦版
export { MOBILE, camera, renderer, scene };
