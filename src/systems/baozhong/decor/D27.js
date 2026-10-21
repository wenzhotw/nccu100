// D27 韓國語文學系：韓屋青瓦學堂；三太極鼓（북），不是長鼓或國旗。
export default function build(ctx) {
  // 青瓦小屋簷由兩支落地木柱與橫樑支撐，兩端略上翹。
  ctx.box(0.065, 1.35, 0.065, '#795547', -0.99, 0.685, -0.30, { out: 0.01 });
  ctx.box(0.065, 1.35, 0.065, '#795547', -0.37, 0.685, -0.30, { out: 0.01 });
  ctx.box(0.85, 0.08, 0.15, '#996c48', -0.68, 1.35, -0.30, { out: 0.01 });
  ctx.box(0.70, 0.08, 0.25, '#00695c', -0.68, 1.43, -0.30, { out: 0.01 });
  ctx.box(0.23, 0.07, 0.25, '#147f77', -1.02, 1.46, -0.30, { rz: -0.15, out: 0.01 });
  ctx.box(0.23, 0.07, 0.25, '#147f77', -0.34, 1.46, -0.30, { rz: 0.15, out: 0.01 });

  // 橫放大鼓，桌上木座承托；雙端鼓面與三色旋紋。
  ctx.box(0.31, 0.07, 0.30, '#785239', 0.64, 0.795, 1.0, { out: 0.01 });
  ctx.cyl(0.18, 0.18, 0.25, '#c62828', 0.64, 1.01, 1.0, { rz: Math.PI / 2 });
  ctx.cyl(0.19, 0.19, 0.018, '#f4dfb8', 0.511, 1.01, 1.0, { rz: Math.PI / 2 });
  ctx.cyl(0.19, 0.19, 0.018, '#f4dfb8', 0.769, 1.01, 1.0, { rz: Math.PI / 2 });
  const colors = ['#c62828', '#1967a7', '#eac342'];
  for (let i = 0; i < 3; i++) {
    const r = 0.16;
    const shape = new ctx.THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0, -r * 0.65, r, 0);
    shape.absarc(0, 0, r, 0, Math.PI * 2 / 3, false);
    shape.quadraticCurveTo(-r * 0.20, r * 0.50, 0, 0);
    const motif = new ctx.THREE.Mesh(new ctx.THREE.ExtrudeGeometry(shape, { depth: 0.003, bevelEnabled: false, steps: 1, curveSegments: 8 }), ctx.mat(colors[i]));
    motif.rotation.set(0, Math.PI / 2, i * Math.PI * 2 / 3);
    motif.position.set(0.777, 1.01, 1.0);
    ctx.group.add(motif);
  }

  // 古籍卷軸平放桌面，滾軸與紙面相接；第二文字牌只標書名。
  ctx.box(0.43, 0.03, 0.25, '#fff5cf', 0.02, 0.765, 1.0);
  ctx.cyl(0.035, 0.035, 0.29, '#b68b54', -0.195, 0.785, 1.0, { rx: Math.PI / 2 });
  ctx.cyl(0.035, 0.035, 0.29, '#b68b54', 0.235, 0.785, 1.0, { rx: Math.PI / 2 });
  const title = ctx.sign('훈민정음', { w: 0.30, h: 0.10, bg: '#fff5cf', fg: '#524631', x: 0.02, y: 0.78, z: 1.0 });
  title.rotation.x = -Math.PI / 2;
  // 薄書名牌貼齊紙面；只複製這張牌的材質，避免改到共享材質或深度閃爍。
  title.material = title.material.clone();
  title.material.polygonOffset = true;
  title.material.polygonOffsetFactor = -1;
  title.material.polygonOffsetUnits = -1;
  ctx.sign('한국어문학', { w: 0.9, h: 0.3, bg: '#b71c1c', fg: '#ffffff', x: 0, y: 3.25, z: 0 });
  return { hideCanopy: false, hideCounter: false };
}
