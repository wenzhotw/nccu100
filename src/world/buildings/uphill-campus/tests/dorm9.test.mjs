// 2026-11-06 照片 9024（九舍北側：粉灰小方磚、深色窗台窗楣、白框窗、窗邊冷氣、一樓鐵窗）。
// 九舍東端（照片 9005，zq10.js）與南面安九（shanju.js）已有外觀，這裡補上其餘的牆。
import test from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUT, LOBBY, SHANJU } from '../layout.js';
import { heightAt, pointInPoly, projectToPath } from '../terrain.js';
import { dorm9Faces, dorm9AcUnits, dorm9Ledges, dorm9Roofs, DORM9, LOBBY_TOP } from '../dorm9-model.js';

const jiu = LAYOUT.buildings.filter(b => /九舍/.test(b.name) || b.osm === LOBBY.osm);
const lobby = jiu.find(b => b.osm === LOBBY.osm).pts;
const tower = [[SHANJU.x0, SHANJU.z0], [SHANJU.x1, SHANJU.z0], [SHANJU.x1, SHANJU.z1], [SHANJU.x0, SHANJU.z1]];
const inside = (x, z) => jiu.some(b => b.osm !== LOBBY.osm && pointInPoly(x, z, b.osm === SHANJU.osm ? SHANJU.rest : b.pts));

test('九舍 ABC、D 區還沒有外觀的牆都補上，法線朝外，不和東端、安九、山居重疊', () => {
  const faces = dorm9Faces();
  assert(faces.length >= 18, `牆面數：${faces.length}`);
  for (const f of faces) {
    const [mx, mz] = f.mid;
    const ox = mx + f.n[0] * 0.4, oz = mz + f.n[1] * 0.4;
    assert(!inside(ox, oz) && !pointInPoly(ox, oz, tower), `法線朝內或貼著別棟：${f.mid}`);
    // 貼著一層樓大廳的牆，從大廳屋頂以上開始。
    if (pointInPoly(ox, oz, lobby)) assert.equal(f.y0, LOBBY_TOP);
    else assert(Math.abs(f.y0 - heightAt(mx + f.n[0] * 0.6, mz + f.n[1] * 0.6)) < 0.31 || f.y0 === f.base, `牆底沒貼地：${f.mid}`);
    assert(inside(mx - f.n[0] * 0.4, mz - f.n[1] * 0.4), `背面不是九舍：${f.mid}`);
    assert(Math.min(f.a[0], f.b[0]) < 37, '東端已由 zq10.js 貼過');
    assert(!(f.n[1] > 0.9 && mz > -4), '南面安九已有外觀');
    assert(f.y1 === f.base + DORM9.floors[f.osm] * DORM9.floorH && f.y0 < f.y1 - 2, `高度不對：${f.y0}～${f.y1}`);
  }
  // 大廳兩側的高樓牆（ABC 中庭兩翼、D 區北面）也要有。
  assert(faces.filter(f => f.y0 === LOBBY_TOP).length >= 3);
  // ABC 區北面（照片 9024 的那一面）與 D 區兩側都有。
  assert(faces.some(f => f.osm === SHANJU.osm && f.n[1] < -0.9));
  assert(faces.filter(f => f.osm === 510739854).length >= 10);
});

test('每層一道深色窗台飾帶，冷氣掛在窗邊、牆外側，一樓沒有冷氣', () => {
  const faces = dorm9Faces();
  assert(dorm9Ledges().length >= faces.length);
  const ac = dorm9AcUnits();
  assert(ac.length > 80 && ac.length < 500, `冷氣數：${ac.length}`);
  for (const u of ac) {
    const f = faces.find(face => projectToPath(u.x, u.z, [face.a, face.b]).distance < 0.35 ** 2);
    assert(f, `冷氣沒貼牆：${u.x},${u.z}`);
    assert(!inside(u.x, u.z), `冷氣在牆裡：${u.x},${u.z}`);
    assert(u.y > Math.max(f.y0, f.base + DORM9.floorH) && u.y < f.y1, `冷氣高度：${u.y}`);
  }
});

test('ABC、D 區屋頂各蓋一層灰色防水層（不再是整片亮白灰盒頂），高度等於牆頂', () => {
  const roofs = dorm9Roofs(), faces = dorm9Faces();
  assert.equal(roofs.length, 2);
  for (const r of roofs) {
    const top = faces.find(f => f.osm === r.osm).y1;
    assert(r.y > top && r.y < top + 0.1, `屋頂高度：${r.y}`);
    assert(r.pts.length >= 10);
  }
});
