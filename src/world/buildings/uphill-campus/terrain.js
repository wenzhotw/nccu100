// 依三層分區查詢地面高度，保持純函式，供後續階梯、坡道與場景共用。
import { REGIONS, FILL_REGIONS, LEVELS, STAIRS, RAMPS, R, LAYOUT, PLAZA, ZQ10 } from './layout.js';

/** 投影到最近的折線段，等距時保留較小的沿線距離。 */
export function projectToPath(x, z, path) {
  let nearest = { distance: Infinity, s: 0 };
  let walked = 0;
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1], [bx, bz] = path[i];
    const dx = bx - ax, dz = bz - az;
    const length = Math.hypot(dx, dz);
    const t = length === 0 ? 0
      : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (length * length)));
    const distance = (x - ax - t * dx) ** 2 + (z - az - t * dz) ** 2;
    if (distance < nearest.distance) nearest = { distance, s: walked + t * length };
    walked += length;
  }
  return nearest;
}

/** 沿折線累加實際水平長度，轉角不另加距離。 */
function pathLength(path) {
  return path.slice(1).reduce((sum, [x, z], i) =>
    sum + Math.hypot(x - path[i][0], z - path[i][1]), 0);
}

/** 沿路徑連續線性升高，兩端夾回核可高度。 */
export function rampHeight(ramp, s) {
  const length = pathLength(ramp.path);
  if (s <= 0) return ramp.from;
  if (s >= length) return ramp.to;
  return ramp.from + s / length * (ramp.to - ramp.from);
}

/** 每階踏面走完才升高，多餘路長平均分配給休息平台。 */
export function stairHeight(stair, s) {
  const parent = stair.joinStair ? STAIRS.find(candidate => candidate.id === stair.joinStair) : null;
  const start = stair.fromRamp ? RAMPS.find(candidate => candidate.id === stair.fromRamp) : null;
  const from = parent
    ? stairHeight(parent, projectToPath(...stair.path[0], parent.path).s)
    : start ? rampHeight(start, projectToPath(...stair.path[0], start.path).s) + CURB : stair.from;
  const ramp = stair.joinRamp ? RAMPS.find(candidate => candidate.id === stair.joinRamp) : null;
  const to = ramp ? rampHeight(ramp, projectToPath(...stair.path.at(-1), ramp.path).s) : stair.to;
  const length = pathLength(stair.path);
  const steps = Math.round((to - from) / 0.3);
  const landings = Math.floor((steps - 1) / 12);
  if (length + 1e-10 < steps * 0.8 + landings * 1.6) {
    throw new Error('階梯路徑太短，無法容納踏面與休息平台。');
  }
  const landingDepth = landings > 0 ? (length - steps * 0.8) / landings : 0;
  if (s <= 0) return from;
  if (s >= length) return to;
  let risen = 0;
  for (let step = 1; step <= steps; step++) {
    const end = step * 0.8 + Math.floor((step - 1) / 12) * landingDepth;
    if (s + 1e-10 < end) break;
    risen = step;
  }
  return from + risen * 0.3;
}

/** 以水平射線的交點奇偶判斷座標是否在多邊形內。 */
export function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** 分區外回傳 null，讓高度備援與後續通路判斷各自處理。 */
export function regionAt(x, z) {
  return REGIONS.find(region => pointInPoly(x, z, region.poly))?.level ?? null;
}

/** 投影夾在線段兩端之間，以距離平方比較，省去開根號。 */
function distanceToPolySquared(x, z, poly) {
  let nearest = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i];
    const dx = bx - ax, dz = bz - az;
    const lengthSquared = dx * dx + dz * dz;
    const t = lengthSquared === 0 ? 0
      : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSquared));
    const distance = (x - ax - t * dx) ** 2 + (z - az - t * dz) ** 2;
    nearest = Math.min(nearest, distance);
  }
  return nearest;
}

