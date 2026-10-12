/**
 * 游泳館獨立模型。保留奶油色長立面、灰色高館體、長窗帶與藍橘轉角招牌。
 * 純色色塊及平面窗紋符合既有遊戲風格，不製作照片磁磚或密集小窗框。
 * 側面、背面及屋頂依照片有限視角簡化，並非實測建築復原。
 */
import * as THREE from 'three';
import { SWIM } from './layout.js';
const BOX = new THREE.BoxGeometry(1, 1, 1);
const C = { cream: '#efeadb', sand: '#d9c6a4', grey: '#9da7a7', roof: '#b4bdbc', trim: '#d2d8d1', dark: '#4b555b', glass: '#a9c9d4', glassLight: '#c9e1e7', blue: '#65ace0', orange: '#ef9255', base: '#939b9a', step: '#d4d5cb' };

function texture(width, height, draw) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const render = () => { const g = canvas.getContext('2d'); g.clearRect(0, 0, width, height); draw(g, width, height); };
  render();
  const t = new THREE.CanvasTexture(canvas); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  t.redraw = () => { render(); t.needsUpdate = true; };
  return t;
}

function windows(columns, rows, frame = C.cream) {
  return texture(1024, 256, (g, w, h) => {
    g.fillStyle = frame; g.fillRect(0, 0, w, h);
    const cw = w / columns, rh = h / rows;
    for (let c = 0; c < columns; c++) for (let r = 0; r < rows; r++) {
      const x = c * cw + 7, y = r * rh + 7;
      g.fillStyle = C.dark; g.fillRect(x, y, cw - 14, rh - 14);
      g.fillStyle = C.glass; g.fillRect(x + 5, y + 5, cw - 24, rh - 24);
      g.fillStyle = C.glassLight; g.fillRect(x + 5, y + 5, cw - 24, (rh - 24) * .2);
      g.fillStyle = frame; g.fillRect(c * cw + cw / 2 - 2, y, 4, rh - 14);
    }
  });
}

function vents(columns) {
  return texture(1024, 128, (g, w, h) => {
    g.fillStyle = C.sand; g.fillRect(0, 0, w, h);
    const cw = w / columns;
    for (let i = 0; i < columns; i++) {
      g.fillStyle = C.dark; g.fillRect(i * cw + 10, 10, cw - 20, h - 20);
      g.fillStyle = C.grey;
      [40, 64, 88].forEach(y => g.fillRect(i * cw + 10, y, cw - 20, 4));
    }
  });
}

