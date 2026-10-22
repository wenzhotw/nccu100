import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { LEARNING_SCENARIOS, SCENARIO_NOTICE } from '../src/systems/baozhong/learning-scenarios.js';

const research = JSON.parse(await readFile(new URL('../src/systems/baozhong/booth-browser-data.json', import.meta.url), 'utf8'));

test('learning scenarios cover exactly all 37 researched department IDs', () => {
  const expected = Array.from({ length: 37 }, (_, index) => `D${String(index + 1).padStart(2, '0')}`);
  assert.deepEqual(Object.keys(LEARNING_SCENARIOS).sort(), expected);
  assert.deepEqual(research.departments.map(({ id }) => id).sort(), expected);
});

test('all scenarios share an explicit authored-example notice', () => {
  assert.equal(SCENARIO_NOTICE, '以下為幫助想像學習方式的設計示例，不是官方必修課程或作業要求。');
});

test('each scenario has concise plain-text fields and a reflection question', () => {
  const limits = { title: 22, task: 100, output: 55, reflection: 65 };
  const titles = new Set();
  for (const [id, scenario] of Object.entries(LEARNING_SCENARIOS)) {
    assert.deepEqual(Object.keys(scenario).sort(), Object.keys(limits).sort(), `${id}: field contract`);
    for (const [field, limit] of Object.entries(limits)) {
      const text = scenario[field];
      assert.equal(typeof text, 'string', `${id}.${field}: string`);
      assert.equal(text.trim(), text, `${id}.${field}: no stray whitespace`);
      assert.ok([...text].length >= 5 && [...text].length <= limit, `${id}.${field}: readable length`);
      assert.match(text, /[\u3400-\u9fff]/u, `${id}.${field}: Chinese text`);
      assert.doesNotMatch(text, /[<>`\n]|https?:\/\//u, `${id}.${field}: plain text, not markup`);
      assert.doesNotMatch(text, /官方要求|必修作業|保證錄取|保證就業|取得證照|校友|即時新聞/u, `${id}.${field}: no unsupported claims`);
    }
    assert.ok(scenario.reflection.endsWith('？'), `${id}: reflection invites thought`);
    assert.ok(!titles.has(scenario.title), `${id}: distinct scenario title`);
    titles.add(scenario.title);
  }
});
