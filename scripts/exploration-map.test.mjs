import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { activityGuideModel } from '../src/systems/baozhong/activity-guide-model.js';
import { guideScene } from '../src/systems/baozhong/activity-guide-scene.js';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const layout = read('../src/systems/baozhong/layout.json'), content = read('../src/content/baozhong.json');
test('only supplied valid map entries receive favorite stars; physical sign defaults unchanged', () => {
 const model = activityGuideModel(layout, content);
 const normal = guideScene(model,1000,700);
 assert.equal(normal.filter(c=>c.attrs['data-favorite-id']).length,0);
 const starred = guideScene(model,1000,700,{favoriteIds:new Set(['D01','D37','not-a-department'])});
 assert.deepEqual(starred.filter(c=>c.attrs['data-favorite-id']).map(c=>c.attrs['data-favorite-id']),['D01','D37']);
 assert.deepEqual(starred.filter(c=>!c.attrs['data-favorite-id']),normal);
 for(const marker of starred.filter(c=>c.attrs['data-favorite-id'])){assert.equal(marker.text,'★');assert.equal(marker.attrs['pointer-events'],'none');}
});
