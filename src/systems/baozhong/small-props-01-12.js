// 包種茶節桌上道具，依 baozhong.json 的原始 prop 規格建立。
// 原點在底面，正面朝 +z；完整道具由載入器等比縮放，不包含大型佈景。
const EDGE = { out: 0.01 };
const INK = '#2a2c4a';
const PAPER = '#f4f4ee';
const WOOD = '#a57a4f';

function label(ctx, text, x, y, z, w, h, bg = PAPER, fg = INK, rotation = {}) {
  const mesh = ctx.sign(text, { x, y, z, w, h, bg, fg, ry: rotation.ry ?? 0 });
  if (mesh?.rotation) {
    if (rotation.rx !== undefined && rotation.rz !== undefined) mesh.rotation.order = 'ZXY';
    if (rotation.rx !== undefined) mesh.rotation.x = rotation.rx;
    if (rotation.rz !== undefined) mesh.rotation.z = rotation.rz;
  }
  return mesh;
}

function barBetween(ctx, a, b, width, depth, color) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const mesh = ctx.box(width, Math.hypot(dx, dy, dz), depth, color,
    (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, EDGE);
  if (mesh?.quaternion && ctx.THREE) {
    mesh.quaternion.setFromUnitVectors(new ctx.THREE.Vector3(0, 1, 0),
      new ctx.THREE.Vector3(dx, dy, dz).normalize());
  }
  return mesh;
}

