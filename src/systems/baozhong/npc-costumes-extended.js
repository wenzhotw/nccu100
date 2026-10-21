// 剩餘商管與人文造型。共用西裝/襯衫由 profile 提供，僅加活動服與識別道具。
const INK = '#303a53', PAPER = '#f4eedc', GOLD = '#e8bc59';
const BLUE = '#6db8cc', GREEN = '#73b69d', CORAL = '#e78e7a';
function held(c, name) {
  const g = c.group(c.left, name, [0, -.25, 0]); g.rotation.x = 1.05; return g;
}
function board(c, name, color = INK) {
  const g = held(c, name);
  c.box(g, `${name}-cover`, color, [.085, .07, 0], [.28, .32, .035]);
  c.box(g, `${name}-page`, PAPER, [.085, .075, .022], [.24, .27, .012]);
  return g;
}
function line(c, g, name, color, x, y, width, z = .033) {
  c.box(g, name, color, [x, y, z], [width, .014, .008]);
}
function glasses(c, name, color = INK, thick = .009) {
  for (const side of [-1, 1]) {
    // Frames sit ahead of the eyes, with no opaque lens hiding expressions.
    for (const y of [-.026, .057]) c.box(c.head, `${name}-rim-${side}-${y}`, color, [side * .096, y, .295], [.15, thick, .014]);
    for (const x of [side * .096 - .075, side * .096 + .075]) c.box(c.head, `${name}-side-${side}-${x}`, color, [x, .0155, .295], [thick, .083, .014]);
    c.box(c.head, `${name}-temple-${side}`, color, [side * .171, .026, .195], [.013, thick, .20]);
  }
  c.box(c.head, `${name}-bridge`, color, [0, .025, .30], [.044, thick, .014]);
}
function vest(c, name, color) {
  for (const s of [-1, 1]) {
    c.box(c.rig, `${name}-panel-${s}`, color, [s * .10, .535, .018], [.178, .29, .33]);
    c.box(c.rig, `${name}-v-neck-${s}`, PAPER, [s * .046, .655, .19], [.025, .13, .015], [0, 0, -s * .46]);
  }
  c.box(c.rig, `${name}-ribbed-hem`, color, [0, .398, .02], [.355, .035, .34]);
}
function book(c, g, name, color, pos, size) {
  const [x, y, z] = pos, [w, h, d] = size;
  c.box(g, `${name}-pages`, PAPER, pos, [w * .94, h * .92, d]);
  for (const s of [-1, 1]) c.box(g, `${name}-cover-${s}`, color, [x, y, z + s * d / 2], [w, h, .012]);
  c.box(g, `${name}-spine`, color, [x - w / 2, y, z], [.02, h, d]);
}
function chart(c, g, name, heights = [.075, .12, .17]) {
  heights.forEach((h, i) => c.box(g, `${name}-bar-${i}`, [BLUE, CORAL, GREEN][i % 3], [.015 + i * .065, -.025 + h / 2, .035], [.042, h, .012]));
  line(c, g, `${name}-axis`, INK, .085, -.031, .20);
}
function business(id, c) {
  if (id === 'D14' || id === 'D16') c.box(c.rig, 'business-open-shirt-front', '#ffffff', [0,.575,.17], [.09,.16,.018]);
  if (id === 'D11') {
    const g = held(c, 'trade-passport');
    book(c, g, 'passport', '#245559', [.035, .065, 0], [.13, .18, .035]);
    c.torus(g, 'passport-globe', GOLD, [.035, .078, .027], .032, .005);
    line(c, g, 'passport-title', GOLD, .035, .125, .07, .027);
    // Wheeled case stands beside the leg; its telescopic grip is deliberately distinct.
    const bag = c.group(c.rig, 'trade-rolling-case', [-.34, .20, -.045]);
    c.box(bag, 'trade-case-shell', '#41697d', [0, 0, 0], [.22, .28, .17]);
    for (const s of [-1, 1]) {
      c.cylinder(bag, `trade-case-wheel-${s}`, INK, [s * .075, -.135, .015], .027, .027, .035, [0, 0, Math.PI / 2]);
      c.box(bag, `trade-case-handle-rail-${s}`, '#aab8bd', [s * .055, .19, 0], [.012, .16, .012]);
    }
    c.box(bag, 'trade-case-handle', INK, [0, .27, 0], [.13, .025, .035]);
  } else if (id === 'D12') {
    const g = board(c, 'finance-market-tablet'); chart(c, g, 'market');
    line(c, g, 'market-header', INK, .085, .18, .18);
    for (let i = 0; i < 3; i++) line(c, g, `market-ticker-${i}`, GREEN, .085, .148 - i * .022, .16 - i * .025);
  } else if (id === 'D13') {
    const g = held(c, 'accounting-ledger');
    book(c, g, 'thick-ledger', '#7a5260', [.075, .07, 0], [.27, .31, .075]);
    c.box(g, 'ledger-label', PAPER, [.075, .145, .046], [.17, .055, .009]);
    c.box(g, 'calculator-body', INK, [.08, .015, .08], [.14, .17, .04]);
    c.box(g, 'calculator-screen', GREEN, [.08, .069, .105], [.105, .035, .009]);
    for (let i = 0; i < 6; i++) c.box(g, `calculator-key-${i}`, PAPER, [.043 + (i % 3) * .037, .02 - Math.floor(i / 3) * .038, .105], [.023, .024, .009]);
  } else if (id === 'D14') {
    for (const s of [-1, 1]) c.box(c.rig, `statistics-bow-${s}`, '#b86a68', [s * .037, .688, .192], [.06, .05, .026], [0, 0, s * .20]);
    c.sphere(c.rig, 'statistics-bow-knot', GOLD, [0, .688, .207], [.019, .021, .016]);
    const g = board(c, 'statistics-board', '#705a80'); chart(c, g, 'statistics');
    for (let i = 0; i < 3; i++) c.sphere(g, `statistics-dot-${i}`, [CORAL, BLUE, GREEN][i], [.025 + i * .065, .174, .037], [.019, .019, .009]);
  } else if (id === 'D15') {
    const g = board(c, 'management-project-board');
    for (let i = 0; i < 4; i++) { line(c, g, `project-row-${i}`, '#d4d1c6', .085, .17 - i * .06, .20); line(c, g, `project-progress-${i}`, [BLUE, GREEN, GOLD, CORAL][i], .04 + i * .018, .17 - i * .06, .09, .044); }
    c.sphere(c.head, 'management-earpiece', INK, [-.265, .015, 0], [.034, .055, .045]);
    c.box(c.head, 'management-mic-boom', INK, [-.238, -.05, .12], [.012, .012, .21], [.2, -.35, 0]);
    c.sphere(c.head, 'management-mic-tip', INK, [-.20, -.07, .215], [.025, .018, .021]);
  } else if (id === 'D16') {
    const g = board(c, 'mis-workflow-tablet');
    c.box(g, 'workflow-connector', INK, [.085, .075, .035], [.012, .20, .008]);
    for (let i = 0; i < 3; i++) c.box(g, `workflow-node-${i}`, [BLUE, GOLD, GREEN][i], [.085, .17 - i * .09, .043], [.12, .048, .012]);
  } else if (id === 'D17') {
    c.box(c.rig, 'wealth-double-breasted-panel', '#29384e', [.035, .53, .181], [.22, .26, .025]);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) c.sphere(c.rig, `wealth-brass-button-${s}-${i}`, GOLD, [s * .058, .61 - i * .07, .205], [.012, .012, .008]);
    const g = board(c, 'wealth-investment-folder', '#665443'); chart(c, g, 'investment');
    line(c, g, 'investment-heading', GOLD, .085, .184, .17);
  } else {
    const g = board(c, 'insurance-policy-folder', '#426865');
    c.box(g, 'insurance-shield-upper', BLUE, [.085, .115, .038], [.13, .10, .014]);
    c.box(g, 'insurance-shield-point', BLUE, [.085, .055, .038], [.09, .09, .014], [0, 0, Math.PI / 4]);
    c.box(g, 'insurance-shield-check-short', PAPER, [.065, .10, .049], [.016, .047, .008], [0, 0, .6]);
    c.box(g, 'insurance-shield-check-long', PAPER, [.095, .115, .049], [.016, .08, .008], [0, 0, -.5]);
    line(c, g, 'insurance-policy-line', INK, .085, -.025, .17);
  }
}
function other(id, c) {
  if (id === 'D20') {
    glasses(c, 'advertising-designer-glasses', '#553661', .016);
    const g = board(c, 'advertising-storyboard', '#d47849');
    for (let i = 0; i < 4; i++) {
      const x = .027 + (i % 2) * .116, y = .145 - Math.floor(i / 2) * .115;
      c.box(g, `storyboard-frame-${i}`, INK, [x, y, .033], [.099, .09, .009]);
      c.box(g, `storyboard-scene-${i}`, [BLUE, GOLD, CORAL, GREEN][i], [x, y, .04], [.082, .074, .008]);
      c.sphere(g, `storyboard-subject-${i}`, PAPER, [x - .015, y + .012, .047], [.017, .02, .005]);
      line(c, g, `storyboard-caption-${i}`, INK, x, y - .03, .05, .047);
    }
  } else if (id === 'D22') {
    for (const s of [-1, 1]) c.box(c.rig, `communication-camera-neckstrap-${s}`, INK, [s * .076, .62, .194], [.019, .21, .014], [0, 0, s * .18]);
    const camera = c.group(c.rig, 'communication-neck-camera', [0, .505, .23]);
    c.box(camera, 'communication-camera-body', INK, [0, 0, 0], [.19, .12, .09]);
    c.cylinder(camera, 'communication-camera-lens', INK, [.025, 0, .071], .047, .047, .08, [Math.PI / 2, 0, 0]);
    c.cylinder(camera, 'communication-camera-glass', BLUE, [.025, 0, .115], .036, .036, .012, [Math.PI / 2, 0, 0]);
    c.box(camera, 'communication-camera-shutter', GOLD, [-.06, .068, 0], [.028, .02, .025]);
    c.box(c.rig, 'communication-crossbody-strap', '#7d6654', [0, .55, .211], [.03, .43, .018], [0, 0, -.62]);
    c.box(c.rig, 'communication-satchel', '#aa8666', [.23, .37, .04], [.16, .20, .15]);
    c.box(c.rig, 'communication-satchel-flap', '#7d6654', [.23, .43, .123], [.17, .07, .022]);
  } else if (id === 'D32') {
    vest(c, 'math-argyle-vest', '#63808c');
    for (let i = 0; i < 3; i++) c.box(c.rig, `math-argyle-diamond-${i}`, i % 2 ? GOLD : PAPER, [(i - 1) * .105, .525, .196], [.075, .075, .014], [0, 0, Math.PI / 4]);
    c.box(c.rig, 'math-pocket', '#496976', [.105, .615, .202], [.075, .06, .02]);
    c.box(c.rig, 'math-pocket-ruler', PAPER, [.10, .656, .193], [.028, .10, .013]);
    c.box(c.rig, 'math-pocket-pencil', CORAL, [.132, .66, .194], [.012, .11, .014]);
    const g = held(c, 'math-geometric-model');
    c.sphere(g, 'math-polyhedron', GOLD, [.035, .105, 0], [.10, .105, .10]);
    c.torus(g, 'math-model-equator', INK, [.035, .105, 0], .116, .009, [Math.PI / 2, 0, 0]);
    c.cylinder(g, 'math-model-pedestal', INK, [.035, -.005, 0], .065, .085, .025);
  } else if (id === 'D33') {
    vest(c, 'psychology-soft-knit', '#a6bba8');
    for (const s of [-1, 1]) c.cylinder(s < 0 ? c.left : c.right, `psychology-knit-sleeve-${s}`, '#a6bba8', [0, -.105, 0], .067, .064, .22);
    const g = board(c, 'psychology-observation-board', '#8a756d');
    for (let i = 0; i < 3; i++) line(c, g, `observation-note-${i}`, '#9b9a94', .085, .035 - i * .04, .18);
    for (let i = 0; i < 2; i++) {
      const card = c.group(g, `cognition-card-${i}`, [.035 + i * .11, .145, .045]); card.rotation.z = i ? -.12 : .12;
      c.box(card, `cognition-card-paper-${i}`, PAPER, [0, 0, 0], [.10, .105, .014]);
      if (i) c.box(card, 'cognition-square', CORAL, [0, 0, .012], [.045, .045, .009], [0, 0, .3]);
      else c.sphere(card, 'cognition-circle', BLUE, [0, 0, .012], [.027, .027, .008]);
    }
  } else if (id === 'D34') {
    c.box(c.rig, 'diplomacy-silk-neck-scarf', '#8aa8c2', [0, .70, .157], [.16, .045, .06]);
    for (const s of [-1, 1]) c.box(c.rig, `diplomacy-scarf-tail-${s}`, '#8aa8c2', [s * .033, .638, .20], [.045, .12, .018], [0, 0, s * .24]);
    const g = board(c, 'diplomacy-negotiation-folder', '#304967');
    c.torus(g, 'diplomacy-globe-emblem', GOLD, [.085, .125, .037], .059, .006);
    c.box(g, 'diplomacy-globe-longitude', GOLD, [.085, .125, .038], [.009, .11, .009]);
    line(c, g, 'diplomacy-globe-equator', GOLD, .085, .125, .11, .038);
    line(c, g, 'diplomacy-document-title', INK, .085, .015, .16);
  } else if (id === 'D35') {
    vest(c, 'education-teacher-knit-vest', '#bd9d77'); glasses(c, 'education-thin-frame', '#736451', .007);
    const g = held(c, 'education-class-materials');
    book(c, g, 'education-textbook', '#4d847c', [.075, .06, 0], [.27, .30, .045]);
    book(c, g, 'education-rollbook', '#9c675a', [.10, .04, .045], [.20, .24, .035]);
    c.box(g, 'education-rollbook-label', PAPER, [.10, .10, .07], [.14, .055, .008]);
    for (let i = 0; i < 3; i++) line(c, g, `education-attendance-row-${i}`, GOLD, .10, .035 - i * .04, .13, .07);
    c.cylinder(g, 'education-white-chalk', PAPER, [-.028, -.035, .077], .009, .009, .10, [0, 0, -.25]);
  } else if (id === 'D36') {
    const g = board(c, 'innovation-startup-board', '#486b75');
    // Three connected modules form a pitch roadmap, not illegible pseudo-text.
    for (let i = 0; i < 3; i++) {
      c.box(g, `startup-milestone-${i}`, [GOLD, CORAL, GREEN][i], [.015 + i * .07, .12 - i * .035, .036], [.05, .06, .012]);
      if (i < 2) line(c, g, `startup-roadmap-${i}`, INK, .05 + i * .07, .105 - i * .035, .025);
    }
    line(c, g, 'startup-pitch-summary', BLUE, .085, -.015, .17);
    c.box(c.rig, 'innovation-travel-backpack', '#b28254', [0, .54, -.235], [.28, .33, .16]);
    for (const s of [-1, 1]) c.box(c.rig, `innovation-backpack-strap-${s}`, '#b28254', [s * .13, .61, .18], [.03, .22, .02], [0, 0, s * .1]);
    c.box(c.rig, 'innovation-pack-front-pocket', '#946c4c', [0, .46, -.328], [.22, .12, .035]);
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * .075;
      c.box(c.rig, `innovation-international-sticker-${i}`, [BLUE, PAPER, CORAL][i], [x, .59, -.322], [.06, .06, .008], [0, 0, (i - 1) * .15]);
      if (c.label) {
        const label = c.label(c.rig, `innovation-sticker-language-${i}`, ['EN', 'JP', 'IDEA'][i], [x, .59, -.334], .057, .041, ['#6db8cc', '#f4eedc', '#e78e7a'][i], INK);
        if (label) label.rotation.y = Math.PI;
      } else c.box(c.rig, `innovation-sticker-symbol-${i}`, INK, [x, .59, -.329], [.027, .027, .008], [0, 0, i * .6]);
    }
  }
}
/** Called once per spawned NPC; all accessories attach only to that NPC's kit. */
export function buildExtendedCostume(id, ctx) {
  if (['D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18'].includes(id)) business(id, ctx);
  else other(id, ctx);
}