/**
 * 照片 9031、9032：九舍 ABC 區西翼北側是一片草坡土堆，從坡道邊往九舍緩升。
 * L2／L3 分界（ABC 西北角往坡道轉角）兩側各 3 公尺平滑過渡，供草坡與樓梯旁草坡取用；平台本身不變。
 */
const MOUND = { a: [-0.7, -17.2], b: [-13.5, -19], half: 3 };
export function moundLevel(x, z) {
  const [ax, az] = MOUND.a, [bx, bz] = MOUND.b, dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz);
  const along = ((x - ax) * dx + (z - az) * dz) / l;
  // 往北（z 變小）為正：北側是第三層土坡。
  const side = -((x - ax) * -dz + (z - az) * dx) / l * Math.sign(dx);
  // 兩端各多延伸 3 公尺，土堆在 ABC 西北角與坡道轉角處不會突然截斷。
  if (along < -MOUND.half || along > l + MOUND.half || Math.abs(side) >= MOUND.half) return LEVELS[platformLevel(x, z)];
  const t = (side + MOUND.half) / (2 * MOUND.half), w = t * t * (3 - 2 * t);
  return LEVELS.L2 + (LEVELS.L3 - LEVELS.L2) * w;
}

/** 人行道比路面高一個路緣石（照片 9033 的人行道高出路面一階）。 */
export const CURB = 0.12;

/** 照片中的東側步道與草坡，共用投影供碰撞、腳底與可見地表取用。 */
export function rampLandscape(x, z) {
  for (const ramp of RAMPS) {
    const p = projectToPath(x, z, ramp.path);
    let walked = 0;
    for (let i = 1; i < ramp.path.length; i++) {
      const a=ramp.path[i-1], b=ramp.path[i], dx=b[0]-a[0], dz=b[1]-a[1], length=Math.hypot(dx,dz);
      if (p.s <= walked + length + 1e-9) {
        const signed = ((x-a[0]) * -dz + (z-a[1]) * dx) / length;
        const along = ((x-a[0])*dx+(z-a[1])*dz)/length;
        if ((i === 1 && along < 0) || (i === ramp.path.length-1 && along > length)) break;
        const d = Math.sqrt(p.distance), edge = ramp.width / 2;
        if (signed > 0 && d > edge && d <= edge + 4.2) {
          const h = rampHeight(ramp,p.s);
          // 草坡外緣接回當地平台高度：九舍土坡是 15 公尺，坡道下段旁的低處是 12 公尺，不再一律拉到 15 而形成直壁。
          const walk = h + CURB;
          return { kind: d <= edge + 1.2 ? 'sidewalk' : 'grass-slope',
            h: d <= edge + 1.2 ? walk : walk + Math.min(1,(d-edge-1.2)/3) * (moundLevel(x,z)-walk) };
        }
        break;
      }
      walked += length;
    }
  }
  return null;
}

/**
 * 照片 9034：九舍樓梯兩側是順著樓梯的草坡。離樓梯中線 1.6 公尺內貼齊樓梯高度，
 * 往外到 5 公尺平滑接回原本地面（坡道草坡或平台），人行道不受影響。
 */
export const BANK = { inner: 1.6, outer: 5 };
export function stairBank(x, z) {
  const stair = STAIRS.find(s => s.id === 'jiu-plaza');
  if (!stair) return null;
  const p = projectToPath(x, z, stair.path), d = Math.sqrt(p.distance);
  if (d <= stair.width / 2 || d >= BANK.outer) return null;
  const length = pathLength(stair.path);
  // 樓梯兩端外的地面不受影響，只處理樓梯側邊。
  const [a, b] = stair.path, along = ((x - a[0]) * (b[0] - a[0]) + (z - a[1]) * (b[1] - a[1])) / length;
  if (along < 0 || along > length) return null;
  const ramp = rampLandscape(x, z);
  if (ramp?.kind === 'sidewalk') return null;
  // 建築輪廓內不是草坡（九舍 ABC 區西翼緊鄰樓梯東側）。
  if (LAYOUT.buildings.some(b => pointInPoly(x, z, b.pts))) return null;
  const ground = ramp?.h ?? moundLevel(x, z);
  let t = Math.max(0, Math.min(1, (d - BANK.inner) / (BANK.outer - BANK.inner)));
  // 樓梯靠路那一側：草坡要在人行道外緣 1.2 公尺內回到人行道高度，人行道邊不會突然冒出一階。
  if (ramp?.kind === 'grass-slope') {
    const edge = RAMPS[0].width / 2 + 1.2, dr = Math.sqrt(projectToPath(x, z, RAMPS[0].path).distance);
    t = Math.max(t, Math.max(0, Math.min(1, 1 - (dr - edge) / 1.2)));
  }
  const w = t * t * (3 - 2 * t);
  return { kind: 'bank', h: stairHeight(stair, p.s) * (1 - w) + ground * w };
}

