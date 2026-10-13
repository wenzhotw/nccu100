/**
 * 室內空間（房間）系統。
 *
 * 每個室內是一個獨立的 THREE.Scene，有自己的碰撞、燈光、背景、地面高度和區域名稱。
 * 在室內時只畫那個房間，校園完全不畫；回到戶外再換回校園。這跟一般遊戲「進門換場景」的做法一樣。
 *
 * 建築在 defineBuilding 的 interior（或 interiors 陣列）登記房間，格式見 docs/interiors.md：
 *   { id, name, build, bounds, spawn, entrance, exit, returnTo, heightAt?, zone?, clamp?, background?, light? }
 *
 * 房間第一次走進去才建立（build），遊戲一開始不用載入所有室內。
 * build 裡照常用 block()、mk()、boxC() 這些工具，它們會先加到校園場景，
 * 這裡會把 build 期間新增的物件和碰撞整批搬進房間自己的場景和碰撞清單。
 */
import * as THREE from 'three';
import { scene } from './engine.js';
import { colliders, setActiveColliders, setRoomClamp } from './collision.js';

/** 所有房間：id → { id, def, scene, colliders, built } */
export const rooms = {};
/** 會跟著主角進出房間的物件（主角、影子、腳步煙塵） */
const carried = [];

/** 取得（必要時建立）某個房間的資料。NPC、校園故事這類先載入的東西可以先放進去 */
export function room(id) {
  if (!rooms[id]) {
    const s = new THREE.Scene();
    rooms[id] = { id, def: null, scene: s, colliders: [], built: false };
  }
  return rooms[id];
}
/** 某個房間的場景（給 NPC、故事水晶等放東西用） */
export const roomScene = id => room(id).scene;

/** 由建築登記房間設定（world/registry.js 的 installBuilding 會呼叫） */
export function registerRoom(def) {
  const r = room(def.id);
  r.def = def;
  return r;
}

/** 主角換場景時要一起搬過去的物件 */
export function carry(obj) { carried.push(obj); }

/** 第一次進房間：建立內容，並把 build 期間加到校園的物件與碰撞搬進房間 */
function build(r) {
  if (r.built) return;
  r.built = true;
  const d = r.def;
  const n0 = scene.children.length, c0 = colliders.length;
  d.build && d.build();
  const added = scene.children.slice(n0);
  added.forEach(o => r.scene.add(o));          // add() 會自動從原本的父物件移除
  r.colliders.push(...colliders.splice(c0));
  // 背景與預設燈光
  r.scene.background = new THREE.Color(d.background || '#2b2522');
  if (d.light) d.light(r.scene);
  else {
    r.scene.add(new THREE.HemisphereLight('#fff6e8', '#9a8f80', 1.0));
    const sunIn = new THREE.DirectionalLight('#fff4e2', 0.8); sunIn.position.set(6, 20, 12); r.scene.add(sunIn);
  }
}

/** 目前所在房間（戶外是 null） */
export let current = null;

/** 換到某個房間；id 是 null 表示回到戶外。回傳要畫的場景 */
export function switchTo(id) {
  const r = id ? room(id) : null;
  if (r) build(r);
  const target = r ? r.scene : scene;
  carried.forEach(o => target.add(o));
  setActiveColliders(r ? r.colliders : colliders);
  setRoomClamp(r && r.def ? (p => clampToRoom(r.def, p)) : null);
  current = r;
  return target;
}

/** 房間範圍：主角不能走出 bounds，房間另外可以加 clamp（例如舞台前的牆） */
function clampToRoom(d, p) {
  const b = d.bounds;
  if (b) { p.x = Math.max(b.x0, Math.min(b.x1, p.x)); p.z = Math.max(b.z0, Math.min(b.z1, p.z)); }
  if (d.clamp) d.clamp(p);
}

/** 目前要畫的場景 */
export const activeScene = () => (current ? current.scene : scene);
