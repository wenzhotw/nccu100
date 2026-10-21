// 使用者指定的競選戲仿造型。只展示文字，不改對話、問答或任務。
export const CAMPAIGN_FLAG_TEXT = '你們的總統 唐納川普';
export const SOAPBOX_HEIGHT = .18;
export function buildPoliticalCostume(ctx) {
  const { root, head, group, box, cylinder, sphere, label } = ctx;
  sphere(head, 'campaign-golden-comb-over', '#e5c15a', [-.05, .225, .10], [.25, .075, .17]).rotation.z = .15;
  const stage = group(root, 'campaign-stage');
  box(stage, 'soapbox', '#9d6c42', [0, SOAPBOX_HEIGHT / 2, 0], [.62, SOAPBOX_HEIGHT, .50]);
  for (const z of [-.255, .255]) {
    for (let i = 0; i < 3; i++) box(stage, `soapbox-slat-${z}-${i}`, '#c99560', [0, .035 + i * .052, z], [.60, .035, .014]);
  }
  const flag = group(stage, 'campaign-flag', [.47, 0, -.03]);
  cylinder(flag, 'flag-pole', '#dadde4', [0, .59, 0], .013, .013, 1.18);
  cylinder(flag, 'flag-foot', '#505968', [0, .025, 0], .08, .10, .05);
  sphere(flag, 'flag-finial', '#d9b34f', [0, 1.20, 0], [.035, .035, .035]);
  // Two readable lines preserve the exact user wording (space-normalized metadata below).
  const cloth = label(flag, 'campaign-flag-text', '你們的總統\n唐納川普', [.20, .96, .005], .40, .27, '#204a87', '#ffffff');
  cloth.userData.exactText = CAMPAIGN_FLAG_TEXT;
  // Separate reversed plane avoids mirrored writing when approaching from behind.
  const back = label(flag, 'campaign-flag-text-back', '你們的總統\n唐納川普', [.20, .96, -.005], .40, .27, '#204a87', '#ffffff');
  back.rotation.y = Math.PI;
  back.userData.exactText = CAMPAIGN_FLAG_TEXT;
  box(flag, 'campaign-red-banner', '#c53a45', [.20, .795, 0], [.40, .035, .016]);
  stage.userData.platformHeight = SOAPBOX_HEIGHT;
  return stage;
}
