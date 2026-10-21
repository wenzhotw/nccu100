#!/usr/bin/env node
/** T059 decor contract preflight. Trusted local modules only, NOT a security sandbox.
 * Single file: real THREE r149 + existing Rollup parser; no browser/network needed.
 * node baozhong-decor.test.mjs --self-test
 * node baozhong-decor.test.mjs /path/to/decor-directory [more-files-or-directories]
 * DECOR_DIR=/path/to/decor node baozhong-decor.test.mjs
 * Set DECOR_DEPS_ROOT to the project containing node_modules if necessary.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const require = createRequire(import.meta.url);
const roots = [process.env.DECOR_DEPS_ROOT, process.cwd(), path.dirname(SELF)].filter(Boolean);
function dependency(name) {
  try { return require(require.resolve(name, { paths: roots })); }
  catch (error) { throw new Error(`Missing local dependency ${name}; set DECOR_DEPS_ROOT to a project with three@0.149.0 and rollup. No download attempted. ${error.message}`); }
}
const THREE = dependency('three');
const { parseAst } = dependency('rollup/parseAst');
if (THREE.REVISION !== '149') throw new Error(`Expected THREE r149, got r${THREE.REVISION}.`);
const LIMITS = Object.freeze({ parts: 20, triangles: 2000, signs: 2, min: [-1.45, 0, -1.45], max: [1.45, 4.5, 1.45] });
const EPS = 1e-6;
export const MODEL = Object.freeze({
  three: THREE.REVISION, context: 'explicit-test-double-not-production-ctx',
  dimensions: 'group-local x,z [-1.45,1.45], y [0,4.5]; root is translated and rotated in the test',
  parts: 'all attached primary Mesh objects, including direct THREE/clone meshes; helper-owned outline Mesh children excluded from default 20-part budget; totalMeshes also reported; --strict-outline-parts includes outlines',
  triangles: 'full geometry index.count/3 or position.count/3, including outline Mesh children, ignoring visibility/drawRange for conservative budget',
  outline: 'only when out > 0; default out=0, out:true means 0.03; shared geometry + BackSide Mesh child; each axis scale is 1+2*out/max(localGeometrySize,0.01), except box uses its positive actual axis size without clamp, like kit.block',
  geometry: 'box one segment; cyl/cone default seg=8; sphere IcosahedronGeometry(r,1); torus radialSegments=6,tubularSegments=16,arc=2PI; sign PlaneGeometry(w,h)',
  sign: 'one plane per sign call, no canvas/font/texture rendering; budget uses max(calls, attached marked sign meshes) to catch clones; text readability and sign appearance are NOT tested',
  animation: '120 steps alternating dt=1/60,1/30,0.1; bounds and budgets checked after each step; allocations through ctx THREE constructors/helper calls and geometry/material/child identity changes checked; NOT a proof against every JavaScript allocation, transient clones, async or unexercised branches',
  security: 'AST preflight and VM timeout are guardrails, NOT a secure sandbox; run only trusted generated modules; no imports, networking, process, eval, loaders, collisions or external textures allowed',
  limitations: 'Not integrated with Claude production ctx yet; helper defaults/segments/material/sign/out conventions require reconciliation. No rendering, collisions, visual quality, final world placement, NPC occlusion or long-time animation proof.'
});

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue;
    if (Array.isArray(value)) for (const entry of value) walk(entry, visit);
    else if (value && typeof value === 'object') walk(value, visit);
  }
}
function staticString(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'BinaryExpression' && node.operator === '+') { const a=staticString(node.left), b=staticString(node.right); if(a !== undefined && b !== undefined) return a+b; }
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0]?.value.cooked;
  return undefined;
}
function property(node) {
  if (!node) return undefined;
  if (!node.computed && node.property?.type === 'Identifier') return node.property.name;
  const value=staticString(node.property); if(value !== undefined) return value;
  return undefined;
}
function issue(code, message, extra = {}) { return { code, message, ...extra }; }
function staticCheck(source) {
  let ast;
  try { ast = parseAst(source); } catch (error) { return { issues: [issue('E_SYNTAX', error.message)] }; }
  const issues = [], seen = new Set();
  const add = (code, message, node) => {
    const key = `${code}:${node.start}`;
    if (!seen.has(key)) { seen.add(key); issues.push(issue(code, message, { offset: node.start })); }
  };
  const forbiddenGlobals = new Set(['process', 'require', 'fetch', 'XMLHttpRequest', 'WebSocket', 'Worker', 'SharedWorker', 'window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'global', 'globalThis', 'eval', 'Function', 'setTimeout', 'setInterval', 'queueMicrotask', 'requestAnimationFrame']);
  walk(ast, node => {
    if (['ImportDeclaration', 'ImportExpression'].includes(node.type) || (node.type === 'MetaProperty' && node.meta?.name === 'import') || ((node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') && node.source)) add('E_IMPORT', 'Static/dynamic imports and re-exports are forbidden, even in dead code.', node);
    if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') add('E_EXPORT', 'Only export default function build(ctx) is permitted.', node);
    if (node.type === 'Identifier' && forbiddenGlobals.has(node.name)) add('E_GLOBAL', `Forbidden external/dynamic-code name: ${node.name}.`, node);
    if (node.type === 'Identifier' && ['MeshStandardMaterial', 'MeshPhysicalMaterial'].includes(node.name)) add('E_MATERIAL', `${node.name} is not permitted.`, node);
    if (node.type === 'MemberExpression') {
      const key = property(node);
      if (['random','randomDirection','generateUUID'].includes(key)) add('E_RANDOM', `Random/UUID API ${key} is forbidden, including computed property access.`, node);
      if (['MeshStandardMaterial', 'MeshPhysicalMaterial'].includes(key)) add('E_MATERIAL', `${key} is not permitted.`, node);
      if (typeof key === 'string' && /^(?:TextureLoader|ImageLoader|FileLoader|ImageBitmapLoader|AudioLoader|CubeTextureLoader|ObjectLoader|BufferGeometryLoader|MaterialLoader|WebGLRenderer|WebGL1Renderer)$/.test(key)) add('E_EXTERNAL_RESOURCE', `Resource loading/rendering ${key} is outside this contract.`, node);
      if (typeof key === 'string' && /^(?:addCollision|addCollider|collider|collision|physics|registerCollider|colliders|collisions)$/i.test(key)) add('E_COLLISION', `Collision API ${key} is forbidden.`, node);
      if (key === 'constructor' || key === '__proto__') add('E_GLOBAL', 'Constructor/prototype escape access is not supported in decor files.', node);
    }
    if (node.type === 'VariableDeclarator' && node.init?.name === 'Math' && node.id?.type === 'ObjectPattern') {
      for (const p of node.id.properties) if ((p.key?.name || p.key?.value) === 'random') add('E_RANDOM', 'Destructured Math.random is forbidden.', node);
    }
  });
  const defs = ast.body.filter(n => n.type === 'ExportDefaultDeclaration');
  const def = defs[0], fn = def?.declaration;
  if (defs.length !== 1 || fn?.type !== 'FunctionDeclaration' || fn.id?.name !== 'build' || fn.async || fn.generator || fn.params.length !== 1 || fn.params[0].type !== 'Identifier' || fn.params[0].name !== 'ctx') {
    issues.push(issue('E_EXPORT', 'Required exact signature: export default function build(ctx) { ... } (synchronous).'));
  }
  // Definite allocations in common update declarations are rejected in addition to runtime snapshots.
  // This is deliberately NOT a complete JS call-graph or allocation proof.
  const updateBodies = new Set();
  walk(ast, node => {
    if (node.type === 'Property' && (node.key?.name ?? node.key?.value) === 'update' && ['FunctionExpression','ArrowFunctionExpression'].includes(node.value?.type)) updateBodies.add(node.value.body);
    if (node.type === 'FunctionDeclaration' && node.id?.name === 'update') updateBodies.add(node.body);
    if (node.type === 'VariableDeclarator' && node.id?.name === 'update' && ['FunctionExpression','ArrowFunctionExpression'].includes(node.init?.type)) updateBodies.add(node.init.body);
  });
  for (const body of updateBodies) walk(body, node => {
    if (['NewExpression','ObjectExpression','ArrayExpression','FunctionExpression','ArrowFunctionExpression'].includes(node.type) || (node.type === 'CallExpression' && node.callee?.type === 'MemberExpression' && property(node.callee) === 'clone')) add('E_ANIMATION_ALLOC', 'Definite new/literal/function/clone allocation in update body; preallocate outside update.', node);
  });
  return { issues, def };
}

function makeContext(report) {
  const createdMeshes = new Set(), createdGeometry = new Set(), createdMaterial = new Set(), outlineMeshes = new Set(), signMeshes = new Set();
  const counts = { constructorCalls: 0, helperCalls: 0, signs: 0 };
  const errors = [];
  const fail = (code, message) => { errors.push(issue(code, message)); const error = new Error(`${code}: ${message}`); error.contractCode = code; throw error; };
  const finite = (value, name) => { if (typeof value !== 'number' || !Number.isFinite(value)) fail('E_FINITE', `${name} must be a finite number; got ${String(value)}.`); return value; };
  const positive = (value, name, allowZero = false) => { finite(value, name); if (allowZero ? value < 0 : value <= 0) fail('E_ARGUMENT', `${name} must be ${allowZero ? 'non-negative' : 'positive'}.`); return value; };
  const track = object => {
    if (object?.isMesh) createdMeshes.add(object);
    if (object?.isBufferGeometry) createdGeometry.add(object);
    if (object?.isMaterial) createdMaterial.add(object);
    return object;
  };
  const T = {};
  for (const [name, value] of Object.entries(THREE)) {
    if (typeof value !== 'function') { T[name] = value; continue; }
    const restricted = /Loader$|Renderer$/.test(name) || /^(?:Texture|CanvasTexture|VideoTexture|DataTexture|Data3DTexture|DataArrayTexture|CubeTexture|CompressedTexture|DepthTexture)$/.test(name);
    T[name] = new Proxy(value, {
      construct(target, args) {
        if (restricted) fail('E_EXTERNAL_RESOURCE', `${name} is not available; textures are owned by the production ctx.`);
        if (name === 'MeshStandardMaterial' || name === 'MeshPhysicalMaterial') fail('E_MATERIAL', `${name} is not permitted.`);
        counts.constructorCalls++;
        const object=Reflect.construct(target, args);
        for (const method of ['random','randomDirection']) if (typeof object?.[method] === 'function') object[method]=()=>fail('E_RANDOM', `${name}.${method} is forbidden.`);
        return track(object);
      },
      apply(target, that, args) {
        if (restricted) fail('E_EXTERNAL_RESOURCE', `${name} is not available.`);
        return Reflect.apply(target, that, args);
      }
    });
  }
  T.MathUtils = { ...THREE.MathUtils };
  for (const name of ['randInt', 'randFloat', 'randFloatSpread', 'seededRandom', 'generateUUID']) T.MathUtils[name] = () => fail('E_RANDOM', `THREE.MathUtils.${name} is unavailable; use deterministic geometry.`);
  Object.freeze(T.MathUtils); Object.freeze(T);
  const group = new THREE.Group();
  group.name = 'decor-test-root';
  group.position.set(17, 3, -11); group.rotation.y = Math.PI / 5;
  group.updateMatrix();
  const rootMatrix = group.matrix.elements.slice();
  const materials = new Map();
  const mat = color => {
    const key = String(color);
    if (!materials.has(key)) materials.set(key, track(new THREE.MeshToonMaterial({ color })));
    return materials.get(key);
  };
  const outlineMaterial = track(new THREE.MeshBasicMaterial({ color: '#2a2c4a', side: THREE.BackSide }));
  function options(value, accepted) {
    const o = value ?? {};
    if (typeof o !== 'object' || Array.isArray(o)) fail('E_ARGUMENT', 'Helper options must be an object.');
    for (const key of Object.keys(o)) if (!accepted.includes(key)) fail('E_CONTEXT', `Unsupported helper option ${key}.`);
    return o;
  }
  function mesh(geometry, color, x, y, z, o = {}, outlineMinSize = 0.01) {
    counts.helperCalls++;
    track(geometry);
    const m = track(new THREE.Mesh(geometry, mat(color)));
    m.position.set(finite(x, 'x'), finite(y, 'y'), finite(z, 'z'));
    m.rotation.set(finite(o.rx ?? 0, 'rx'), finite(o.ry ?? 0, 'ry'), finite(o.rz ?? 0, 'rz'));
    group.add(m);
    const out = o.out === true ? 0.03 : o.out === false ? 0 : o.out ?? 0;
    positive(out, 'out', true);
    if (out > 0) {
      geometry.computeBoundingBox();
      const size = geometry.boundingBox.getSize(new THREE.Vector3());
      const border = track(new THREE.Mesh(geometry, outlineMaterial));
      border.scale.set(1 + 2 * out / Math.max(size.x, outlineMinSize), 1 + 2 * out / Math.max(size.y, outlineMinSize), 1 + 2 * out / Math.max(size.z, outlineMinSize));
      m.add(border); outlineMeshes.add(border);
    }
    return m;
  }
  const segment = (seg, fallback = 8) => { const n = seg ?? fallback; finite(n, 'seg'); if (!Number.isInteger(n) || n < 3 || n > 4096) fail('E_ARGUMENT', 'seg must be an integer from 3 to 4096 (test guardrail).'); return n; };
  const ctx = {
    THREE: T, group, color: '#5278a5', mat,
    box(sx, sy, sz, color, x, y, z, opts) {
      return mesh(new THREE.BoxGeometry(positive(sx, 'sx'), positive(sy, 'sy'), positive(sz, 'sz')), color, x, y, z, options(opts, ['rx','ry','rz','out']), 0);
    },
    cyl(rTop, rBot, h, color, x, y, z, opts) {
      const o = options(opts, ['seg','rx','ry','rz','out']);
      return mesh(new THREE.CylinderGeometry(positive(rTop, 'rTop', true), positive(rBot, 'rBot', true), positive(h, 'h'), segment(o.seg)), color, x, y, z, o);
    },
    cone(r, h, color, x, y, z, opts) {
      const o = options(opts, ['seg','ry','out']);
      return mesh(new THREE.ConeGeometry(positive(r, 'r'), positive(h, 'h'), segment(o.seg)), color, x, y, z, o);
    },
    sphere(r, color, x, y, z, opts) {
      return mesh(new THREE.IcosahedronGeometry(positive(r, 'r'), 1), color, x, y, z, options(opts, ['out']));
    },
    torus(r, tube, color, x, y, z, opts) {
      const o = options(opts, ['arc','rx','ry']);
      const arc = positive(o.arc ?? Math.PI * 2, 'arc');
      return mesh(new THREE.TorusGeometry(positive(r, 'r'), positive(tube, 'tube'), 6, 16, arc), color, x, y, z, o);
    },
    sign(text, opts) {
      const o = options(opts, ['w','h','bg','fg','x','y','z','ry']);
      if (typeof text !== 'string') fail('E_ARGUMENT', 'sign text must be a string.');
      counts.signs++;
      const m = mesh(new THREE.PlaneGeometry(positive(o.w ?? 1, 'sign.w'), positive(o.h ?? 0.4, 'sign.h')), o.bg ?? '#ffffff', o.x ?? 0, o.y ?? 0, o.z ?? 0, { ry: o.ry });
      m.userData.testSign = { text, fg: o.fg ?? '#000000' }; signMeshes.add(m);
      return m;
    }
  };
  const proxy = new Proxy(Object.freeze(ctx), { get(target, key) {
    if (typeof key === 'string' && !(key in target)) fail(/collision|collider|physics/i.test(key) ? 'E_COLLISION' : 'E_CONTEXT', `ctx.${key} is outside the documented API.`);
    return Reflect.get(target, key);
  } });
  return { ctx: proxy, group, counts, createdMeshes, createdGeometry, createdMaterial, outlineMeshes, signMeshes, rootMatrix, errors, fail };
}

function inspect(state, stage, strictOutlineParts) {
  const issues = [], meshes = new Set(), geometries = new Set(), materials = new Set(), nodes = new Set();
  const edges = [], bounds = new THREE.Box3();
  let triangles = 0, outlineCount = 0, signMeshCount = 0;
  const add = (code, message) => issues.push(issue(code, message, { stage }));
  const allFinite = values => values.every(Number.isFinite);
  const root = state.group;
  if (root.matrixAutoUpdate) root.updateMatrix();
  if (!allFinite(root.matrix.elements) || root.matrix.elements.some((v, i) => Math.abs(v - state.rootMatrix[i]) > EPS)) add('E_ROOT_TRANSFORM', 'Do not move/rotate/scale ctx.group: the production caller owns its world transform.');
  const visit = (node, parentMatrix, ancestry) => {
    if (ancestry.has(node)) { add('E_GRAPH', 'Cycle in scene graph.'); return; }
    if (nodes.has(node)) { add('E_GRAPH', 'Scene node occurs more than once.'); return; }
    nodes.add(node); edges.push([node, node.parent]);
    const finiteTransform = allFinite([...node.position.toArray(), ...node.quaternion.toArray(), ...node.scale.toArray(), node.rotation.x, node.rotation.y, node.rotation.z]);
    if (!finiteTransform) add('E_FINITE', `Non-finite transform on ${node.type}.`);
    if (node.matrixAutoUpdate) node.updateMatrix();
    if (!allFinite(node.matrix.elements)) add('E_FINITE', `Non-finite matrix on ${node.type}.`);
    const relative = new THREE.Matrix4().multiplyMatrices(parentMatrix, node.matrix);
    if (node.isInstancedMesh || node.isSkinnedMesh || node.isLine || node.isPoints || node.isSprite) add('E_PRIMITIVE', `${node.type} needs a dedicated budget/bounds adapter and is not supported by this preflight.`);
    if (node.isMesh) {
      meshes.add(node);
      if (state.outlineMeshes.has(node)) outlineCount++;
      if (state.signMeshes.has(node) || node.userData?.testSign) signMeshCount++;
      const g = node.geometry;
      if (!g?.isBufferGeometry || !g.attributes.position) add('E_GEOMETRY', 'Mesh requires BufferGeometry with position attribute.');
      else {
        geometries.add(g);
        const pos = g.attributes.position;
        const index = g.getIndex();
        const vertexCount = index ? index.count : pos.count;
        if (!Number.isInteger(vertexCount / 3)) add('E_GEOMETRY', 'Triangle geometry index/vertex count must be divisible by 3.');
        triangles += vertexCount / 3;
        let valid = true;
        for (let i = 0; i < pos.count; i++) {
          const v = new THREE.Vector3().fromBufferAttribute(pos, i);
          if (![v.x,v.y,v.z].every(Number.isFinite)) { valid = false; break; }
          v.applyMatrix4(relative);
          if (![v.x,v.y,v.z].every(Number.isFinite)) { valid = false; break; }
          bounds.expandByPoint(v);
        }
        if (!valid) add('E_FINITE', 'Non-finite geometry coordinates or transformed vertices.');
        if (index) for (let i = 0; i < index.count; i++) {
          const v = index.getX(i);
          if (!Number.isInteger(v) || v < 0 || v >= pos.count) { add('E_GEOMETRY', 'Invalid geometry index.'); break; }
        }
      }
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of mats) {
        if (!material?.isMaterial) { add('E_MATERIAL', 'Mesh material is missing or invalid.'); continue; }
        materials.add(material);
        if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) add('E_MATERIAL', 'Standard/Physical material is forbidden.');
        for (const value of Object.values(material)) if (value?.isTexture) add('E_TEXTURE', 'Decor-owned texture maps are not supported; production ctx owns sign textures.');
      }
    }
    const next = new Set(ancestry); next.add(node);
    for (const child of node.children) {
      if (child.parent !== node) add('E_GRAPH', 'Child.parent does not match its container.');
      visit(child, relative, next);
    }
  };
  for (const child of root.children) visit(child, new THREE.Matrix4(), new Set([root]));
  for (const m of state.createdMeshes) if (!meshes.has(m)) add('E_ORPHAN', 'Every constructed Mesh must remain under ctx.group (detached/invisible spare meshes are not accepted).');
  const mainParts = meshes.size - outlineCount;
  const budgetParts = strictOutlineParts ? meshes.size : mainParts;
  if (budgetParts > LIMITS.parts) add('E_PARTS', `${budgetParts} budgeted parts exceeds ${LIMITS.parts}.`);
  if (triangles > LIMITS.triangles) add('E_TRIANGLES', `${triangles} triangles including outlines exceeds ${LIMITS.triangles}.`);
  const budgetSigns = Math.max(state.counts.signs, signMeshCount);
  if (budgetSigns > LIMITS.signs) add('E_SIGNS', `${budgetSigns} signs (max of calls and attached marked sign meshes) exceeds ${LIMITS.signs}.`);
  if (!bounds.isEmpty()) {
    const lo = bounds.min.toArray(), hi = bounds.max.toArray();
    if (lo.some((n,i) => n < LIMITS.min[i] - EPS) || hi.some((n,i) => n > LIMITS.max[i] + EPS)) add('E_BOUNDS', `Group-local bounds ${JSON.stringify({ min: lo, max: hi })} exceed the allowed envelope (outlines included).`);
  }
  return {
    issues, meshes, geometries, materials, nodes, edges,
    metrics: { mainParts, totalMeshes: meshes.size, outlineMeshes: outlineCount, budgetParts, triangles, signs: budgetSigns, signCalls: state.counts.signs, signMeshes: signMeshCount, helperCalls: state.counts.helperCalls, geometries: geometries.size, materials: materials.size, children: nodes.size, bounds: bounds.isEmpty() ? null : { min: bounds.min.toArray(), max: bounds.max.toArray() } }
  };
}
function sameSet(a,b) { return a.size === b.size && [...a].every(x => b.has(x)); }
function returnCheck(result) {
  const errors = [];
  if (!result || typeof result !== 'object' || Array.isArray(result) || typeof result.then === 'function') return [issue('E_RETURN', 'build(ctx) must return an object, not undefined, an array or a Promise.')];
  for (const key of Object.keys(result)) if (!['hideCanopy','hideCounter','update'].includes(key)) errors.push(issue('E_RETURN', `Unsupported result key ${key}.`));
  for (const key of ['hideCanopy','hideCounter']) if (result[key] !== undefined && typeof result[key] !== 'boolean') errors.push(issue('E_RETURN', `${key} must be boolean when provided.`));
  if (result.update !== undefined && typeof result.update !== 'function') errors.push(issue('E_RETURN', 'update must be a function when provided.'));
  return errors;
}
export function auditSource(source, filename = '<inline>', options = {}) {
  const report = { file: filename, status: 'fail', issues: [], metrics: null, updateFrames: 0 };
  const pre = staticCheck(source);
  report.issues.push(...pre.issues);
  if (report.issues.length) return report;
  const state = makeContext(report);
  const sandbox = vm.createContext({ __ctx: state.ctx }, { codeGeneration: { strings: false, wasm: false }, microtaskMode: 'afterEvaluate' });
  const execute = (text, label = filename) => new vm.Script(text, { filename: label }).runInContext(sandbox, { timeout: options.timeoutMs ?? 1000 });
  try {
    execute('Math.random = () => { throw new Error("E_RANDOM: Math.random is forbidden"); }; Object.freeze(Math);');
    const rewritten = source.slice(0, pre.def.start) + source.slice(pre.def.declaration.start);
    execute(`"use strict";\n${rewritten}\n;globalThis.__build = build;`);
    execute('globalThis.__result = __build(__ctx);');
    const result = sandbox.__result;
    report.issues.push(...returnCheck(result));
    let first = inspect(state, 'build', options.strictOutlineParts);
    report.issues.push(...first.issues); report.metrics = first.metrics;
    const baseline = { ...state.counts, geometry: state.createdGeometry.size, material: state.createdMaterial.size, meshes: state.createdMeshes.size };
    if (!report.issues.length && typeof result.update === 'function') {
      const frames = options.frames ?? 120;
      for (let frame = 1; frame <= frames; frame++) {
        sandbox.__dt = [1/60, 1/30, 0.1][(frame - 1) % 3];
        execute('globalThis.__updateReturn = __result.update(__dt);');
        report.updateFrames = frame;
        if (sandbox.__updateReturn !== undefined) report.issues.push(issue('E_UPDATE_RETURN', 'update(dt) must return void (async updates are not supported).', { stage: `update:${frame}` }));
        const current = inspect(state, `update:${frame}`, options.strictOutlineParts);
        report.issues.push(...current.issues); report.metrics = current.metrics;
        if (state.counts.constructorCalls !== baseline.constructorCalls || state.counts.helperCalls !== baseline.helperCalls || state.createdGeometry.size !== baseline.geometry || state.createdMaterial.size !== baseline.material || state.createdMeshes.size !== baseline.meshes) report.issues.push(issue('E_ANIMATION_ALLOC', 'update allocated through a ctx THREE constructor/helper/material path.', { stage: `update:${frame}` }));
        if (!sameSet(first.meshes,current.meshes) || !sameSet(first.geometries,current.geometries) || !sameSet(first.materials,current.materials) || !sameSet(first.nodes,current.nodes) || first.edges.some(([node,parent]) => node.parent !== parent)) report.issues.push(issue('E_ANIMATION_STRUCTURE', 'Geometry/material/scene-node identities or parenting changed after update.', { stage: `update:${frame}` }));
        if (report.issues.length) break;
      }
    }
  } catch (error) {
    const message = String(error?.message || error);
    report.issues.push(issue(error.contractCode || (/E_RANDOM/.test(message) ? 'E_RANDOM' : /timed out/.test(message) ? 'E_TIMEOUT' : 'E_RUNTIME'), message));
  }
  report.issues.push(...state.errors);
  // Collapse duplicate reports raised by the same guard and catch path.
  report.issues = [...new Map(report.issues.map(e => [`${e.code}:${e.stage ?? ''}:${e.message}`, e])).values()];
  report.status = report.issues.length ? 'fail' : 'pass';
  return report;
}

const wrap = body => `export default function build(ctx) { ${body} }`;
export const FIXTURES = [
  { name: 'positive-all-helpers', source: wrap(`
    const c=ctx.color;
    ctx.box(.4,.4,.4,c,0,.3,0,{out:.03});
    ctx.cyl(.15,.2,.3,c,-.7,.25,0,{seg:8,rx:0,ry:0,rz:0});
    ctx.cone(.15,.3,c,.7,.25,0,{seg:8,ry:0});
    ctx.sphere(.15,c,0,.8,0); ctx.torus(.2,.04,c,0,1.3,0,{arc:Math.PI*2,rx:0,ry:0});
    ctx.sign('import Math.random is harmless text',{w:.6,h:.2,x:0,y:2,z:.4,bg:c,fg:'#fff',ry:0});
    return {hideCanopy:true,hideCounter:false};`) },
  { name: 'positive-stable-update', source: wrap(`const m=ctx.box(.2,.2,.2,ctx.color,0,.5,0); let t=0; return {update(dt){t+=dt;m.position.x=.2*Math.sin(t);m.rotation.y=t;}};`) },
  { name: 'positive-exact-local-boundary', source: wrap(`ctx.box(2.9,4.5,2.9,ctx.color,0,2.25,0);return {};`) },
  { name: 'positive-twenty-outline-parts', source: wrap(`for(let i=0;i<20;i++)ctx.box(.04,.04,.04,ctx.color,0,.5+i*.1,0,{out:.03});return {};`) },
  { name: 'negative-bounds', code: 'E_BOUNDS', source: wrap(`ctx.box(.2,.2,.2,ctx.color,1.5,.5,0);return {};`) },
  { name: 'negative-rotated-bounds', code: 'E_BOUNDS', source: wrap(`ctx.box(.2,.2,2.5,ctx.color,1,.5,0,{ry:Math.PI/2});return {};`) },
  { name: 'negative-outline-bounds', code: 'E_BOUNDS', source: wrap(`ctx.box(.2,.2,.2,ctx.color,0,.5,1.34,{out:.03});return {};`) },
  { name: 'negative-tiny-box-outline', code: 'E_BOUNDS', source: wrap(`ctx.box(.001,.001,.001,ctx.color,0,1,1.43,{out:.03});return {};`) },
  { name: 'negative-parts', code: 'E_PARTS', source: wrap(`for(let i=0;i<21;i++)ctx.box(.05,.05,.05,ctx.color,0,.2,0);return {};`) },
  { name: 'negative-cloned-parts', code: 'E_PARTS', source: wrap(`const m=ctx.box(.05,.05,.05,ctx.color,0,.2,0);for(let i=0;i<20;i++)ctx.group.add(m.clone());return {};`) },
  { name: 'negative-triangles', code: 'E_TRIANGLES', source: wrap(`const {THREE,group}=ctx; const m=new THREE.Mesh(new THREE.SphereGeometry(.2,48,24),ctx.mat(ctx.color));m.position.y=1;group.add(m);return {};`) },
  { name: 'negative-outline-triangles', code: 'E_TRIANGLES', source: wrap(`for(let i=0;i<13;i++)ctx.sphere(.1,ctx.color,0,1,0,{out:.03});return {};`) },
  { name: 'negative-signs', code: 'E_SIGNS', source: wrap(`for(let i=0;i<3;i++)ctx.sign('x',{w:.2,h:.2,y:1});return {};`) },
  { name: 'negative-cloned-signs', code: 'E_SIGNS', source: wrap(`const m=ctx.sign('A',{w:.2,h:.2,y:1});ctx.group.add(m.clone(),m.clone());return {};`) },
  { name: 'negative-static-import', code: 'E_IMPORT', source: `import x from './other.js';${wrap('return {};')}` },
  { name: 'negative-dynamic-import', code: 'E_IMPORT', source: wrap(`if(false) import('./other.js');return {};`) },
  { name: 'negative-random', code: 'E_RANDOM', source: wrap(`if(false)Math.random();return {};`) },
  { name: 'negative-computed-random', code: 'E_RANDOM', source: wrap(`Math['random']();return {};`) },
  { name: 'negative-aliased-random', code: 'E_RANDOM', source: wrap(`const M=Math;M['ran'+'dom']();return {};`) },
  { name: 'negative-vector-random', code: 'E_RANDOM', source: wrap(`new ctx.THREE.Vector3().random();return {};`) },
  { name: 'negative-vector-random-direction', code: 'E_RANDOM', source: wrap(`new ctx.THREE.Vector3().randomDirection();return {};`) },
  { name: 'negative-uuid-random', code: 'E_RANDOM', source: wrap(`ctx.THREE.MathUtils.generateUUID();return {};`) },
  { name: 'negative-nan-option', code: 'E_FINITE', source: wrap(`ctx.box(.2,.2,.2,ctx.color,0,.5,0,{rx:NaN});return {};`) },
  { name: 'negative-nan-position', code: 'E_FINITE', source: wrap(`ctx.box(.2,.2,.2,ctx.color,0,.5,0).position.x=NaN;return {};`) },
  { name: 'negative-nan-scale', code: 'E_FINITE', source: wrap(`ctx.box(.2,.2,.2,ctx.color,0,.5,0).scale.y=Infinity;return {};`) },
  { name: 'negative-nan-geometry', code: 'E_FINITE', source: wrap(`ctx.box(.2,.2,.2,ctx.color,0,.5,0).geometry.attributes.position.setX(0,NaN);return {};`) },
  { name: 'negative-orphan', code: 'E_ORPHAN', source: wrap(`new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(.2,.2,.2),ctx.mat(ctx.color));return {};`) },
  { name: 'negative-standard-material', code: 'E_MATERIAL', source: wrap(`new ctx.THREE.MeshStandardMaterial();return {};`) },
  { name: 'negative-external-texture', code: 'E_EXTERNAL_RESOURCE', source: wrap(`new ctx.THREE.TextureLoader().load('https://invalid.example/texture.png');return {};`) },
  { name: 'negative-collision', code: 'E_COLLISION', source: wrap(`ctx.addCollision({});return {};`) },
  { name: 'negative-return', code: 'E_RETURN', source: wrap(`return {hideCanopy:1};`) },
  { name: 'negative-update-bounds', code: 'E_BOUNDS', source: wrap(`const m=ctx.box(.2,.2,.2,ctx.color,0,.5,0);return {update(dt){m.position.x+=100*dt;}};`) },
  { name: 'negative-update-helper-allocation', code: 'E_ANIMATION_ALLOC', source: wrap(`return {update(dt){ctx.box(.1,.1,.1,ctx.color,0,.5,0);}};`) },
  { name: 'negative-update-constructor-allocation', code: 'E_ANIMATION_ALLOC', source: wrap(`return {update(dt){new ctx.THREE.Vector3();}};`) },
  { name: 'negative-update-replace-geometry', code: 'E_ANIMATION_STRUCTURE', source: wrap(`const m=ctx.box(.2,.2,.2,ctx.color,0,.5,0); const spare=new ctx.THREE.BoxGeometry(.3,.3,.3);return {update(dt){m.geometry=spare;}};`) },
  { name: 'negative-update-clone', code: 'E_ANIMATION_ALLOC', source: wrap(`const m=ctx.box(.2,.2,.2,ctx.color,0,.5,0);return {update(dt){ctx.group.add(m.clone());}};`) },
  { name: 'negative-update-temporary-clone', code: 'E_ANIMATION_ALLOC', source: wrap(`const m=ctx.box(.2,.2,.2,ctx.color,0,.5,0);return {update(dt){m.position.clone();}};`) },
  { name: 'negative-root-transform', code: 'E_ROOT_TRANSFORM', source: wrap(`ctx.group.rotation.y=0;return {};`) },
  { name: 'negative-timeout', code: 'E_TIMEOUT', source: wrap(`while(true){} return {};`), timeoutMs: 30 }
];
export function runSelfTests() {
  const cases = FIXTURES.map(f => {
    const result = auditSource(f.source, `fixture:${f.name}`, { timeoutMs: f.timeoutMs ?? 1000 });
    const ok = f.code ? result.issues.some(e => e.code === f.code) : result.status === 'pass';
    return { name: f.name, status: ok ? 'pass' : 'fail', expected: f.code ?? 'pass', detected: [...new Set(result.issues.map(e => e.code))], ...(ok ? {} : { result }) };
  });
  const strict = auditSource(FIXTURES.find(f=>f.name==='positive-twenty-outline-parts').source, 'fixture:strict-outline-parts', { strictOutlineParts:true });
  cases.push({ name:'strict-outline-parts-opt-in', status:strict.issues.some(e=>e.code==='E_PARTS')?'pass':'fail', expected:'E_PARTS', detected:strict.issues.map(e=>e.code) });
  return { status: cases.every(c => c.status === 'pass') ? 'pass' : 'fail', passed: cases.filter(c => c.status === 'pass').length, total: cases.length, cases };
}
function collect(target, files, missing) {
  if (!fs.existsSync(target)) { missing.push(target); return; }
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || /^(?:node_modules|fixtures|\.git|decor-tools)$/.test(entry.name)) continue;
      collect(path.join(target, entry.name), files, missing);
    }
  } else if (stat.isFile() && /\.(?:mjs|js)$/.test(target) && !/\.(?:test|spec)\.[mc]?js$/.test(target) && path.resolve(target) !== SELF) files.add(path.resolve(target));
}
export function main(args = process.argv.slice(2)) {
  const selfOnly = args.includes('--self-test'), strictOutlineParts = args.includes('--strict-outline-parts');
  const unknown = args.filter(a => a.startsWith('--') && !['--self-test','--strict-outline-parts','--write-fixtures','--help'].includes(a));
  if (unknown.length) throw new Error(`Unknown options: ${unknown.join(', ')}`);
  if (args.includes('--help')) { console.log('Usage: node baozhong-decor.test.mjs [--self-test] [--strict-outline-parts] [files/directories]\nDECOR_DIR selects production modules; DECOR_DEPS_ROOT selects installed dependencies.\nExit: 0=selected tests passed, 1=failure, 2=no-production-modules.\n--self-test deliberately tests fixtures only; --write-fixtures writes inspectable fixture files next to this tool.'); return 0; }
  if (args.includes('--write-fixtures')) {
    const dir = path.join(path.dirname(SELF), 'fixtures'); fs.mkdirSync(dir, { recursive: true });
    for (const f of FIXTURES) fs.writeFileSync(path.join(dir, `${f.name}.mjs`), `// TEST FIXTURE ONLY. Expected: ${f.code ?? 'pass'}. Not production art.\n${f.source}\n`);
  }
  const selfTests = runSelfTests();
  const files = new Set(), missing = [];
  const input = args.filter(a => !a.startsWith('--'));
  if (!selfOnly) for (const target of input.length ? input : [process.env.DECOR_DIR ?? path.join(process.cwd(), 'src', 'systems', 'baozhong', 'decor')]) collect(path.resolve(target), files, missing);
  const reports = [...files].sort().map(file => auditSource(fs.readFileSync(file,'utf8'), file, { strictOutlineParts }));
  const productionStatus = !reports.length ? 'no-production-modules' : reports.every(r => r.status === 'pass') && !missing.length ? 'pass' : 'fail';
  const summary = {
    tool: 'T059 baozhong-decor contract preflight', model: MODEL, limits: LIMITS,
    mode: selfOnly ? 'self-test-only' : 'production-preflight',
    selfTests,
    production: { status: productionStatus, tested: reports.length, missingInputs: missing, reports },
    note: 'Fixtures validate the checker only. A fixture pass is NEVER a production-art pass. Production ctx/rendering integration remains unverified.'
  };
  console.log(JSON.stringify(summary,null,2));
  if (selfTests.status !== 'pass' || productionStatus === 'fail') return 1;
  return selfOnly ? 0 : reports.length ? 0 : 2;
}
if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  try { process.exitCode = main(); } catch (error) { console.error(JSON.stringify({status:'tool-error',message:error.message})); process.exitCode = 1; }
}