/** 坡道東側與九舍樓梯兩側的地景高度（人行道、草坡、樓梯旁草坡），平台與通路以外才生效。 */
/**
 * 紅磚廣場範圍：PLAZA 長方形扣掉坡道最後一段人行道外緣（離中線 width/2+1.2 公尺）靠路的一側。
 * 用一條直線切，廣場與人行道沿同一條直線相接；鋪面多邊形由 plazaOutline() 取得。
 */
function plazaCut() {
  const P = RAMPS[0].path, a = P.at(-2), b = P.at(-1), dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
  return { a, n: [-dz / l, dx / l], offset: RAMPS[0].width / 2 + 1.2 };
}
export function inPlaza(x, z) {
  if (x < PLAZA.x0 || x > PLAZA.x1 || z < PLAZA.z0 || z > PLAZA.z1) return false;
  const { a, n, offset } = plazaCut();
  return (x - a[0]) * n[0] + (z - a[1]) * n[1] >= offset;
}
/** 廣場鋪面輪廓（以 Sutherland–Hodgman 把長方形裁到人行道外緣那條直線）。 */
export function plazaOutline() {
  const { a, n, offset } = plazaCut(), side = ([x, z]) => (x - a[0]) * n[0] + (z - a[1]) * n[1] - offset;
  const rect = [[PLAZA.x0, PLAZA.z0], [PLAZA.x1, PLAZA.z0], [PLAZA.x1, PLAZA.z1], [PLAZA.x0, PLAZA.z1]], out = [];
  rect.forEach((p, i) => {
    const q = rect[(i + 1) % rect.length], sp = side(p), sq = side(q);
    if (sp >= 0) out.push(p);
    if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  });
  return out;
}

export function landscapeAt(x, z) {
  // 紅磚廣場是平整鋪面，維持平台高度，不跟著草坡起伏。
  // 人行道與路面照常延伸到廣場邊，廣場從人行道外緣開始。
  if (inPlaza(x, z)) return { kind: 'plaza', h: LEVELS.L3 };
  return stairBank(x, z) ?? rampLandscape(x, z);
}

/** 高度依階梯、坡道、平台順序查詢。 */
export function heightAt(x, z) {
  let nearestStair = null;
  let nearestProjection = { distance: Infinity };
  for (const stair of STAIRS) {
    const projection = projectToPath(x, z, stair.path);
    // 跨階梯等距時保留配置順序，同座階梯由投影保留較小的 s。
    if (projection.distance <= (stair.width / 2) ** 2
      && projection.distance < nearestProjection.distance) {
      nearestStair = stair;
      nearestProjection = projection;
    }
  }
  if (nearestStair) {
    const h = stairHeight(nearestStair, nearestProjection.s);
    // 柏油路穿過主線最後一階的側緣，保留水平路口，不改主線階高與踏面。
    if (nearestStair.id === 'haohanpo' && h >= 11.7 && LAYOUT.roads.some(road =>
      road.osm === 510739837 && projectToPath(x, z, road.pts).distance <= 0.8 ** 2)) return 12;
    return h;
  }

  let nearestRamp = null;
  nearestProjection = { distance: Infinity };
  for (const ramp of RAMPS) {
    const projection = projectToPath(x, z, ramp.path);
    // 坡道重疊沿用階梯規則，等距保留配置順序與較小的 s。
    if (projection.distance <= (ramp.width / 2) ** 2
      && projection.distance < nearestProjection.distance) {
      nearestRamp = ramp;
      nearestProjection = projection;
    }
  }
  if (nearestRamp) {
    // T 字路口的橫向柏油路維持水平，坡面從路口北緣開始。
    if (nearestRamp.id === 'z-p' && z >= nearestRamp.path[0][1]) return nearestRamp.from;
    return rampHeight(nearestRamp, nearestProjection.s);
  }

  // 十舍磚地中庭與架空層地板是同一片抬高平台。
  if (pointInPoly(x, z, ZQ10.raised)) return ZQ10.deck;
  return landscapeAt(x, z)?.h ?? LEVELS[platformLevel(x, z)];
}

