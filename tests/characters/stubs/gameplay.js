// 替身：角色建立時只需要地面高度與互動點清單。
import * as THREE from 'three';
const pos = new THREE.Vector3(), vel = new THREE.Vector3(), camT = new THREE.Vector3();
const spots = [];
const groundH = () => 0, indoor = () => false, zoneOf = () => null, spotById = id => spots.find(s => s.id === id);
const lerpA = (a, b, t) => a + (b - a) * t;
const enterRoom = () => {}, exitRoom = () => {}, transition = () => {};
export { camT, enterRoom, exitRoom, spotById, groundH, indoor, lerpA, pos, spots, transition, vel, zoneOf };
