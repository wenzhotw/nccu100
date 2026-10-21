// D25 至 D37 的桌上小道具，依 baozhong.json 的 prop 規格建模。
// 原點位於底面，正面朝 +z；整組縮放與桌面定位由載入端統一處理。
const OUT = { out: 0.01 };
const INK = '#2a2c4a';
const WHITE = '#f4f4ee';

function label(ctx, text, w, h, x, y, z, bg, fg = INK, ry = 0) {
  return ctx.sign(text, { w, h, x, y, z, bg, fg, ry });
}

function arrow(ctx, text, width, height, color, fg, y, direction = 1, x = 0, ry = 0) {
  // 方形旋轉成箭頭，與牌身重疊的半邊藏在牌身後。
  const tip = height / Math.SQRT2;
  const at = (dx, z) => [x + dx * Math.cos(ry) + z * Math.sin(ry), y,
    -dx * Math.sin(ry) + z * Math.cos(ry)];
  ctx.box(tip, tip, 0.04, color, ...at(direction * (width / 2 - height / 2), -0.008),
    { ...OUT, ry, rz: Math.PI / 4 });
  ctx.box(width - height / 2, height, 0.05, color, ...at(-direction * height / 4, 0),
    { ...OUT, ry });
  label(ctx, text, width - height * 0.75, height * 0.8,
    ...at(-direction * height / 4, 0.028), color, fg, ry);
}

