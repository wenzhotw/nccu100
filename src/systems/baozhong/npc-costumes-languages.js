/**
 * 外語學院服裝：以服裝輪廓辨識文化，不混搭其他地區的配件。
 * 所有零件只加到服裝掛點，共用幾何、賽璐珞材質與描邊由 ctx 提供。
 */
const CREAM = '#ece6d8';
const GOLD = '#e6c67c';
const HAIR = '#30293e';
const HALF_PI = Math.PI / 2;

function sleeves(ctx, color, radius = 0.073, length = 0.21) {
  for (const [side, parent] of [['left', ctx.left], ['right', ctx.right]]) {
    ctx.cylinder(parent, `${side}-sleeve`, color, [0, -0.10, 0], radius, radius * 0.91, length);
  }
}

function bun(ctx, name, position, scale) {
  ctx.sphere(ctx.head, name, HAIR, position, scale);
}

function buildEnglish(ctx) {
  const { rig, left, right, box, cylinder, sphere, torus } = ctx;
  const red = '#a94d6a';
  // 伊莉莎白時代舞台服：合身緊身上衣、輪狀皺領、蓬短褲與長襪。
  cylinder(rig, 'doublet-waist', red, [0, 0.46, 0], 0.185, 0.195, 0.12);
  box(rig, 'doublet-front', red, [0, 0.56, 0.143], [0.29, 0.23, 0.046]);
  box(rig, 'doublet-placket', GOLD, [0, 0.56, 0.173], [0.024, 0.22, 0.014]);
  cylinder(rig, 'doublet-belt', GOLD, [0, 0.445, 0], 0.198, 0.198, 0.035);
  torus(rig, 'ruff', CREAM, [0, 0.704, 0], 0.18, 0.037, [HALF_PI, 0, 0]);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    box(rig, `ruff-pleat-${i}`, CREAM, [Math.cos(angle) * 0.185, 0.707, Math.sin(angle) * 0.185], [0.06, 0.048, 0.065], [0, -angle, 0]);
  }
  for (const [s, parent] of [[-1, left], [1, right]]) {
    sphere(parent, `doublet-puff-${s}`, red, [0, -0.035, 0], [0.092, 0.095, 0.09]);
    cylinder(parent, `doublet-sleeve-${s}`, red, [0, -0.14, 0], 0.06, 0.057, 0.13);
    cylinder(parent, `doublet-cuff-${s}`, CREAM, [0, -0.201, 0], 0.068, 0.071, 0.04);
    const hip = s < 0 ? ctx.hipLeft : ctx.hipRight;
    sphere(hip, `trunk-hose-${s}`, red, [s * 0.003, 0.01, 0], [0.115, 0.11, 0.135]);
    box(hip, `trunk-hose-stripe-${s}`, GOLD, [s * 0.003, 0.012, 0.126], [0.024, 0.13, 0.014]);
  }
}

function buildPalestinian(ctx) {
  const { rig, left, right, box, cylinder } = ctx;
  const blue = '#356d86';
  const red = '#dd6b69';
  // 巴勒斯坦 thob：長袍、胸前繡片、袖口與縱向幾何刺繡帶。
  cylinder(rig, 'thob-skirt', blue, [0, 0.36, 0], 0.19, 0.245, 0.40);
  sleeves(ctx, blue, 0.077, 0.22);
  box(rig, 'thob-chest-panel', red, [0, 0.595, 0.167], [0.17, 0.16, 0.023]);
  box(rig, 'thob-chest-inset', blue, [0, 0.598, 0.183], [0.12, 0.112, 0.014]);
  for (const [x, y] of [[-0.035, 0.61], [0.035, 0.61], [0, 0.563]]) {
    box(rig, `thob-chest-diamond-${x}-${y}`, GOLD, [x, y, 0.194], [0.032, 0.032, 0.009], [0, 0, Math.PI / 4]);
  }
  for (const s of [-1, 1]) {
    box(rig, `thob-vertical-embroidery-${s}`, red, [s * 0.126, 0.355, 0.19], [0.035, 0.285, 0.016], [-0.14, 0, 0]);
    box(rig, `thob-vertical-diamond-${s}`, GOLD, [s * 0.126, 0.36, 0.202], [0.026, 0.026, 0.01], [0, 0, Math.PI / 4]);
  }
  cylinder(rig, 'thob-embroidered-hem', red, [0, 0.187, 0], 0.241, 0.246, 0.037);
  for (const [side, parent] of [['left', left], ['right', right]]) {
    cylinder(parent, `thob-embroidered-cuff-${side}`, red, [0, -0.185, 0], 0.077, 0.077, 0.045);
    box(parent, `thob-sleeve-diamond-${side}`, GOLD, [0, -0.14, 0.074], [0.036, 0.036, 0.012], [0, 0, Math.PI / 4]);
  }
}

