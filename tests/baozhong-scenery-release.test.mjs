import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const s=fs.readFileSync(new URL('../src/systems/baozhong/index.js',import.meta.url),'utf8');
test('released scenery is independent from experimental department content and matching',()=>{
 assert.match(s,/const SCENERY = true/);
 assert.match(s,/openCanopyD26: SCENERY, landmarkPreview: SCENERY/);
 assert.match(s,/state, enabled: SCENERY/);
 assert.match(s,/if \(SCENERY && LANDMARK_PREVIEW_IDS/);
 assert.match(s,/if \(SCENERY\) \{\s*try \{ activitySign/);
 assert.match(s,/const SLICE = new URLSearchParams\(location.search\).get\('bz26slice'\) === '1'/);
 assert.match(s,/if \(SLICE && id === 'D26'\)/);
 assert.match(s,/say\(t.title, SLICE \? \(departmentIntro/);
});

test('normal and legacy preview query flags remain independent',()=>{
 const expr=s.match(/const SLICE = (.*);/)[1];
 const read=search=>Function('location',`return ${expr}`)({search});
 assert.equal(read(''),false);assert.equal(read('?debug'),false);assert.equal(read('?bz26slice=1&debug'),true);assert.equal(read('?bz26slice=0'),false);
});
