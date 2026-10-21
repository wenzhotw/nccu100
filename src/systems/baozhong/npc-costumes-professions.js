// 職業造型只加在既有骨架上，手持物跟左手走，保留右手撐傘。
const INK = '#30344e';
const IVORY = '#f4f4ee';
const GOLD = '#e8c547';

function changpao(ctx) {
  const { rig, left, right, box, cylinder } = ctx;
  const robe = '#c9ad84', jacket = '#3a4667';
  cylinder(rig, 'changpao-long-robe', robe, [0, .44, 0], .19, .235, .60).scale.z = .84;
  cylinder(rig, 'changpao-hem', jacket, [0, .155, 0], .232, .235, .03).scale.z = .84;
  box(rig, 'changpao-front-seam', jacket, [0, .34, .191], [.012, .35, .014], [.06, 0, 0]);
  // 短馬褂與及踝長袍分成兩個清楚的輪廓。
  for (const side of [-1, 1]) {
    box(rig, `magua-panel-${side}`, jacket, [side * .102, .585, .008], [.188, .31, .335]);
    box(rig, `magua-standing-collar-${side}`, jacket, [side * .044, .732, .114], [.075, .06, .045], [0, 0, side * .09]);
    box(rig, `magua-front-trim-${side}`, GOLD, [side * .018, .585, .182], [.012, .28, .012]);
    const arm = side < 0 ? left : right;
    cylinder(arm, `magua-sleeve-${side}`, jacket, [0, -.075, 0], .068, .075, .19);
    cylinder(arm, `magua-cuff-${side}`, robe, [0, -.195, 0], .062, .062, .042);
  }
  for (let i = 0; i < 3; i++) {
    box(rig, `magua-frog-button-${i}`, GOLD, [0, .66 - i * .075, .192], [.075, .018, .022]);
  }
}

function journalist(ctx) {
  const { rig, left, group, box, cylinder, sphere } = ctx;
  const vest = '#2d4f9e';
  for (const side of [-1, 1]) {
    box(rig, `press-vest-${side}`, vest, [side * .107, .55, .015], [.15, .31, .325]);
    box(rig, `press-pocket-${side}`, vest, [side * .109, .465, .19], [.105, .075, .035]);
    box(rig, `press-reflective-strip-${side}`, IVORY, [side * .109, .615, .185], [.112, .025, .016]);
  }
  // 大色塊識別證：深藍背心、淺色證件、人物圖記與資料線。
  box(rig, 'press-badge-lanyard', GOLD, [.102, .574, .197], [.018, .073, .015]);
  box(rig, 'press-id-badge', IVORY, [.102, .526, .214], [.087, .087, .016]);
  sphere(rig, 'press-id-portrait', vest, [.081, .54, .226], [.014, .014, .006]);
  box(rig, 'press-id-line', vest, [.112, .52, .226], [.042, .012, .008]);

  const mic = group(left, 'microphone', [0, -.25, 0]);
  // 配合左肩 x = -1.05 的持物姿勢，讓麥克風回到近乎直立。
  mic.rotation.x = 1.05;
  cylinder(mic, 'microphone-handle', INK, [0, .06, 0], .023, .023, .17);
  box(mic, 'microphone-station-flag', GOLD, [0, .143, 0], [.087, .065, .076]);
  box(mic, 'microphone-station-mark', vest, [0, .143, .041], [.046, .024, .012]);
  sphere(mic, 'microphone-foam', INK, [0, .215, 0], [.067, .077, .065]);
}

function cameraOperator(ctx) {
  const { rig, group, box, cylinder } = ctx;
  const olive = '#63705a', equipment = '#3b4050', webbing = '#c9ad84', glass = '#5c7686';
  for (const side of [-1, 1]) {
    box(rig, `camera-work-vest-${side}`, olive, [side * .107, .55, .014], [.15, .31, .325]);
    box(rig, `camera-cargo-pocket-${side}`, webbing, [side * .108, .47, .19], [.107, .087, .04]);
    box(rig, `camera-pack-strap-${side}`, equipment, [side * .115, .627, .178], [.041, .19, .025], [0, 0, side * .08]);
  }
  box(rig, 'camera-equipment-backpack', equipment, [0, .535, -.235], [.30, .37, .185]);
  box(rig, 'camera-backpack-top-flap', olive, [0, .68, -.337], [.27, .075, .035]);
  box(rig, 'camera-backpack-buckle', webbing, [0, .60, -.34], [.05, .08, .026]);

  // 胸前攝影機有機身、頂部提把、突出的鏡筒和藍色鏡片。
  const camera = group(rig, 'camera', [-.025, .51, .251]);
  box(camera, 'camera-body', equipment, [0, 0, 0], [.235, .145, .115]);
  box(camera, 'camera-top-handle', equipment, [0, .105, -.005], [.12, .027, .037]);
  box(camera, 'camera-handle-support', webbing, [-.045, .079, -.005], [.027, .04, .032]);
  cylinder(camera, 'camera-lens-barrel', equipment, [.025, 0, .10], .076, .076, .115, [Math.PI / 2, 0, 0]);
  cylinder(camera, 'camera-lens-glass', glass, [.025, 0, .163], .057, .057, .016, [Math.PI / 2, 0, 0]);
  box(camera, 'camera-viewfinder', webbing, [-.08, .073, .012], [.06, .035, .05]);

  // 收合腳架綁在背包右側，三支腳保持平行，不碰頭或雙手。
  const tripod = group(rig, 'folded-tripod', [.205, .50, -.31]);
  tripod.rotation.z = -.17;
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * .035;
    cylinder(tripod, `tripod-folded-leg-${i}`, webbing, [x, -.015, 0], .012, .016, .55);
    box(tripod, `tripod-foot-${i}`, equipment, [x, -.292, 0], [.027, .042, .035]);
  }
  box(tripod, 'tripod-head', equipment, [0, .29, 0], [.115, .058, .075]);
  box(tripod, 'tripod-upper-strap', equipment, [0, .16, .008], [.13, .035, .065]);
  box(tripod, 'tripod-lower-strap', equipment, [0, -.16, .008], [.13, .035, .065]);
}