function buildRussian(ctx) {
  const { rig, left, right, box, cylinder, sphere } = ctx;
  const red = '#b94965';
  // 俄羅斯 sarafan：寬肩帶無袖長裙，內搭米白色蓬袖上衣。
  cylinder(rig, 'sarafan-skirt', red, [0, 0.35, 0], 0.178, 0.281, 0.39);
  box(rig, 'sarafan-bib', red, [0, 0.545, 0.151], [0.29, 0.18, 0.045]);
  for (const s of [-1, 1]) {
    box(rig, `sarafan-strap-${s}`, red, [s * 0.103, 0.637, 0.143], [0.057, 0.15, 0.043], [0, 0, s * 0.08]);
    box(rig, `sarafan-strap-trim-${s}`, GOLD, [s * 0.103, 0.637, 0.168], [0.018, 0.13, 0.012], [0, 0, s * 0.08]);
  }
  box(rig, 'sarafan-bib-trim', GOLD, [0, 0.607, 0.179], [0.255, 0.024, 0.014]);
  box(rig, 'sarafan-front-trim', GOLD, [0, 0.35, 0.237], [0.026, 0.28, 0.014], [-0.26, 0, 0]);
  cylinder(rig, 'sarafan-hem', GOLD, [0, 0.181, 0], 0.269, 0.282, 0.035);
  for (const [side, parent] of [['left', left], ['right', right]]) {
    sphere(parent, `sarafan-blouse-puff-${side}`, CREAM, [0, -0.07, 0], [0.085, 0.115, 0.084]);
    cylinder(parent, `sarafan-blouse-cuff-${side}`, red, [0, -0.19, 0], 0.063, 0.064, 0.04);
  }
}

function buildJapanese(ctx) {
  const { rig, left, right, head, box, cylinder, sphere } = ctx;
  const pink = '#b969a4';
  const obi = '#e6c67c';
  // 和服左襟覆右襟：左襟從正面畫面右側往另一側腰部覆下。
  cylinder(rig, 'kimono-skirt', pink, [0, 0.345, 0], 0.192, 0.219, 0.37);
  box(rig, 'kimono-chest', pink, [0, 0.587, 0.135], [0.32, 0.20, 0.07]);
  box(rig, 'kimono-inner-right-collar', CREAM, [-0.025, 0.622, 0.181], [0.038, 0.207, 0.019], [0, 0, 0.69]);
  box(rig, 'kimono-outer-left-collar', CREAM, [0.018, 0.604, 0.198], [0.038, 0.246, 0.019], [0, 0, -0.70]);
  cylinder(rig, 'kimono-obi', obi, [0, 0.49, 0], 0.207, 0.211, 0.12);
  box(rig, 'kimono-obijime', pink, [0, 0.49, 0.213], [0.35, 0.023, 0.016]);
  for (const [s, parent] of [[-1, left], [1, right]]) {
    box(parent, `kimono-hanging-sleeve-${s}`, pink, [s * 0.045, -0.105, -0.01], [0.178, 0.25, 0.176]);
    box(parent, `kimono-sleeve-edge-${s}`, CREAM, [s * 0.045, -0.221, 0.01], [0.178, 0.022, 0.14]);
    box(rig, `kimono-back-bow-wing-${s}`, obi, [s * 0.085, 0.515, -0.223], [0.16, 0.12, 0.075], [0, 0, s * 0.20]);
  }
  box(rig, 'kimono-back-bow-knot', obi, [0, 0.514, -0.259], [0.07, 0.12, 0.07]);
  bun(ctx, 'kimono-hair-bun', [0, 0.20, -0.24], [0.115, 0.105, 0.105]);
  box(head, 'kimono-hairpin', obi, [0.055, 0.245, -0.20], [0.24, 0.017, 0.019], [0, 0, -0.24]);
  sphere(head, 'kimono-hair-ornament', pink, [0.18, 0.215, -0.18], [0.043, 0.043, 0.028]);
}

