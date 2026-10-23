/**
 * T015：固定關節姿勢，只供測試使用，不修改遊戲狀態、模型、材質或階層。
 * 基準：a40a04e03e618be0515e98fa51bbd41df9bd0784，worldList FORMAT=3。
 */
export const POSE_IDS = Object.freeze(['chiang', 'player', 'bz26-D12', 'bz26-D23']);
export const POSE_JOINTS = Object.freeze(['shL', 'shR', 'hipL', 'hipR', 'head']);

function fixed(name, rotations, source) {
  for (const key of POSE_JOINTS) Object.freeze(rotations[key]);
  return Object.freeze({ name, order: 'XYZ', rotations: Object.freeze(rotations), source });
}

/** Six absolute, rotation-only poses, in stable order. No time/random inputs. */
export function poseList(id) {
  if (!POSE_IDS.includes(id)) throw new RangeError(`Unsupported pose character: ${id}`);
  const player = id === 'player';
  const spread = player ? 0.15 : 0.12;
  const neutral = () => ({
    shL: [0, 0, -spread], shR: [0, 0, spread],
    hipL: [0, 0, 0], hipR: [0, 0, 0], head: [0, 0, 0],
  });
  const walk = (name, sine) => fixed(name, {
    shL: [sine * 0.9, 0, -spread], shR: [-sine * 0.9, 0, spread],
    hipL: [-sine * 0.8, 0, 0], hipR: [sine * 0.8, 0, 0],
    head: [player ? -0.05 : 0, 0, 0],
  }, player
    ? 'player.animateHero: grounded, amt=1, sin(walkPh)=+/-1, head time=0; rig motion omitted'
    : 'npc.npcUpdate: a=1, sin(ph)=+/-1; rig motion omitted');
  return Object.freeze([
    walk('walk-a', 1),
    walk('walk-b', -1),
    fixed('raise-hand', { ...neutral(), shR: [-0.15, 0, 2.55] },
      'npc.npcUpdate umbrella arm rotation; no umbrella visibility or callback change'),
    fixed('wave', { ...neutral(), shR: [-0.3, 0, 2.3] },
      'npc.npcUpdate stationary wave at time=0; reused as player stress fixture'),
    fixed('sit', {
      shL: [-0.5, 0, -0.25], shR: [-0.5, 0, 0.25],
      hipL: [-1.5, 0, 0.08], hipR: [-1.5, 0, -0.08], head: [0, 0, 0],
    }, 'gym.sitPose joint rotations only; deliberate omission of rig.position.y=-0.3'),
    fixed('panic', { ...neutral(), shL: [0, 0, -2.5], shR: [0, 0, 2.5] },
      'npc.npcUpdate panic at time=0; player uses same arm stress pose, not airborne animation'),
  ]);
}

/**
 * Serializer injection avoids importing build.mjs and its eager outfit changes.
 * Call synchronously inside build.add(id, root), before setOutfit/becomeEagle.
 * P is an NPC's P, or player H (same five verified joint keys).
 * Returns six {id, pose, world} records; worldList(root) must return string[].
 * Does NOT call npcUpdate/n.after/animateHero or alter face maps/game flags.
 */
export function capturePoseSnapshots(id, root, P, worldList) {
  const poses = poseList(id);
  if (!root || typeof root.updateMatrixWorld !== 'function') throw new TypeError('Invalid pose root');
  if (typeof worldList !== 'function') throw new TypeError('worldList must be a function');
  const nodes = POSE_JOINTS.map(key => {
    const node = P?.[key];
    if (!node?.rotation?.isEuler || typeof node.rotation.clone !== 'function') {
      throw new TypeError(`Missing Euler joint P.${key}`);
    }
    for (const v of [node.rotation.x, node.rotation.y, node.rotation.z]) {
      if (!Number.isFinite(v)) throw new TypeError(`Nonfinite joint P.${key}`);
    }
    let ancestor = node;
    while (ancestor && ancestor !== root) ancestor = ancestor.parent;
    if (ancestor !== root) throw new TypeError(`P.${key} is outside root`);
    return node;
  });
  if (new Set(nodes).size !== POSE_JOINTS.length) throw new TypeError('Pose joint aliases overlap');
  const before = nodes.map(node => node.rotation.clone());
  try {
    return poses.map(pose => {
      nodes.forEach((node, i) => {
        const xyz = pose.rotations[POSE_JOINTS[i]];
        node.rotation.set(xyz[0], xyz[1], xyz[2], pose.order);
      });
      const world = worldList(root);
      if (!Array.isArray(world) || !world.every(line => typeof line === 'string')) {
        throw new TypeError('worldList(root) must return string[] synchronously');
      }
      return { id, pose: pose.name, world: [...world] };
    });
  } finally {
    nodes.forEach((node, i) => node.rotation.copy(before[i]));
    root.updateMatrixWorld(true);
  }
}