function judge(ctx) {
  const { rig, head, left, right, box, cylinder, sphere, torus } = ctx;
  const wig = '#ddd5c4', facing = '#4e5573';
  cylinder(rig, 'judge-gown', INK, [0, .44, 0], .195, .255, .60).scale.z = .85;
  for (const side of [-1, 1]) {
    box(rig, `judge-front-facing-${side}`, facing, [side * .072, .49, .193], [.061, .43, .025], [0, 0, side * .055]);
    cylinder(side < 0 ? left : right, `judge-wide-sleeve-${side}`, INK, [0, -.103, 0], .073, .10, .232);
    box(rig, `judge-neck-tab-${side}`, IVORY, [side * .035, .659, .202], [.056, .128, .022], [0, 0, side * .055]);
  }
  box(rig, 'judge-white-collar', IVORY, [0, .724, .133], [.165, .033, .06]);

  // 法庭假髮的側邊捲筒停在臉外，正面眉眼與嘴巴維持完整。
  sphere(head, 'judge-wig-crown', wig, [0, .20, -.04], [.30, .118, .25]);
  sphere(head, 'judge-wig-back', wig, [0, -.015, -.235], [.25, .22, .09]);
  for (const side of [-1, 1]) {
    sphere(head, `judge-wig-side-${side}`, wig, [side * .27, -.015, -.025], [.075, .22, .145]);
    for (let row = 0; row < 3; row++) {
      torus(head, `judge-wig-curl-${side}-${row}`, wig, [side * .275, .105 - row * .125, .118], .043, .017);
    }
  }
  for (let i = 0; i < 3; i++) {
    sphere(head, `judge-wig-front-wave-${i}`, wig, [(i - 1) * .135, .205, .19], [.083, .05, .07]);
  }
}

function laptopUser(ctx) {
  const { left, group, box, cylinder } = ctx;
  const metal = '#a3a8ae', screen = '#5a7fb0';
  const laptop = group(left, 'laptop', [0, -.25, 0]);
  // 左掌承托底座左側，螢幕向外展示，機身不延伸至右手。
  laptop.rotation.x = 1.15;
  box(laptop, 'laptop-base', metal, [.125, -.013, .065], [.40, .027, .26]);
  box(laptop, 'laptop-keyboard', INK, [.125, .004, .055], [.315, .009, .108]);
  box(laptop, 'laptop-trackpad', INK, [.125, .004, .145], [.085, .009, .042]);
  cylinder(laptop, 'laptop-hinge', INK, [.125, .012, -.06], .014, .014, .365, [0, 0, Math.PI / 2]);
  const lid = group(laptop, 'laptop-open-lid', [.125, .012, -.06]);
  lid.rotation.x = -.12;
  box(lid, 'laptop-screen-frame', INK, [0, .105, 0], [.40, .21, .025]);
  box(lid, 'laptop-screen', screen, [0, .108, .015], [.355, .168, .009]);
  // 簡化的程式行只是色塊，不生成細小文字或每個鍵帽。
  box(lid, 'laptop-code-line-1', IVORY, [-.049, .149, .022], [.19, .013, .007]);
  box(lid, 'laptop-code-line-2', IVORY, [-.022, .116, .022], [.19, .013, .007]);
  box(lid, 'laptop-code-line-3', IVORY, [-.065, .083, .022], [.16, .013, .007]);
}

/** 依攤位識別碼加上衣服與道具，不更改原始骨架或動畫。 */
export function buildProfessionCostume(id, ctx) {
  if (id === 'D01') changpao(ctx);
  else if (id === 'D19') journalist(ctx);
  else if (id === 'D21') cameraOperator(ctx);
  else if (id === 'D31' || id === 'C06') judge(ctx);
  else if (id === 'D37') laptopUser(ctx);
}