function buildKorean(ctx) {
  const { rig, left, right, box, cylinder } = ctx;
  const blue = '#467b9b';
  const red = '#b94965';
  // 韓服：高腰 chima 長裙、短 jeogori 上衣與垂落的 goreum 衣帶。
  cylinder(rig, 'hanbok-chima', blue, [0, 0.37, 0], 0.18, 0.303, 0.42);
  cylinder(rig, 'hanbok-high-waist', red, [0, 0.568, 0], 0.186, 0.194, 0.046);
  box(rig, 'hanbok-jeogori', CREAM, [0, 0.623, 0.139], [0.325, 0.142, 0.066]);
  sleeves(ctx, CREAM, 0.077, 0.22);
  box(rig, 'hanbok-inner-collar', red, [-0.043, 0.66, 0.179], [0.026, 0.125, 0.016], [0, 0, 0.7]);
  box(rig, 'hanbok-outer-collar', red, [0.025, 0.639, 0.192], [0.027, 0.17, 0.017], [0, 0, -0.65]);
  box(rig, 'hanbok-goreum-knot', red, [-0.06, 0.585, 0.199], [0.047, 0.035, 0.029]);
  box(rig, 'hanbok-goreum-loop', red, [-0.097, 0.591, 0.203], [0.08, 0.032, 0.025], [0, 0, -0.26]);
  box(rig, 'hanbok-goreum-long-tail', red, [-0.035, 0.51, 0.222], [0.035, 0.15, 0.018], [0, 0, 0.23]);
  box(rig, 'hanbok-goreum-short-tail', red, [-0.091, 0.532, 0.22], [0.032, 0.107, 0.019], [0, 0, -0.22]);
  for (const [side, parent] of [['left', left], ['right', right]]) {
    cylinder(parent, `hanbok-cuff-${side}`, red, [0, -0.192, 0], 0.074, 0.074, 0.035);
  }
  bun(ctx, 'hanbok-low-bun', [0, -0.08, -0.277], [0.099, 0.082, 0.085]);
}

function buildTurkish(ctx) {
  const { rig, left, right, box, cylinder, sphere } = ctx;
  const green = '#32847e';
  const blue = '#5d7195';
  // 鄂圖曼 entari 前開長外袍，中央保留內衣與寬鬆長褲的輪廓。
  box(rig, 'entari-back', green, [0, 0.405, -0.14], [0.39, 0.44, 0.105]);
  for (const s of [-1, 1]) {
    box(rig, `entari-side-${s}`, green, [s * 0.18, 0.409, 0], [0.072, 0.448, 0.29]);
    box(rig, `entari-front-panel-${s}`, green, [s * 0.134, 0.411, 0.157], [0.12, 0.454, 0.075]);
    box(rig, `entari-front-gold-edge-${s}`, GOLD, [s * 0.079, 0.411, 0.202], [0.018, 0.454, 0.015]);
    box(rig, `entari-neckline-${s}`, GOLD, [s * 0.096, 0.65, 0.165], [0.025, 0.124, 0.019], [0, 0, s * 0.34]);
    const hip = s < 0 ? ctx.hipLeft : ctx.hipRight;
    cylinder(hip, `entari-trouser-leg-${s}`, blue, [s * 0.001, -0.075, 0], 0.093, 0.065, 0.23);
    sphere(hip, `entari-baggy-trousers-${s}`, blue, [s * 0.001, -0.026, 0.02], [0.104, 0.115, 0.105]);
  }
  box(rig, 'entari-waist-sash', GOLD, [0, 0.465, 0.163], [0.174, 0.063, 0.037]);
  sleeves(ctx, green, 0.079, 0.22);
  for (const [side, parent] of [['left', left], ['right', right]]) {
    cylinder(parent, `entari-gold-cuff-${side}`, GOLD, [0, -0.192, 0], 0.075, 0.075, 0.035);
  }
}

