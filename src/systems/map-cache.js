/**
 * 小地圖的單份底圖快取。只有圖示、字型或尺寸改變才重畫底圖，
 * 秘寶狀態改變只重組標記。只保留一張底圖與目前輸出，避免尺寸快取無限成長。
 */
const shapeFields = ['x', 'z', 'w', 'd', 'color', 'label', 'dy', 'draw'];

export function createMapCache({ createCanvas, drawBase, drawDetails }) {
  let base = null, baseStyle, target = null, shapesRef = null;
  let savedShapes = [], savedCrystals = [];
  let mapRevision, fontRevision, haveMap;
  let baseRedraws = 0, compositeRedraws = 0;

  function sameShapes(shapes) {
    if (shapes !== shapesRef || shapes.length !== savedShapes.length) return false;
    return shapes.every((shape, i) => {
      const saved = savedShapes[i];
      return shape === saved.ref && shapeFields.every(key => Object.is(shape[key], saved[key]));
    });
  }

  function sameCrystals(crystals) {
    return crystals.length === savedCrystals.length && crystals.every((crystal, i) => {
      const saved = savedCrystals[i];
      return crystal === saved.ref && crystal.got === saved.got &&
        crystal.mapAt.x === saved.x && crystal.mapAt.z === saved.z;
    });
  }

  function update(canvas, input) {
    const { shapes, crystals } = input;
    const baseDirty = !base || base.width !== canvas.width || base.height !== canvas.height ||
      mapRevision !== input.mapRevision || fontRevision !== input.fontRevision || !sameShapes(shapes);
    const detailsDirty = baseDirty || target !== canvas || haveMap !== input.haveMap || !sameCrystals(crystals);
    if (!detailsDirty) return false;

    if (baseDirty) {
      if (!base) base = createCanvas();
      if (base.width !== canvas.width) base.width = canvas.width;
      if (base.height !== canvas.height) base.height = canvas.height;
      baseStyle = drawBase(base, shapes);
      shapesRef = shapes;
      savedShapes = shapes.map(shape => ({ ref: shape, ...Object.fromEntries(shapeFields.map(key => [key, shape[key]])) }));
      mapRevision = input.mapRevision;
      fontRevision = input.fontRevision;
      baseRedraws++;
    }
    canvas.getContext('2d').drawImage(base, 0, 0);
    // 羅盤與外框仍在秘寶標記上方，避免與完整地圖的覆蓋順序不同。
    drawDetails(canvas, { haveMap: input.haveMap, crystals, baseStyle });
    savedCrystals = crystals.map(crystal => ({ ref: crystal, got: crystal.got, x: crystal.mapAt.x, z: crystal.mapAt.z }));
    haveMap = input.haveMap;
    target = canvas;
    compositeRedraws++;
    return true;
  }

  function stats() {
    return { baseRedraws, compositeRedraws, width: base?.width || 0, height: base?.height || 0 };
  }
  return { update, stats };
}