/** 原分區、補區優先，只有補區之外才沿用最近分區備援。 */
export function platformLevel(x, z) {
  const level = regionAt(x, z);
  if (level !== null) return level;
  const fill = FILL_REGIONS.find(region => pointInPoly(x, z, region.poly));
  if (fill) return fill.level;

  let nearestLevel = REGIONS[0].level;
  let nearestDistance = Infinity;
  for (const region of REGIONS) {
    const distance = distanceToPolySquared(x, z, region.poly);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestLevel = region.level;
    }
  }
  return nearestLevel;
}

/** 將來源線裁到地圖內，不在地圖外產生牆。 */
function clipToMap(a, b) {
  let start = 0, end = 1;
  for (const [axis, min, max] of [[0, R.x0, R.x1], [1, R.z0, R.z1]]) {
    const delta = b[axis] - a[axis];
    if (delta === 0) {
      if (a[axis] < min || a[axis] > max) return null;
    } else {
      const t0 = (min - a[axis]) / delta, t1 = (max - a[axis]) / delta;
      start = Math.max(start, Math.min(t0, t1));
      end = Math.min(end, Math.max(t0, t1));
    }
  }
  if (start >= end) return null;
  return [start, end].map(t => a.map((v, i) =>
    Math.max(i === 0 ? R.x0 : R.z0, Math.min(i === 0 ? R.x1 : R.z1, v + t * (b[i] - v)))));
}

/** 在來源線法線兩側量測，回傳牆的上下緣。 */
function wallHeights(a, b, t = 0.5) {
  const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
  const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
  const d = length < 0.2 ? 0.1 : 0.3;
  const heights = [heightAt(x - dz / length * d, z + dx / length * d),
    heightAt(x + dz / length * d, z - dx / length * d)];
  return { low: Math.min(...heights), high: Math.max(...heights) };
}

/**
 * 依來源線每半公尺取樣，合併同高的連續牆點。
 * source 區分分區邊與通路側邊，供驗收辨識通路開口。
 */
