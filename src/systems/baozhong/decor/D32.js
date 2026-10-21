// D32 應用數學：金色圓環（不是莫比烏斯環）、三件 π、正二十面體。
export default function build(ctx) {
  // 圓環下方有落地台座，底點與支柱頂點相接。
  ctx.box(0.30, 0.08, 0.28, '#546e7a', -0.75, 0.04, -0.35);
  ctx.cyl(0.035, 0.045, 0.87, '#78909c', -0.75, 0.515, -0.35);
  ctx.torus(0.25, 0.05, '#ffd700', -0.75, 1.25, -0.35);
  // π 確實由兩腳一橫構成，放在落地展示台上，不是一面實心牆。
  ctx.box(0.52, 0.75, 0.24, '#eceff1', 0.65, 0.375, -0.35);
  ctx.box(0.07, 0.35, 0.08, '#1565c0', 0.53, 0.925, -0.35);
  ctx.box(0.07, 0.35, 0.08, '#1565c0', 0.77, 0.925, -0.35);
  ctx.box(0.40, 0.07, 0.08, '#1565c0', 0.65, 1.135, -0.35);
  // 經 F 欄明確核可的直接幾何，僅在 build 建立一次。
  const geometry = new ctx.THREE.IcosahedronGeometry(0.12, 0);
  geometry.computeBoundingBox();
  const ico = new ctx.THREE.Mesh(geometry, ctx.mat('#00bcd4'));
  ico.position.set(0.3, 0.75 - geometry.boundingBox.min.y, 1.0);
  ctx.group.add(ico);
  ctx.sign('數學建模與計算', { w: 0.9, h: 0.3, bg: '#00695c', fg: '#ffffff', x: 0, y: 3.25, z: 0 });
  return {};
}