export const BUILDERS = {
  D25(ctx) {
    // 三段俄羅斯娃娃，臉與腰帶仍保留在前方可辨識的位置。
    const x = -0.64;
    ctx.cyl(0.4, 0.4, 0.7, '#c8102e', x, 0.35, 0, OUT);
    ctx.cyl(0.3, 0.3, 0.4, '#c8102e', x, 0.9, 0, OUT);
    ctx.cyl(0.225, 0.225, 0.4, '#c8102e', x, 1.3, 0, OUT);
    ctx.cyl(0.15, 0.15, 0.02, '#f5d0b5', x, 1.3, 0.226,
      { ...OUT, rx: Math.PI / 2, seg: 12 });
    ctx.cyl(0.407, 0.407, 0.055, '#e0b000', x, 0.65, 0, OUT);
    for (const dx of [-0.052, 0.052]) {
      ctx.cyl(0.012, 0.012, 0.008, INK, x + dx, 1.32, 0.241,
        { rx: Math.PI / 2 });
    }
    ctx.box(0.035, 0.018, 0.008, '#c8102e', x, 1.245, 0.241);
    ctx.box(0.06, 0.85, 0.06, '#a57a4f', 0.52, 0.425, 0, OUT);
    ctx.box(0.38, 0.07, 0.2, '#a57a4f', 0.52, 0.035, 0, OUT);
    ctx.box(1.2, 0.4, 0.05, WHITE, 0.52, 1.02, 0, OUT);
    label(ctx, 'СЛАВЯНСКИЙ', 1.16, 0.36, 0.52, 1.02, 0.028, WHITE, '#0033a0');
  },

  D26(ctx) {
    // 鳥居由外層保留，這裡只做五十音積木與小暖簾。
    for (const [i, kana] of ['あ', 'い', 'う'].entries()) {
      const y = 0.25 + i * 0.5;
      ctx.box(0.5, 0.5, 0.5, WHITE, -0.73, y, 0, OUT);
      label(ctx, kana, 0.43, 0.43, -0.73, y, 0.253, WHITE, '#d7000f');
    }
    for (const x of [-0.16, 1.06]) {
      ctx.cyl(0.025, 0.025, 1.35, '#a57a4f', x, 0.675, -0.08, OUT);
      ctx.box(0.2, 0.06, 0.24, '#a57a4f', x, 0.03, -0.08, OUT);
    }
    ctx.box(1.48, 0.055, 0.055, '#a57a4f', 0.45, 1.35, -0.08, OUT);
    // 三片布保留暖簾的垂直開口，合計寬 1.4、高 0.6。
    for (let i = 0; i < 3; i++) {
      const x = 0.45 + (i - 1) * 0.47;
      ctx.box(0.46, 0.6, 0.035, '#1b2a4a', x, 1.045, -0.05, OUT);
    }
    label(ctx, '日本語', 1.34, 0.4, 0.45, 1.13, -0.029, '#1b2a4a', WHITE);
  },

  D27(ctx) {
    ctx.cyl(0.05, 0.05, 1, '#cd2e3a', 0, 0.5, 0, OUT);
    ctx.box(1.2, 1.2, 0.2, WHITE, 0, 1.6, 0, OUT);
    // 三個扁盒各承載一個字母，組成上方 ㅎ、ㅏ 與下方 ㄴ。
    for (const [text, w, h, x, y] of [
      ['ㅎ', 0.51, 0.64, -0.26, 1.79],
      ['ㅏ', 0.36, 0.64, 0.28, 1.79],
      ['ㄴ', 0.82, 0.38, 0, 1.26],
    ]) {
      ctx.box(w, h, 0.05, WHITE, x, y, 0.12, OUT);
      label(ctx, text, w, h, x, y, 0.148, WHITE, '#003478');
    }
  },

  D28(ctx) {
    ctx.cyl(0.2, 0.2, 0.35, '#e30a17', -0.18, 0.175, 0, OUT);
    ctx.cyl(0.15, 0.15, 0.3, '#e30a17', -0.18, 0.5, 0, OUT);
    ctx.cyl(0.165, 0.165, 0.045, '#c9a227', -0.18, 0.6725, 0, OUT);
    ctx.cyl(0.04, 0.04, 0.055, '#c9a227', -0.18, 0.7225, 0, OUT);
    // 兩個壺嘴與側把手讓上下壺的輪廓一眼可辨。
    for (const [y, r, reach] of [[0.2, 0.055, 0.24], [0.5, 0.04, 0.18]]) {
      ctx.cyl(r * 0.7, r, reach, '#e30a17', 0.045, y + 0.07, 0,
        { ...OUT, rz: -Math.PI / 4 });
      ctx.torus(0.1, 0.027, '#c9a227', -0.39, y, 0);
    }
    for (const [x, z] of [[0.27, 0.02], [0.4, 0.02], [0.335, 0.19]]) {
      ctx.cyl(0.04, 0.04, 0.12, '#a0391e', x, 0.06, z, OUT);
    }
  },

  D29(ctx) {
    ctx.cyl(0.06, 0.06, 2.2, '#3f3a36', 0, 1.1, -0.05, OUT);
    arrow(ctx, 'Bonjour', 0.9, 0.25, '#0055a4', WHITE, 1.95, 1, 0.1);
    // 以深藍黑代替純黑，保留德語牌的金色字。
    arrow(ctx, 'Guten Tag', 0.9, 0.25, INK, '#ffce00', 1.5, -1, -0.1);
    arrow(ctx, 'Hola', 0.9, 0.25, '#aa151b', '#f1bf00', 1.05, 1, 0.1, -Math.PI / 5);
  },

  D30(ctx) {
    ctx.cyl(0.05, 0.05, 2, '#c8a165', 0, 1, -0.08, OUT);
    ctx.cyl(0.035, 0.035, 1.2, '#c8a165', 0, 1.97, -0.08,
      { ...OUT, rz: Math.PI / 2 });
    for (const [i, text, color, fg] of [
      [0, 'Xin chào', '#da251d', WHITE],
      [1, 'สวัสดี', '#2d2a4a', WHITE],
      [2, 'Halo', WHITE, INK],
    ]) {
      const x = (i - 1) * 0.41;
      ctx.cyl(0.012, 0.012, 0.2, '#c8a165', x, 1.86, -0.08, OUT);
      ctx.cyl(0.175, 0.175, 0.45, color, x, 1.535, -0.08,
        { ...OUT, seg: 12 });
      ctx.cyl(0.18, 0.18, 0.05, i === 2 ? '#ce1126' : color, x, 1.785, -0.08, OUT);
      label(ctx, text, 0.3, 0.15, x, 1.535, 0.099, color, fg);
    }
  },

  D31(ctx) {
    ctx.box(0.85, 0.1, 0.35, '#9B6B43', 0, 0.05, 0, OUT);
    ctx.box(1.25, 0.85, 0.07, '#F2E9D8', 0, 0.525, 0, OUT);
    ctx.box(0.03, 0.72, 0.03, '#4B5563', 0, 0.525, 0.05, OUT);
    label(ctx, '已見事實', 0.53, 0.17, -0.315, 0.81, 0.038, '#F2E9D8', '#345995');
    label(ctx, '待證推論', 0.53, 0.17, 0.315, 0.81, 0.038, '#F2E9D8', '#9B6B43');
    for (const x of [-0.31, 0.31]) {
      ctx.box(0.36, 0.24, 0.025, '#ffffff', x, 0.46, 0.05, OUT);
    }
  },

  D32(ctx) {
    for (const x of [-0.65, 0.65]) {
      ctx.cyl(0.03, 0.03, 1.2, '#8b5a2b', x, 0.6, -0.04, OUT);
    }
    ctx.box(1.6, 1, 0.055, '#2f4f3a', 0, 0.95, 0, OUT);
    label(ctx, 'P(A)=?', 1.42, 0.7, 0, 0.95, 0.031, '#2f4f3a', WHITE);
    ctx.box(0.5, 0.5, 0.5, WHITE, 1.1, 0.25, 0, OUT);
    ctx.cyl(0.07, 0.07, 0.012, '#c8102e', 1.1, 0.25, 0.257,
      { rx: Math.PI / 2, seg: 12 });
  },

  D33(ctx) {
    ctx.box(1.2, 0.75, 0.6, '#d9d9d9', 0, 0.375, 0, OUT);
    ctx.box(0.065, 0.15, 0.065, INK, -0.23, 0.825, -0.14, OUT);
    ctx.box(0.6, 0.4, 0.05, INK, -0.23, 1.1, -0.14, OUT);
    label(ctx, '＋', 0.54, 0.34, -0.23, 1.1, -0.111, '#cfe6ef', '#345995');
    for (const x of [0.13, 0.43]) {
      ctx.cyl(0.025, 0.025, 0.35, '#a0a0a0', x, 0.925, 0.19, OUT);
    }
    ctx.box(0.36, 0.045, 0.09, '#a0a0a0', 0.28, 1.1, 0.19, OUT);
    ctx.box(0.45, 0.45, 0.45, '#3a6ea5', 0.4, 0.225, 0.57, OUT);
    label(ctx, '眼動實驗', 1, 0.4, 0, 0.5, 0.304, '#d9d9d9', '#345995');
  },

  D34(ctx) {
    ctx.cyl(0.08, 0.08, 0.65, '#5C6770', 0, 0.325, 0, OUT);
    ctx.cyl(0.55, 0.55, 0.08, '#355C7D', 0, 0.69, 0,
      { ...OUT, seg: 16 });
    for (const [x, text, color] of [[-0.28, '甲', '#F2CC8F'], [0.28, '乙', '#81B29A']]) {
      ctx.box(0.24, 0.16, 0.04, color, x, 0.81, -0.1, OUT);
      label(ctx, text, 0.21, 0.13, x, 0.81, -0.077, color);
    }
    for (const [j, text, color] of [[0, 'W', '#63B3ED'], [1, 'F', '#E9B44C']]) {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.16, z = 0.12 + j * 0.17;
        ctx.box(0.1, 0.1, 0.1, color, x, 0.78, z, OUT);
        label(ctx, text, 0.085, 0.085, x, 0.78, z + 0.053, color);
      }
    }
  },

  D35(ctx) {
    // 拼圖板只有一塊底板與三張教學卡，保持四個方塊且不用文字。
    ctx.box(1.2, 0.8, 0.08, '#ece6d8', 0, 0.4, 0, OUT);
    for (const [x, color] of [[-0.37, '#5a7fb0'], [0, '#f0c94a'], [0.37, '#6bc35b']]) {
      ctx.box(0.29, 0.5, 0.04, color, x, 0.4, 0.06, OUT);
    }
  },

  D36(ctx) {
    ctx.cyl(0.3, 0.3, 0.1, '#1f3a5f', 0, 0.05, 0, OUT);
    ctx.cyl(0.05, 0.05, 2.2, '#1f3a5f', 0, 1.2, -0.04, OUT);
    arrow(ctx, 'GG', 0.8, 0.25, '#2b6cb0', WHITE, 2.05, 1, 0.08);
    arrow(ctx, 'SS', 0.8, 0.25, '#2f855a', WHITE, 1.6, -1, -0.08);
    arrow(ctx, 'DA', 0.8, 0.25, '#d69e2e', INK, 1.15, 1, 0.08);
  },

  D37(ctx) {
    ctx.box(0.6, 1.8, 0.8, '#1e2a38', 0, 0.9, 0, OUT);
    for (const y of [0.55, 0.92, 1.29]) {
      ctx.box(0.4, 0.03, 0.02, '#22c55e', 0, y, 0.413, OUT);
    }
    ctx.cyl(0.055, 0.055, 0.02, '#ef4444', 0.19, 1.58, 0.415,
      { ...OUT, rx: Math.PI / 2, seg: 12 });
    label(ctx, '1011', 0.9, 0.35, 0, 1.975, 0.404, INK, '#22c55e');
  },
};