export function wallSegments() {
  const walls = [];
  const passages = [...STAIRS, ...RAMPS];
  function sampleLine(rawA, rawB, source, owner = null, side = null) {
    const clipped = clipToMap(rawA, rawB);
    if (!clipped) return;
    const [a, b] = clipped;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const count = Math.ceil(length / 0.5);
    const at = t => a.map((v, i) => v + (b[i] - v) * t);
    let run = null;
    for (let i = 0; i < count; i++) {
      const start = at(i / count), end = at((i + 1) / count);
      const middle = at((i + 0.5) / count);
      // 照片修正區由草坡與磁磚矮牆承接，不再沿舊分區或新樓梯長出高牆。
      const jiu = STAIRS.find(stair => stair.id === 'jiu-plaza');
      if ((jiu && projectToPath(...middle,jiu.path).distance <= 2.2 ** 2)
        || (source === 'region' && landscapeAt(...middle))) { run=null;continue; }
      // 保留整個取樣小段的開口，避免小段端點伸入通路。
      const blocked = passages.some(passage => passage !== owner
        && projectToPath(...middle, passage.path).distance <= (passage.width / 2 + length / count / 2) ** 2);
      const roadOpening = LAYOUT.roads.some(road => [510739837,1313447898,1313447899].includes(road.osm)
        && projectToPath(...middle, road.pts).distance <= (0.9 + length / count / 2) ** 2);
      if (blocked || roadOpening) { run = null; continue; }
      const heights = wallHeights(start, end);
      if (heights.high - heights.low <= 0.5) { run = null; continue; }
      const merged = run && wallHeights(run.a, end);
      if (run && Math.abs(run.low - heights.low) < 1e-8 && Math.abs(run.high - heights.high) < 1e-8
        && Math.abs(merged.low - run.low) < 1e-8 && Math.abs(merged.high - run.high) < 1e-8) {
        run.b = end;
        if (run.ramp) {
          const atB = wallHeights(start, end, 1);
          run.lowB = atB.low; run.highB = atB.high;
        }
      } else {
        const ramp = RAMPS.includes(owner) ? owner.id : null;
        const atA = wallHeights(start, end, 0), atB = wallHeights(start, end, 1);
        run = { a: start, b: end, ...heights, source,
          ...(ramp ? { ramp, side, lowA: atA.low, highA: atA.high, lowB: atB.low, highB: atB.high } : {}) };
        walls.push(run);
      }
    }
  }
  for (const region of [...REGIONS, ...FILL_REGIONS]) {
    region.poly.forEach((a, i) => sampleLine(a, region.poly[(i + 1) % region.poly.length], 'region'));
  }
  for (const passage of passages) for (const sign of [-1, 1]) {
    // 九舍樓梯與十舍兩座樓梯的擋牆各自建模，碰撞由各自模組提供。
    if(passage.id === 'jiu-plaza' || passage.id.startsWith('zq10')) continue;
    const normals = passage.path.slice(1).map((b, i) => {
      const a = passage.path[i], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
    });
    const side = passage.path.map((p, i) => {
      const a = normals[Math.max(0, i - 1)], b = normals[Math.min(i, normals.length - 1)];
      const divisor = 1 + a[0] * b[0] + a[1] * b[1];
      return [p[0] + sign * (a[0] + b[0]) / divisor * passage.width / 2,
        p[1] + sign * (a[1] + b[1]) / divisor * passage.width / 2];
    });
    for (let i = 1; i < passage.path.length; i++) {
      if (RAMPS.includes(passage)) sampleLine(side[i - 1], side[i], 'passage', passage, sign);
      else {
        // 階梯維持原有逐段偏移，避免改動好漢坡的既有開口。
        const offset = p => [p[0] + sign * normals[i - 1][0] * passage.width / 2,
          p[1] + sign * normals[i - 1][1] * passage.width / 2];
        sampleLine(offset(passage.path[i - 1]), offset(passage.path[i]), 'passage', passage);
      }
    }
  }
  // 共用接點取相鄰段的高低包絡，避免分區邊跨過取樣點時牆頂低於應擋住的高度。
  const profiles = walls.map(s => ({ ...s }));
  walls.forEach((s, i) => {
    if (!s.ramp) return;
    const join = (a, b) => a?.ramp === b.ramp && a.side === b.side
      && Math.hypot(a.b[0]-b.a[0],a.b[1]-b.a[1]) < 1e-6;
    const current=profiles[i], previous=join(profiles[i-1],current) ? profiles[i-1] : current;
    const next=profiles[i+1] && join(current,profiles[i+1]) ? profiles[i+1] : current;
    s.highA=Math.max(current.highA,current.high,previous.highB,previous.high);
    s.highB=Math.max(current.highB,current.high,next.highA,next.high);
    s.lowA=Math.min(current.lowA,current.low,previous.lowB,previous.low);
    s.lowB=Math.min(current.lowB,current.low,next.lowA,next.low);
  });
  return walls;
}