function buildSpanish(ctx) {
  const { rig, left, right, head, cylinder, sphere, torus } = ctx;
  const red = '#d55563';
  const dark = '#9d3c60';
  // 安達魯西亞佛朗明哥舞裙：合身上身與三層外展荷葉裙襬。
  cylinder(rig, 'flamenco-fitted-waist', red, [0, 0.445, 0], 0.18, 0.199, 0.16);
  const tiers = [
    ['upper', 0.359, 0.194, 0.254, 0.105],
    ['middle', 0.272, 0.232, 0.289, 0.105],
    ['lower', 0.186, 0.264, 0.326, 0.085],
  ];
  for (const [name, y, top, bottom, height] of tiers) {
    cylinder(rig, `flamenco-${name}-ruffle`, red, [0, y, 0], top, bottom, height);
    cylinder(rig, `flamenco-${name}-ruffle-edge`, CREAM, [0, y - height / 2 + 0.01, 0], bottom - 0.012, bottom + 0.003, 0.022);
  }
  cylinder(rig, 'flamenco-waist-band', dark, [0, 0.465, 0], 0.191, 0.194, 0.039);
  for (const [side, parent] of [['left', left], ['right', right]]) {
    sphere(parent, `flamenco-shoulder-ruffle-${side}`, red, [0, -0.025, 0], [0.09, 0.069, 0.087]);
    torus(parent, `flamenco-sleeve-ruffle-${side}`, red, [0, -0.177, 0], 0.067, 0.021, [HALF_PI, 0, 0]);
    torus(parent, `flamenco-sleeve-edge-${side}`, CREAM, [0, -0.199, 0], 0.065, 0.014, [HALF_PI, 0, 0]);
  }
  bun(ctx, 'flamenco-low-bun', [0, -0.075, -0.28], [0.10, 0.09, 0.09]);
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    sphere(head, `flamenco-flower-petal-${i}`, red, [0.247 + Math.cos(angle) * 0.034, 0.14 + Math.sin(angle) * 0.034, 0.075], [0.032, 0.032, 0.022]);
  }
  sphere(head, 'flamenco-flower-center', GOLD, [0.247, 0.14, 0.099], [0.02, 0.02, 0.013]);
}

function buildVietnamese(ctx) {
  const { rig, box, cylinder, sphere } = ctx;
  const teal = '#51a6a2';
  // 越南 áo dài：立領、貼身長袖、腰側開衩與米白色長褲。
  sleeves(ctx, teal, 0.061, 0.22);
  cylinder(rig, 'ao-dai-standing-collar', teal, [0, 0.706, 0], 0.086, 0.095, 0.047);
  box(rig, 'ao-dai-front-panel', teal, [0, 0.374, 0.155], [0.31, 0.37, 0.052]);
  box(rig, 'ao-dai-back-panel', teal, [0, 0.374, -0.15], [0.31, 0.37, 0.052]);
  box(rig, 'ao-dai-diagonal-fastening', GOLD, [-0.07, 0.638, 0.169], [0.014, 0.145, 0.013], [0, 0, 0.57]);
  for (const [x, y] of [[-0.031, 0.684], [-0.099, 0.577]]) {
    sphere(rig, `ao-dai-fastening-${y}`, GOLD, [x, y, 0.18], [0.014, 0.014, 0.011]);
  }
  for (const s of [-1, 1]) {
    const hip = s < 0 ? ctx.hipLeft : ctx.hipRight;
    cylinder(hip, `ao-dai-long-trousers-${s}`, CREAM, [0, -0.09, 0], 0.07, 0.064, 0.21);
  }
}

const BUILDERS = {
  D23: buildEnglish,
  D24: buildPalestinian,
  D25: buildRussian,
  D26: buildJapanese,
  D27: buildKorean,
  D28: buildTurkish,
  D29: buildSpanish,
  D30: buildVietnamese,
};

export function buildLanguageCostume(id, ctx) {
  BUILDERS[id]?.(ctx);
}