export const BUILDERS = {
  D01(ctx) {
    // 毛筆、筆架與攤開的長卷，桌板是原始規格的一部分。
    ctx.box(1.7, 0.10, 0.7, WOOD, 0, 0.05, 0, EDGE);
    ctx.box(0.24, 0.24, 0.25, '#8a6a42', -0.59, 0.22, -0.04, EDGE);
    const tilt = -0.22;
    ctx.cyl(0.028, 0.028, 0.66, '#c9ad84', -0.53, 0.66, -0.04, { ...EDGE, rz: tilt });
    ctx.cyl(0.038, 0.038, 0.055, '#c69b3c', -0.61, 0.31, -0.04, { ...EDGE, rz: tilt });
    ctx.cyl(0.04, 0, 0.15, INK, -0.63, 0.22, -0.04, { out: 0.006, rz: tilt });
    ctx.box(0.91, 0.025, 0.48, PAPER, 0.27, 0.115, 0.025, { out: 0.004 });
    for (const x of [-0.20, 0.74]) {
      ctx.cyl(0.048, 0.048, 0.57, WOOD, x, 0.16, 0.025, { ...EDGE, rx: Math.PI / 2 });
    }
    label(ctx, '走讀', 0.27, 0.131, 0.025, 0.63, 0.28, PAPER, INK, { rx: -Math.PI / 2 });
  },

  D02(ctx) {
    // 三層檔案抽屜、公文與櫃頂放大鏡。
    ctx.box(0.79, 0.94, 0.49, '#9aa3ab', -0.08, 0.47, 0, EDGE);
    for (const y of [0.18, 0.47, 0.76]) {
      ctx.box(0.70, 0.245, 0.045, '#c9ccd0', -0.08, y, 0.263, EDGE);
      ctx.box(0.20, 0.035, 0.05, '#5c7686', -0.08, y + 0.015, 0.308, { out: 0.004 });
    }
    for (let i = 0; i < 4; i += 1) {
      ctx.box(0.36, 0.023, 0.34, '#eadbb4', 0.10 + (i % 2) * 0.015, 0.956 + i * 0.026, 0.025, { out: 0.002 });
    }
    ctx.cyl(0.035, 0.035, 0.32, WOOD, -0.27, 1.085, -0.055, { ...EDGE, rz: -0.30 });
    ctx.torus(0.18, 0.035, INK, -0.20, 1.40, -0.055);
    // 純色玻璃提示鏡片，不使用透明度、反射或額外光源。
    ctx.cyl(0.145, 0.145, 0.015, '#bfe0ec', -0.20, 1.40, -0.06, { rx: Math.PI / 2, seg: 16 });
  },

  D03(ctx) {
    // 石台上的扁圓座與紫色問號，台前保留兩本新哲人書冊。
    ctx.box(0.95, 0.25, 0.60, '#bdb3a3', 0, 0.125, -0.02, EDGE);
    ctx.cyl(0.25, 0.25, 0.075, '#d8cdb9', 0, 0.288, -0.04, { ...EDGE, seg: 16 });
    const arc = ctx.torus(0.235, 0.058, '#74468c', -0.055, 0.97, -0.16, { arc: Math.PI });
    if (arc?.rotation) arc.rotation.z = -Math.PI / 4;
    ctx.cyl(0.052, 0.052, 0.20, '#74468c', 0.111, 0.705, -0.16, EDGE);
    ctx.sphere(0.065, '#74468c', 0.111, 0.51, -0.16, { out: 0.006 });
    for (const [x, y, color] of [[-0.20, 0.055, '#1f3c8f'], [0.20, 0.055, '#8d4f77']]) {
      ctx.box(0.36, 0.11, 0.26, color, x, y, 0.37, EDGE);
      ctx.box(0.32, 0.062, 0.23, PAPER, x, y, 0.375, { out: 0.002 });
      label(ctx, '新哲人', x, y, 0.508, 0.33, 0.085, color, PAPER);
    }
  },

  D04(ctx) {
    // 投票箱頂的投票口與三根不同高度的開票長條。
    ctx.box(0.58, 0.54, 0.50, PAPER, -0.44, 0.27, 0.055, EDGE);
    ctx.box(0.33, 0.013, 0.055, INK, -0.44, 0.547, 0.055);
    label(ctx, '投票箱', -0.44, 0.29, 0.311, 0.42, 0.15);
    ctx.box(0.69, 0.97, 0.07, '#d6e9ed', 0.32, 0.485, -0.14, EDGE);
    ctx.box(0.78, 0.07, 0.31, '#9aa3ab', 0.32, 0.035, -0.14, EDGE);
    for (const [x, height, color] of [[0.10, 0.34, '#60a5fa'], [0.32, 0.55, '#e8c547'], [0.54, 0.43, '#e8463c']]) {
      ctx.box(0.13, height, 0.045, color, x, 0.13 + height / 2, -0.077, { out: 0.005 });
    }
    label(ctx, '開票中', 0.32, 0.84, -0.098, 0.60, 0.17, '#1f3c8f', PAPER);
  },

  D05(ctx) {
    // 圓餅圖採原規格允許的三片分色薄圓柱，搭配問卷及筆。
    ctx.box(0.91, 1.05, 0.07, '#d6e9ed', 0, 0.525, -0.16, EDGE);
    ctx.box(0.99, 0.07, 0.42, WOOD, 0, 0.035, -0.04, EDGE);
    for (const [x, y, color] of [[-0.15, 0.77, '#e8c547'], [0.15, 0.77, '#60a5fa'], [0, 0.54, '#e8463c']]) {
      ctx.cyl(0.18, 0.18, 0.025, color, x, y, -0.105, { rx: Math.PI / 2, seg: 16, out: 0.005 });
    }
    for (let i = 0; i < 4; i += 1) {
      ctx.box(0.50, 0.022, 0.30, PAPER, -0.12 + (i % 2) * 0.015, 0.083 + i * 0.025, 0.11, { out: 0.002 });
    }
    label(ctx, '問卷', -0.12, 0.171, 0.11, 0.36, 0.20, PAPER, INK, { rx: -Math.PI / 2 });
    ctx.cyl(0.022, 0.022, 0.40, '#1f3c8f', 0.32, 0.28, 0.12, { out: 0.003, rz: -0.18 });
    ctx.cyl(0.025, 0, 0.07, '#c9ad84', 0.279, 0.05, 0.12, { rz: -0.18 });
  },

  D06(ctx) {
    // 古錢幣直徑 1.2、厚 0.15；中央深色方塊代表方孔。
    ctx.box(0.90, 0.15, 0.42, '#8a6a42', -0.33, 0.075, 0, EDGE);
    ctx.cyl(0.60, 0.60, 0.15, '#e8c547', -0.33, 0.75, 0, { ...EDGE, rx: Math.PI / 2, seg: 16 });
    ctx.box(0.25, 0.25, 0.018, INK, -0.33, 0.75, 0.085, { out: 0.004 });
    ctx.box(0.85, 0.43, 0.07, '#2d4f9e', 0.78, 0.66, -0.03, EDGE);
    ctx.box(0.07, 0.47, 0.07, '#9aa3ab', 0.78, 0.235, -0.03, EDGE);
    ctx.box(0.45, 0.055, 0.30, '#9aa3ab', 0.78, 0.0275, -0.03, EDGE);
    label(ctx, 'Public Finance', 0.78, 0.66, 0.012, 0.78, 0.25, '#2d4f9e', PAPER);
    for (const [x, text, color] of [[0.42, '所得', '#60a5fa'], [0.77, '消費', '#e8c547'], [1.12, '財產', '#e8463c']]) {
      ctx.box(0.28, 0.25, 0.26, color, x, 0.125, 0.25, EDGE);
      label(ctx, text, x, 0.14, 0.386, 0.25, 0.12, color, INK);
    }
  },

  D07(ctx) {
    // 原規格包含陳情櫃台、號碼牌機、藍色服務牌與三層公文架。
    ctx.box(1.45, 0.42, 0.56, '#ece6d8', 0, 0.21, 0, EDGE);
    ctx.box(1.52, 0.06, 0.61, '#c9ad84', 0, 0.45, 0, EDGE);
    ctx.box(0.72, 0.43, 0.07, '#2d4f9e', -0.12, 0.91, -0.22, EDGE);
    for (const x of [-0.40, 0.16]) ctx.box(0.045, 0.31, 0.045, '#9aa3ab', x, 0.625, -0.22, { out: 0.004 });
    label(ctx, '民眾服務窗口', -0.12, 0.91, -0.178, 0.67, 0.29, '#2d4f9e', PAPER);
    ctx.box(0.27, 0.30, 0.24, '#e8463c', -0.44, 0.63, 0.13, EDGE);
    label(ctx, '001', -0.44, 0.66, 0.257, 0.22, 0.13, PAPER, '#b63236');
    ctx.box(0.13, 0.025, 0.02, INK, -0.44, 0.54, 0.26);
    for (const y of [0.51, 0.66, 0.81]) ctx.box(0.30, 0.035, 0.28, '#9aa3ab', 0.53, y, 0, { out: 0.004 });
    ctx.box(0.30, 0.34, 0.035, '#9aa3ab', 0.53, 0.65, -0.14, { out: 0.004 });
    for (const x of [0.39, 0.67]) ctx.box(0.025, 0.34, 0.28, '#9aa3ab', x, 0.65, 0, { out: 0.003 });
    for (const y of [0.545, 0.695]) ctx.box(0.24, 0.025, 0.23, PAPER, 0.53, y, 0.015);
  },

  D08(ctx) {
    // 地籍圖的格線、銀灰三腳架、黃色全測站與紅白標尺。
    ctx.box(1.20, 0.04, 0.67, '#86c35a', 0, 0.02, 0, EDGE);
    for (const x of [-0.40, -0.20, 0, 0.20, 0.40]) ctx.box(0.012, 0.005, 0.62, '#dce6b9', x, 0.043, 0);
    for (const z of [-0.20, 0, 0.20]) ctx.box(1.13, 0.005, 0.012, '#dce6b9', 0, 0.044, z);
    const top = [-0.19, 0.83, -0.025];
    for (const foot of [[-0.49, 0.07, 0.24], [0.13, 0.07, 0.24], [-0.19, 0.07, -0.25]]) {
      barBetween(ctx, foot, top, 0.055, 0.055, '#c9ccd0');
    }
    ctx.cyl(0.13, 0.13, 0.055, '#5c7686', -0.19, 0.85, -0.025, EDGE);
    ctx.box(0.30, 0.25, 0.23, '#e8c547', -0.19, 1.00, -0.025, EDGE);
    ctx.cyl(0.08, 0.08, 0.15, '#5c7686', -0.19, 1.01, 0.15, { ...EDGE, rx: Math.PI / 2, seg: 12 });
    ctx.cyl(0.052, 0.052, 0.015, '#9fb3bd', -0.19, 1.01, 0.232, { rx: Math.PI / 2, seg: 12 });
    for (let i = 0; i < 8; i += 1) ctx.box(0.065, 0.14, 0.065, i % 2 ? PAPER : '#d8433f', 0.46, 0.115 + 0.14 * i, -0.04, { out: 0.003 });
  },

  D09(ctx) {
    // 紅色供給向右上、藍色需求向右下，黃色球標明交點。
    ctx.box(0.98, 0.91, 0.07, PAPER, -0.10, 0.455, -0.12, EDGE);
    ctx.box(1.08, 0.06, 0.32, '#9aa3ab', -0.10, 0.03, -0.12, EDGE);
    ctx.box(0.035, 0.72, 0.025, INK, -0.49, 0.42, -0.071);
    ctx.box(0.78, 0.035, 0.025, INK, -0.10, 0.075, -0.071);
    ctx.box(0.78, 0.045, 0.04, '#1f3c8f', -0.09, 0.43, -0.045, { out: 0.003, rz: -0.64 });
    ctx.box(0.78, 0.045, 0.04, '#e8463c', -0.09, 0.43, -0.018, { out: 0.003, rz: 0.64 });
    ctx.sphere(0.055, '#e8c547', -0.09, 0.43, 0.035, { out: 0.004 });
    label(ctx, '均衡點', -0.10, 0.79, -0.077, 0.48, 0.13);
    ctx.cyl(0.10, 0.075, 0.18, '#c9ad84', 0.57, 0.09, 0.08, EDGE);
    ctx.cyl(0.082, 0.082, 0.008, '#8a6a42', 0.57, 0.183, 0.08);
    ctx.torus(0.052, 0.017, '#c9ad84', 0.685, 0.10, 0.08);
  },

  D10(ctx) {
    // 不引用任何族群圖騰，只用普通色帶表現交錯織紋。
    ctx.box(0.43, 0.045, 0.40, '#eadbb4', -0.60, 0.079, 0.04, { out: 0.004, rz: -0.25 });
    ctx.box(0.43, 0.045, 0.40, '#eadbb4', -0.18, 0.079, 0.04, { out: 0.004, rz: 0.25 });
    ctx.box(0.032, 0.06, 0.42, WOOD, -0.39, 0.03, 0.04, { out: 0.003 });
    label(ctx, '田野', -0.60, 0.106, 0.04, 0.30, 0.20, '#eadbb4', INK, { rx: -Math.PI / 2, rz: -0.25 });
    label(ctx, '觀察筆記', -0.18, 0.106, 0.04, 0.34, 0.20, '#eadbb4', INK, { rx: -Math.PI / 2, rz: 0.25 });
    for (const x of [0.16, 0.79]) ctx.box(0.065, 0.97, 0.075, WOOD, x, 0.485, -0.10, EDGE);
    for (const y of [0.15, 0.52, 0.91]) ctx.box(0.70, 0.055, 0.075, WOOD, 0.475, y, -0.10, { out: 0.005 });
    for (let i = 0; i < 5; i += 1) {
      ctx.box(0.055, 0.67, 0.025, ['#e8c547', '#d6e9ed', '#e8463c'][i % 3], 0.255 + i * 0.11, 0.53, -0.061, { out: 0.002 });
    }
    for (let i = 0; i < 5; i += 1) {
      ctx.box(0.53, 0.045, 0.025, i % 2 ? '#60a5fa' : '#e8c547', 0.475, 0.25 + i * 0.13, -0.035, { out: 0.002 });
    }
  },

  D11(ctx) {
    // 雙島交換台保留原尺寸與 1.0 的箱心間距，整組交給外層等比縮放。
    ctx.box(2.0, 0.12, 0.8, '#334155', 0, 0.06, 0, EDGE);
    ctx.box(0.55, 0.55, 0.55, '#2D8A68', -0.50, 0.395, 0, EDGE);
    ctx.box(0.55, 0.55, 0.55, '#E7B65B', 0.50, 0.395, 0, EDGE);
    label(ctx, '甲／茶', -0.50, 0.395, 0.283, 0.48, 0.22, '#2D8A68', PAPER);
    label(ctx, '乙／杯', 0.50, 0.395, 0.283, 0.48, 0.22, '#E7B65B', INK);
  },

  D12(ctx) {
    // 三階高度照設計，並非依 100、110、121 的數值比例繪製。
    ctx.box(1.8, 0.10, 0.7, '#243B53', 0, 0.05, 0, EDGE);
    for (const [x, height, color, text] of [
      [-0.57, 0.45, '#60A5FA', '100'],
      [0, 0.65, '#38BDF8', '110'],
      [0.57, 0.85, '#F0C75E', '121'],
    ]) {
      ctx.box(0.45, height, 0.45, color, x, 0.10 + height / 2, 0, EDGE);
      label(ctx, text, x, 0.10 + height / 2, 0.233, 0.38, 0.20, color, INK);
    }
  },
};