export function createSwimmingHall({ materialFactory = (color, extra) => new THREE.MeshToonMaterial({ color, ...extra }) } = {}) {
  const group = new THREE.Group(); group.name = 'swimming-hall';
  group.userData = { name: '游泳館', style: 'game-matched-simplified', frontNormal: { ...SWIM.frontNormal }, inferred: ['rear', 'unseen-side', 'roof', 'dimensions'] };
  const mat = Object.fromEntries(Object.entries(C).map(([key, color]) => [key, materialFactory(color)]));
  const batches = new Map(); let parts = 0;
  function box(name, x, y, z, w, h, d, material, occluder = false) {
    parts++;
    // 鏡頭牆面射線略過 InstancedMesh，主牆及雨棚須保留一般 Mesh。
    if (occluder) {
      const m = new THREE.Mesh(BOX, material); m.name = name; m.position.set(x, y, z); m.scale.set(w, h, d);
      m.castShadow = m.receiveShadow = true; group.add(m); return m;
    }
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push({ name, x, y, z, w, h, d });
  }
  function face(name, w, h, t, x, y, z, ry = 0, basic = false) {
    const material = basic ? new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }) : materialFactory('#ffffff', { map: t });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); m.name = name; m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = !basic; group.add(m); return m;
  }

  // 前低後高的兩個量體，長立面朝法學院，門廊在正面左側。
  box('灰色高館體', 0, 5.1, -2, 26, 10.2, 10, mat.grey, true);
  box('前棟主體', 0, 4.35, 4.715, 26, 8.7, 3.43, mat.sand, true);
  box('入口左側立面', -11.55, 4.35, 6.72, 2.9, 8.7, .57, mat.sand, true);
  box('入口右側立面', 4.15, 4.35, 6.72, 17.7, 8.7, .57, mat.sand, true);
  box('入口上方立面', SWIM.entranceX, 6.51, 6.72, 5.4, 4.38, .57, mat.cream, true);
  box('前棟奶油上半部', 0, 6.8, 6.97, 26, 3.8, .08, mat.cream);
  // 正面的長窗用一片貼圖，黑色粗框強調照片最明顯的水平輪廓。
  face('正面長窗帶', 25.2, 2.2, windows(8, 1), 0, 6.25, 7.03);
  face('正面高窗百葉', 24.9, .58, vents(8), 0, 7.89, 7.04);
  [5.03, 8.35].forEach(y => box('長窗深灰外框', 0, y, 7.13, 26.2, .28, .24, mat.dark));
  [-12.97, 12.97].forEach(x => box('長窗端部粗框', x, 6.68, 7.13, .27, 3.6, .24, mat.dark));
  face('下層通風窗', 11.8, 1.0, vents(4), 2.55, 3.87, 7.04);
  face('左側通風窗', 2.25, .94, vents(1), -11.55, 3.84, 7.04);
  box('前棟平屋頂', 0, 8.8, 5.0, 26.6, .28, 4.55, mat.cream, true);
  box('高館平屋頂', 0, 10.42, -2, 26.6, .42, 10.55, mat.roof, true);
  // 灰色板面僅保留幾條寬縫，不使用密集金屬肋條。
  for (let x = -11; x <= 11; x += 2.75) box('館體寬板縫', x, 9.55, 3.03, .055, 1.3, .08, mat.trim);

  // 照片右側為奶油色粗柱與大玻璃。後方不可見部分採同色簡化。
  face('右側上層大玻璃', 9.3, 4.45, windows(4, 2), 13.035, 7.27, -2, Math.PI / 2);
  face('右側下層玻璃', 9.3, 2.62, windows(4, 1), 13.04, 2.55, -2, Math.PI / 2);
  box('右側樓層粗橫梁', 13.1, 4.65, -2, .28, .65, 10.2, mat.cream);
  [-6.8, -4.4, -2, .4, 2.8].forEach(z => box('右側大方柱', 13.09, 5.25, z, .30, 9.6, .22, mat.cream));
  face('後側簡化高窗', 24, 2.2, windows(8, 1), 0, 7.5, -7.025, Math.PI);
  face('左側簡化高窗', 8.8, 2.2, windows(3, 1), -13.025, 7.5, -2, -Math.PI / 2);
  // 前端山牆及基腳用大色塊，避免磁磚格紋搶走遊戲風格。
  box('右側前端素色牆', 13.02, 4.65, 5, .09, 7.1, 4, mat.sand);
  box('後方基腳', 0, .48, -.29, 26.2, .96, 13.42, mat.base);
  box('前方左基腳', -11.60, .48, 6.765, 3.0, .96, .69, mat.base);
  box('前方右基腳', 4.20, .48, 6.765, 17.8, .96, .69, mat.base);

  // 藍色直排「游泳」和橘色轉角招牌是此棟的辨識重點。
  ['游', '泳'].forEach((char, i) => {
    const t = texture(160, 160, g => { g.font = '900 128px "Noto Sans CJK TC","Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.blue; g.fillText(char, 80, 85); });
    face('藍色直排題字' + char, 1.25, 1.25, t, 11.55, 4.4 - i * 1.2, 7.18, 0, true);
  });
  box('橘色正面招牌', 11.2, 2.13, 7.19, 3.75, .74, .32, mat.orange);
  const name = texture(160, 160, g => { g.font = '900 128px "Noto Sans CJK TC","Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.cream; g.fillText('館', 80, 85); });
  face('館字', .64, .60, name, 10.1, 2.13, 7.36, 0, true);
  const english = texture(512, 128, g => { g.font = '700 57px Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.dark; g.fillText('Swimming Hall', 256, 65); });
  face('正面英文招牌', 2.37, .58, english, 11.80, 2.13, 7.365, 0, true);
  box('橘色轉角招牌', 13.12, 2.13, 5.6, .32, .74, 2.95, mat.orange);
  face('側面英文招牌', 2.8, .58, english, 13.29, 2.13, 5.6, Math.PI / 2, true);

  // 左偏入口、粗柱小雨棚、四級階梯與側向坡道，入口正前方保留行走空間。
  box('入口陰影', SWIM.entranceX, 2.7, 6.45, 5.4, 3.2, .045, mat.dark);
  face('入口玻璃門', 3.8, 2.95, windows(2, 1, C.cream), SWIM.entranceX, 2.58, 6.48);
  box('入口雨棚', SWIM.entranceX, 4.37, 7.76, 6.45, .48, 3.18, mat.cream, true);
  box('雨棚陰影線', SWIM.entranceX, 4.11, 7.76, 6.25, .10, 3.0, mat.trim);
  [-10, -4.8].forEach(x => box('入口方柱', x, 2.67, 8.42, .42, 3.14, .42, mat.cream));
  const s = SWIM;
  box('入口平台', s.entranceX, s.landingHeight / 2, (s.entranceBack + s.landingFront) / 2, s.landingWidth, s.landingHeight, s.landingFront - s.entranceBack, mat.step, true);
  const stepDepth = (s.stairStart - s.landingFront) / s.stairCount;
  for (let i = 0; i < s.stairCount; i++) {
    const h = (i + 1) * s.landingHeight / s.stairCount;
    box('入口階梯', s.entranceX, h / 2, s.stairStart - (i + .5) * stepDepth, s.stairWidth, h, stepDepth + .002, mat.step);
  }
  // 坡道直接使用真斜面，heightAt 與幾何共用同一組端點。
  const ramp = new THREE.Shape(); ramp.moveTo(s.rampLeft, 0); ramp.lineTo(s.rampRight, 0); ramp.lineTo(s.rampLeft, s.landingHeight); ramp.closePath();
  const rampGeo = new THREE.ExtrudeGeometry(ramp, { depth: s.rampFront - s.rampBack, bevelEnabled: false, steps: 1 });
  const rampMesh = new THREE.Mesh(rampGeo, mat.step); rampMesh.name = '可行走側坡道'; rampMesh.position.z = s.rampBack; rampMesh.castShadow = rampMesh.receiveShadow = true; group.add(rampMesh);
  const rail = new THREE.Shape(); rail.moveTo(s.rampLeft, s.landingHeight); rail.lineTo(s.rampRight, 0); rail.lineTo(s.rampRight, .33); rail.lineTo(s.rampLeft, s.landingHeight + .33); rail.closePath();
  const railMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(rail, { depth: .18, bevelEnabled: false, steps: 1 }), mat.trim); railMesh.name = '坡道簡化側欄'; railMesh.position.z = 8.62; railMesh.castShadow = railMesh.receiveShadow = true; group.add(railMesh);
  box('平台左側欄', -10.11, 1.23, 7.98, .18, .35, 1.56, mat.trim);
  const side = new THREE.Shape(); side.moveTo(s.landingFront, 0); side.lineTo(s.stairStart, 0); side.lineTo(s.stairStart, .33); side.lineTo(s.landingFront, s.landingHeight + .33); side.closePath();
  const sideGeo = new THREE.ExtrudeGeometry(side, { depth: .18, bevelEnabled: false, steps: 1 }); sideGeo.rotateY(-Math.PI / 2);
  const sideMesh = new THREE.Mesh(sideGeo, mat.trim); sideMesh.name = '階梯左側欄'; sideMesh.position.x = -10.02; sideMesh.castShadow = sideMesh.receiveShadow = true; group.add(sideMesh);

  const transform = new THREE.Object3D();
  for (const [material, pieces] of batches) {
    const batch = new THREE.InstancedMesh(BOX, material, pieces.length); batch.name = '游泳館色塊：' + pieces[0].name; batch.castShadow = batch.receiveShadow = true;
    pieces.forEach((p, i) => { transform.position.set(p.x, p.y, p.z); transform.scale.set(p.w, p.h, p.d); transform.updateMatrix(); batch.setMatrixAt(i, transform.matrix); });
    batch.instanceMatrix.needsUpdate = true; batch.userData.partCount = pieces.length; group.add(batch);
  }
  group.userData.parts = parts; group.userData.drawables = group.children.length;
  return group;
}
