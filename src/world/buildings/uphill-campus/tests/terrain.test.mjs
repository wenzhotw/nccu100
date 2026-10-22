// 驗證三層地形的座標查詢與分區空隙備援，供後續階梯和坡道共用。
import test from 'node:test';
import assert from 'node:assert/strict';
import { pointInPoly, regionAt, heightAt } from '../terrain.js';
import { R } from '../layout.js';

test('三個地標回傳核可的平台高度', () => {
  assert.equal(heightAt(-90.6, -31.4), 0);
  assert.equal(heightAt(-40, 0), 12);
  assert.equal(heightAt(73, -36), 15);
});

test('地圖內每兩公尺取樣都回傳有限高度，階梯與坡道外維持平台層高', async () => {
  // Task 4 加入坡道後，階梯與坡道範圍內都可有中間高度，仍須有限且介於零至十五。
  // 以獨立幾何距離判斷通路範圍，不使用正式投影函式；通路外保留平台層高斷言。
  const { STAIRS, RAMPS } = await import('../layout.js');
  const inPassage = (x, z) => [...STAIRS, ...RAMPS].some(passage => passage.path.slice(1).some(([bx, bz], i) => {
    const [ax, az] = passage.path[i];
    const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz);
    const along = ((x - ax) * dx + (z - az) * dz) / length;
    const distance = along < 0 ? Math.hypot(x - ax, z - az)
      : along > length ? Math.hypot(x - bx, z - bz)
        : Math.abs((x - ax) * dz - (z - az) * dx) / length;
    return distance <= passage.width / 2;
  }));
  const checkSample = (x, z) => {
    const height = heightAt(x, z);
    // 坡頂人行道高出路面一個路緣石，最高 15.12 公尺。
    assert.ok(Number.isFinite(height) && height >= 0 && height <= 15.12 + 1e-9, `地面（${x}，${z}）`);
    const inLandscape = RAMPS.some(r=>r.path.slice(1).some((b,i)=>{
      const a=r.path[i],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);
      const along=((x-a[0])*dx+(z-a[1])*dz)/l,side=((x-a[0])*-dz+(z-a[1])*dx)/l;
      return along>=0 && along<=l && side>=r.width/2 && side<=r.width/2+4.2;
    }));
    // 2026-10-22：九舍樓梯兩側 5 公尺內是順著樓梯的草坡（照片 9034），也不是平台層高。
    const jiu = STAIRS.find(s => s.id === 'jiu-plaza');
    const nearJiu = jiu.path.slice(1).some(([bx, bz], i) => {
      const [ax, az] = jiu.path[i], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz);
      const along = ((x - ax) * dx + (z - az) * dz) / l;
      return along >= 0 && along <= l && Math.abs((x - ax) * dz - (z - az) * dx) / l < 5;
    });
    if (!inPassage(x, z) && !inLandscape && !nearJiu) assert.ok([0, 12, 15].includes(height), `平台（${x}，${z}）`);
  };
  for (let x = R.x0; x <= R.x1; x += 2) {
    for (let z = R.z0; z <= R.z1; z += 2) {
      checkSample(x, z);
    }
  }
  // 深度為奇數，兩公尺網格不含最南邊，另外檢查該邊界。
  for (let x = R.x0; x <= R.x1; x += 2) {
    checkSample(x, R.z1);
  }
});

test('分區空隙採用最近多邊形邊的層高', () => {
  // 南側的（0，100）離 L2 南緣約 65 公尺，其他兩區超過 100 公尺。
  // 西北角距 L1 北緣約 17 公尺；東側點距 L3 東緣約 8 公尺。
  // （40，−65）距 L3 北邊約 5.5 公尺、L1 邊約 13.3 公尺，
  // 但最近頂點屬 L1，可抓出只比較頂點而沒有投影到邊的錯誤。
  for (const [x, z, height] of [[0, 100, 12], [-120, -60, 0], [120, -40, 15], [40, -65, 15]]) {
    assert.equal(regionAt(x, z), null, `分區外（${x}，${z}）`);
    assert.equal(heightAt(x, z), height, `最近層高（${x}，${z}）`);
  }
});

test('共用邊與頂點仍有有限的平台高度', () => {
  for (const [x, z] of [[55.5, -6], [52, -10.9], [-84.1, -21.8], [53.75, -8.45]]) {
    assert.ok([0, 12, 15].includes(heightAt(x, z)), `交界（${x}，${z}）`);
  }
});

test('射線判斷通過已知正方形與凹多邊形的內外校準', () => {
  const square = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.equal(pointInPoly(5, 5, square), true);
  assert.equal(pointInPoly(15, 5, square), false);
  assert.equal(pointInPoly(-5, 5, square), false);
  const concave = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]];
  assert.equal(pointInPoly(2, 8, concave), true);
  assert.equal(pointInPoly(8, 8, concave), false);
});

test('分區查詢區別三層內部與分區外座標', () => {
  assert.equal(regionAt(-90.6, -31.4), 'L1');
  assert.equal(regionAt(-40, 0), 'L2');
  assert.equal(regionAt(73, -36), 'L3');
  assert.equal(regionAt(0, 100), null);
});
