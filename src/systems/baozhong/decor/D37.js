// D37 資訊科學：主機房演算法基地。七節點二元樹，正好 20 個主要零件。
export default function build(ctx) {
  // 機櫃描邊落地，LED 只變 visible，不改共用材質。
  ctx.box(0.4, 1.4, 0.4, '#121212', -0.8, 0.72, -0.35, { out: 0.02 });
  const led = ctx.box(0.18, 0.035, 0.025, '#00e676', -0.8, 1.28, -0.1275);
  // 支柱落地，平台頂 0.87 支撐底層球體（球心 0.95，半徑 0.08）。
  ctx.box(0.09, 0.82, 0.12, '#546e7a', 0.65, 0.41, -0.4);
  ctx.box(0.98, 0.05, 0.18, '#78909c', 0.65, 0.845, -0.4);
  const points = [
    [0.65, 1.55],
    [0.40, 1.25], [0.90, 1.25],
    [0.25, 0.95], [0.50, 0.95], [0.80, 0.95], [1.05, 0.95]
  ];
  for (const point of points) {
    ctx.sphere(0.08, '#00e676', point[0], point[1], -0.4);
  }
  for (let child = 1; child < points.length; child++) {
    const parent = points[Math.floor((child - 1) / 2)];
    const point = points[child];
    const dx = point[0] - parent[0];
    const dy = point[1] - parent[1];
    const line = ctx.cyl(0.012, 0.012, Math.sqrt(dx * dx + dy * dy), '#eceff1', (point[0] + parent[0]) / 2, (point[1] + parent[1]) / 2, -0.4, { seg: 6 });
    line.rotation.z = -Math.atan2(dx, dy);
  }
  // 兩座直立桌上終端螢幕底皆為 0.75，避免另外加腳超過零件上限。
  ctx.box(0.35, 0.22, 0.07, '#263238', 0.04, 0.86, 1.0);
  ctx.box(0.35, 0.22, 0.07, '#37474f', 0.46, 0.86, 1.0);
  ctx.sign('Binary & Cloud', { w: 0.9, h: 0.3, bg: '#004d40', fg: '#00e676', x: 0, y: 3.25, z: 0 });
  let elapsed = 0;
  return {
    update(dt) {
      elapsed += dt;
      led.visible = (elapsed % 1.2) < 0.6;
    }
  };
}
