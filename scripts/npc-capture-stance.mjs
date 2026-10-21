// Screenshot staging only. Resolves a COPY, never moves models or disables collisions.
// Self-contained function so Playwright can serialize it directly into page.evaluate.
export function chooseNpcCaptureStance({ position, face = 0 }, project = point => {
  const q = window.__game.pos.clone().set(point.x, window.__game.heightAt(point.x, point.z), point.z);
  window.__game.resolve(q, .4);
  return { x: q.x, z: q.z };
}) {
  const [x, , z] = position;
  for (const offset of [0, .35, -.35, .7, -.7, 1.05, -1.05, Math.PI]) {
    const angle = face + offset;
    const desired = { x: x + 3 * Math.sin(angle), z: z + 3 * Math.cos(angle) };
    const resolved = project(desired);
    if (Math.hypot(resolved.x - desired.x, resolved.z - desired.z) < .005) {
      return { player: [desired.x, 0, desired.z], offset, radius: .4, distance: 3 };
    }
  }
  throw new Error('No collision-free 3m NPC screenshot stance; do not relax facing or position assertions');
}
