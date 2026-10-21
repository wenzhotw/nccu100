// 人文與社科：配件掛原骨架，文件姿勢的手持物僅使用左手。
const INK = '#303543', PAPER = '#eee4c9', METAL = '#a8afb3';
function shirt(c, name, color, loose = false) {
  c.box(c.rig, `${name}-shirt`, color, [0, .555, .008], [loose ? .385 : .35, .31, .33]);
  for (const s of [-1, 1]) {
    c.cylinder(s < 0 ? c.left : c.right, `${name}-sleeve-${s}`, color, [0, -.10, 0], loose ? .079 : .071, .066, .22);
    c.box(c.rig, `${name}-collar-${s}`, color, [s * .045, .693, .18], [.075, .065, .023], [0, 0, s * .39]);
  }
  c.box(c.rig, `${name}-placket`, PAPER, [0, .55, .182], [.014, .23, .012]);
}
function jacket(c, name, color) {
  for (const s of [-1, 1]) {
    c.box(c.rig, `${name}-panel-${s}`, color, [s * .123, .54, .012], [.13, .345, .355]);
    c.box(c.rig, `${name}-lapel-${s}`, color, [s * .067, .628, .205], [.065, .15, .026], [0, 0, -s * .25]);
    c.cylinder(s < 0 ? c.left : c.right, `${name}-sleeve-${s}`, color, [0, -.10, 0], .077, .067, .23);
  }
  c.box(c.rig, `${name}-back`, color, [0, .54, -.15], [.36, .345, .06]);
}
function held(c, name) {
  const g = c.group(c.left, name, [0, -.25, 0]); g.rotation.x = 1.05; return g;
}
function book(c, parent, name, color, pos = [.075, .025, .025]) {
  const g = c.group(parent, name, pos);
  c.box(g, `${name}-pages`, PAPER, [0, 0, 0], [.21, .25, .047]);
  for (const z of [-.029, .029]) c.box(g, `${name}-cover-${z}`, color, [0, 0, z], [.23, .27, .014]);
  c.box(g, `${name}-spine`, color, [-.11, 0, 0], [.025, .27, .065]);
  c.box(g, `${name}-title`, PAPER, [0, .06, .041], [.13, .027, .009]);
  return g;
}
function bag(c, name, color, canvas = false) {
  c.box(c.rig, `${name}-strap`, color, [0, .56, .212], [.032, .38, .024], [0, 0, -.57]);
  const g = c.group(c.rig, name, [-.205, .335, .065]);
  c.box(g, `${name}-body`, color, [0, 0, 0], [.18, .23, .13]);
  c.box(g, `${name}-flap`, canvas ? PAPER : '#8a6346', [0, .065, .072], [.185, .085, .024]);
  c.box(g, `${name}-buckle`, canvas ? '#71837e' : METAL, [0, .018, .09], [.03, .034, .014]);
}
function recorder(c, parent, name, pos) {
  const g = c.group(parent, name, pos);
  c.box(g, `${name}-body`, INK, [0, 0, 0], [.055, .125, .036]);
  c.box(g, `${name}-screen`, '#8cb4a9', [0, .018, .023], [.036, .04, .009]);
  c.box(g, `${name}-grille`, METAL, [0, .049, .024], [.037, .014, .01]);
  c.sphere(g, `${name}-record-button`, '#c3655d', [0, -.034, .025], [.011, .011, .008]);
}
function clipboard(c, name, color) {
  const g = held(c, name);
  c.box(g, `${name}-board`, color, [.075, .015, .025], [.27, .30, .025]);
  c.box(g, `${name}-paper`, PAPER, [.075, .01, .043], [.225, .25, .012]);
  c.box(g, `${name}-clip`, METAL, [.075, .15, .055], [.09, .035, .025]);
  for (let i = 0; i < 3; i++) c.box(g, `${name}-line-${i}`, '#8c9694', [.075, .065 - i * .055, .054], [.15, .012, .007]);
  return g;
}
function history(c) {
  shirt(c, 'history', '#d9c4a1'); jacket(c, 'history-tweed', '#856344'); bag(c, 'history-leather-book-bag', '#634936');
  for (const s of [-1, 1]) {
    c.torus(c.head, `history-round-glasses-${s}`, '#65543c', [s * .105, .025, .263], .075, .009);
    c.box(c.head, `history-glasses-arm-${s}`, '#65543c', [s * .187, .025, .19], [.015, .014, .15]);
  }
  c.box(c.head, 'history-glasses-bridge', '#65543c', [0, .025, .269], [.059, .012, .014]);
  const g = held(c, 'history-archive');
  c.box(g, 'history-yellowed-folder', '#c1a773', [.075, .015, .02], [.265, .28, .035]);
  c.box(g, 'history-folder-tab', '#c1a773', [.005, .164, .02], [.115, .04, .035]);
  c.box(g, 'history-yellowed-record', '#e5d4a6', [.082, .025, .047], [.225, .23, .016]);
  c.box(g, 'history-record-label', '#8b7450', [.08, .09, .061], [.13, .025, .009]);
  c.box(g, 'history-archive-tie', '#8b7450', [.075, -.045, .066], [.25, .012, .012]);
}
function philosophy(c) {
  shirt(c, 'philosophy', '#ece9dd');
  for (let i = 0; i < 4; i++) c.box(c.rig, `philosophy-blue-stripe-${i}`, '#365c83', [0, .45 + i * .055, .18], [.35, .026, .017]);
  for (const s of [-1, 1]) c.cylinder(s < 0 ? c.hipLeft : c.hipRight, `philosophy-black-trousers-${s}`, INK, [0, -.09, 0], .078, .066, .23);
  c.sphere(c.head, 'philosophy-beret', INK, [.025, .245, -.025], [.295, .10, .27]);
  c.cylinder(c.head, 'philosophy-beret-stem', INK, [.05, .343, -.035], .015, .018, .035);
  c.box(c.rig, 'philosophy-red-neckerchief', '#b64e50', [0, .708, .135], [.18, .043, .095]);
  c.box(c.rig, 'philosophy-scarf-tail', '#b64e50', [.025, .636, .204], [.052, .13, .024], [0, 0, .27]);
  book(c, held(c, 'philosophy-held-book'), 'philosophy-book', '#4a5b72');
}
function sociology(c) {
  shirt(c, 'sociology-loose', '#a6bdb6', true); bag(c, 'sociology-canvas-tote', '#d5c79f', true);
  const g = clipboard(c, 'sociology-interview', '#697d75'); recorder(c, g, 'sociology-recorder', [.19, -.015, .078]);
}
function finance(c) {
  shirt(c, 'finance-shirt', '#e0e5de');
  for (const s of [-1, 1]) c.box(c.rig, `finance-knit-vest-${s}`, '#5b6879', [s * .095, .535, .025], [.155, .28, .325]);
  c.box(c.rig, 'finance-vest-neckline', PAPER, [0, .65, .198], [.07, .07, .016], [0, 0, Math.PI / 4]);
  const g = held(c, 'finance-budget'); book(c, g, 'finance-budget-ledger', '#467d69', [.025, .015, .025]);
  const calc = c.group(g, 'finance-calculator', [.195, -.018, .06]);
  c.box(calc, 'finance-calculator-body', INK, [0, 0, 0], [.10, .16, .03]);
  c.box(calc, 'finance-calculator-screen', '#9bb7a2', [0, .046, .022], [.074, .035, .01]);
  for (let i = 0; i < 6; i++) c.box(calc, `finance-calculator-key-${i}`, PAPER, [(i % 2 - .5) * .038, -.008 - Math.floor(i / 2) * .032, .023], [.023, .019, .012]);
}
function administration(c) {
  shirt(c, 'administration', '#d5e4eb');
  for (const s of [-1, 1]) c.box(c.rig, `administration-lanyard-${s}`, '#3f648b', [s * .034, .63, .197], [.016, .15, .015], [0, 0, -s * .31]);
  c.box(c.rig, 'administration-id-card', PAPER, [0, .53, .214], [.105, .09, .018]);
  c.sphere(c.rig, 'administration-id-portrait', '#578296', [-.027, .537, .229], [.018, .022, .008]);
  c.box(c.rig, 'administration-id-line', INK, [.021, .527, .229], [.035, .012, .008]);
  const g = held(c, 'administration-official-folder');
  c.box(g, 'administration-folder', '#56748e', [.075, .015, .025], [.26, .29, .045]);
  c.box(g, 'administration-folder-label', PAPER, [.075, .08, .055], [.16, .05, .012]);
  c.box(g, 'administration-folder-spine', '#354c69', [-.047, .015, .025], [.018, .29, .06]);
}
function land(c) {
  shirt(c, 'land-shirt', '#d3d9cc');
  for (const s of [-1, 1]) {
    c.box(c.rig, `land-survey-vest-${s}`, '#cb914b', [s * .105, .54, .015], [.16, .30, .34]);
    c.box(c.rig, `land-reflector-${s}`, '#efe1a5', [s * .105, .60, .196], [.12, .032, .018]);
    c.box(c.rig, `land-tool-pocket-${s}`, '#a8773f', [s * .105, .47, .203], [.10, .074, .025]);
  }
  c.sphere(c.head, 'land-hardhat-dome', '#e3ba54', [0, .204, -.02], [.286, .17, .262]);
  c.cylinder(c.head, 'land-hardhat-brim', '#e3ba54', [0, .15, .005], .305, .305, .026).scale.z = .94;
  c.box(c.head, 'land-hardhat-ridge', '#f3d377', [0, .337, -.025], [.045, .036, .24]);
  const g = held(c, 'land-survey-staff');
  // 收合標尺低於頭頂，底端停在地面上方，不侵入鄰攤。
  c.box(g, 'land-staff', PAPER, [0, -.13, .025], [.045, .62, .045]);
  for (let i = 0; i < 5; i++) c.box(g, `land-staff-red-band-${i}`, '#b5524c', [0, -.39 + i * .12, .051], [.047, .045, .012]);
  c.box(g, 'land-staff-foot', INK, [0, -.448, .025], [.065, .025, .063]);
}
function economics(c) {
  c.box(c.rig, 'economics-turtleneck-shirt', '#bdad94', [0, .56, .025], [.33, .30, .32]);
  c.cylinder(c.rig, 'economics-turtleneck-collar', '#bdad94', [0, .72, .015], .09, .10, .065);
  jacket(c, 'economics-blazer', '#4a596d');
  const g = held(c, 'economics-supply-demand');
  c.box(g, 'economics-chart-board', '#36495b', [.09, .015, .025], [.31, .29, .03]);
  c.box(g, 'economics-chart-paper', PAPER, [.09, .015, .046], [.275, .255, .015]);
  c.box(g, 'economics-chart-y-axis', INK, [-.014, .02, .06], [.01, .20, .008]);
  c.box(g, 'economics-chart-x-axis', INK, [.09, -.08, .06], [.22, .01, .008]);
  c.box(g, 'economics-supply-line', '#4f977d', [.09, .015, .071], [.013, .22, .009], [0, 0, -.77]);
  c.box(g, 'economics-demand-line', '#c56b59', [.09, .015, .077], [.013, .22, .009], [0, 0, .77]);
  c.sphere(g, 'economics-equilibrium', '#c9a54a', [.09, .015, .088], [.018, .018, .009]);
}
function ethnology(c) {
  shirt(c, 'ethnology-field', '#b6a17a'); bag(c, 'ethnology-field-satchel', '#74654c');
  for (const s of [-1, 1]) c.box(c.rig, `ethnology-field-pocket-${s}`, '#99845f', [s * .102, .60, .191], [.085, .075, .026]);
  c.cylinder(c.head, 'ethnology-wide-brim', '#bca476', [0, .21, -.02], .345, .345, .025).scale.z = .88;
  c.cylinder(c.head, 'ethnology-hat-crown', '#bca476', [0, .29, -.035], .21, .24, .15).scale.z = .88;
  c.cylinder(c.head, 'ethnology-hat-band', '#74654c', [0, .238, -.035], .234, .24, .035).scale.z = .88;
  const g = held(c, 'ethnology-field-notes'); book(c, g, 'ethnology-notebook', '#8c7653', [.04, .015, .025]);
  recorder(c, g, 'ethnology-recorder', [.19, -.025, .064]);
}
const BUILDERS = { D02: history, D03: philosophy, D05: sociology, D06: finance, D07: administration, D08: land, D09: economics, D10: ethnology };
export function buildSocialCostume(id, ctx) { BUILDERS[id]?.(ctx); }
