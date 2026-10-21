import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const raw = readFileSync(new URL('../src/systems/baozhong/booth-browser-data.json', import.meta.url), 'utf8');
const data = JSON.parse(raw);
const booths = data.departments;
const byId = Object.fromEntries(booths.map(d => [d.id, d]));
const groups = [...new Map(booths.flatMap(d => d.admissionsGroups).map(g => [g.code, g])).values()];
const group = code => groups.find(g => g.code === code);

function walk(value, visit) {
  if (Array.isArray(value)) value.forEach(v => walk(v, visit));
  else if (value && typeof value === 'object') {
    visit(value);
    Object.values(value).forEach(v => walk(v, visit));
  }
}

test('37 unique booths retain full courses, careers, admissions, and portfolio content', () => {
  assert.deepEqual(booths.map(d => d.id), Array.from({length: 37}, (_, i) => 'D' + String(i + 1).padStart(2, '0')));
  assert.equal(groups.length, 45);
  for (const d of booths) {
    assert.ok(d.name && /^C\d{2}$/.test(d.college) && d.intro);
    assert.ok(d.courses.length >= 4 && d.careers.length >= 4, d.id);
    assert.equal(new Set(d.courses).size, d.courses.length);
    assert.ok(d.careers.every(c => c.name && ['official', 'derived'].includes(c.basis)));
    assert.ok(d.admissionsGroups.length && d.sources.length);
    assert.equal(d.portfolio.year, 115);
    for (const key of ['officialFocus', 'advice', 'requirements', 'groupDifferences', 'limitations']) assert.ok(d.portfolio[key], d.id + key);
  }
});

test('public data contains no private evidence, paths, or malformed source titles', () => {
  assert.doesNotMatch(raw, /evidenceFile|localEvidence|\/workspace\/|\/tmp\/|\/home\/|agent_notes|dream_notes|verification|\bfile:\/\//i);
  assert.doesNotMatch(raw, /[\u0080-\u009f]/);
  let count = 0;
  walk(data, value => {
    if (!value.publicURL) return;
    count++;
    assert.deepEqual(Object.keys(value).sort(), ['checkedAt', 'publicURL', 'title', 'year']);
    const url = new URL(value.publicURL);
    assert.equal(url.protocol, 'https:');
    assert.ok(url.hostname === 'nccu.edu.tw' || url.hostname.endsWith('.nccu.edu.tw') || ['www.cac.edu.tw', 'collego.edu.tw'].includes(url.hostname), url.hostname);
    assert.ok(value.title && value.year && value.checkedAt);
  });
  assert.ok(count >= 100);
});

test('115 historical first-stage results never become admission scores or second-stage weights', () => {
  assert.match(data.notices.admissions, /115.*歷史.*不是最低錄取分數.*不是116/);
  for (const g of groups) {
    assert.equal(g.year, 115);
    assert.equal(g.sameScoreThreshold, null);
    assert.match(g.secondStageNote, /未核實.*倍率不是總成績加權/);
    assert.match(g.sameScoreNote, /不公布.*無星號不代表/);
    assert.equal(g.screeningSteps.length, g.screeningResultsInOrder.length);
    assert.deepEqual(g.screeningSteps.map(s => s.rawTranscription), g.screeningResultsInOrder);
    assert.ok(g.screeningSteps.every(s => s.minimumPassedScore > 0 && s.ratio > 0));
    assert.equal('secondStageWeighting' in g, false);
  }
});

test('communication booths share exactly two real college-entry groups', () => {
  const codes = ['006242', '006252'];
  for (const id of ['D19','D20','D21','D22']) assert.deepEqual(byId[id].admissionsGroups.map(g => g.code), codes);
  for (const id of ['D19','D20','D21']) assert.equal(byId[id].admissionsMapping.status, 'shared_college_entry');
  assert.equal(byId.D22.admissionsMapping.status, 'direct');
});

test('math alternative is threshold-only, combined subjects and APCS are preserved', () => {
  const alternatives = groups.filter(g => g.thresholdLogic.mathAorB === 'either_one_passes');
  assert.equal(alternatives.length, 5);
  for (const g of alternatives) assert.match(g.thresholdLogic.note, /不能.*倍率採計任選/);
  assert.equal(byId.D08.admissionsGroups.length, 3);
  assert.equal(byId.D14.admissionsGroups.length, 2);
  assert.deepEqual(group('006092').screeningResultsInOrder, ['國文13', '英文+數學A22', '國英數A社49']);
  const apcs = group('006432');
  assert.deepEqual(apcs.apcs.thresholds, {'程式設計觀念題(識讀)': 4, '程式設計實作題': 3});
  assert.equal(apcs.apcs.ratios['程式設計實作題'], 5);
  assert.equal(apcs.screeningSteps[1].unit, 'APCS級別');
  assert.equal(apcs.screeningSteps[1].minimumPassedScore, 3);
  assert.equal(group('006402').ratios['自然'], null);
});

test('missing alumni remain explicit, real alumni retain degree and time qualifications', () => {
  assert.deepEqual(booths.filter(d => !d.alumni.length).map(d => d.id), ['D22','D30','D36']);
  for (const d of booths) {
    if (!d.alumni.length) assert.match(d.missingAlumni, /暫缺不代表沒有校友/);
    else {
      assert.equal(d.missingAlumni, null);
      for (const a of d.alumni) {
        for (const key of ['name','affiliation','career','degreeLevel','note']) assert.ok(a[key]);
        assert.ok(a.sources.length);
        assert.match(a.note, /來源發表時/);
      }
    }
  }
  assert.match(data.notices.alumni, /不表示目前仍在任/);
  assert.match(byId.D26.alumni[0].affiliation, /非政大碩士/);
});
