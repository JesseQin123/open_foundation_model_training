import assert from 'node:assert/strict';

const statuses = ['confirmed', 'planned', 'experimental', 'inference', 'unknown'];
function date(value) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10), value);
  return value;
}
function english(value) {
  assert.equal(typeof value?.en, 'string', 'English text is required');
  assert.ok(value.en.trim(), 'English text must not be empty');
}

export function validateResearch(research) {
  date(research.snapshot);
  assert.equal(research.coverageStart, '2026-08-29');
  assert.equal(research.language, 'en');
  assert.ok(research.snapshot >= research.coverageStart);
  assert.equal(new Set(research.sources.map(s => s.id)).size, research.sources.length, 'Duplicate source ID');
  assert.equal(new Set(research.sources.map(s => s.url)).size, research.sources.length, 'Duplicate source URL');
  const sources = new Map(research.sources.map(s => [s.id, s]));
  for (const s of research.sources) {
    assert.match(s.id, /^M[1-9]\d*$/);
    assert.ok(s.title?.trim());
    assert.ok(['issue', 'pr', 'report', 'standup', 'code', 'web'].includes(s.kind));
    assert.equal(new URL(s.url).protocol, 'https:');
  }
  const checkSources = entry => {
    assert.ok(entry.sourceIds?.length, 'Evidence sources are required');
    for (const id of entry.sourceIds) assert.ok(sources.has(id), `Unknown source ${id}`);
  };
  assert.ok(research.updates.length);
  assert.equal(new Set(research.updates.map(u => u.id)).size, research.updates.length, 'Duplicate entry ID');
  const conclusions = new Set();
  let previous = research.snapshot;
  for (const u of research.updates) {
    assert.match(u.id, /^event-[a-z0-9-]+$/);
    date(u.date);
    assert.ok(u.date <= previous, `Updates must be newest first: ${u.date}`);
    previous = u.date;
    assert.ok(statuses.includes(u.status));
    english(u.title); english(u.detail); checkSources(u);
    const conclusion = `${u.date}:${u.title.en.trim().toLowerCase()}`;
    assert.ok(!conclusions.has(conclusion), 'Duplicate daily conclusion');
    conclusions.add(conclusion);
    assert.ok(['imported', 'reviewed'].includes(u.reviewStatus));
    if (u.reviewStatus === 'imported') {
      assert.ok(u.date <= research.importedThrough, 'New records cannot be marked as imported history');
    } else {
      assert.ok(Number.isFinite(Date.parse(u.checkedAt)), 'Record when sources were checked');
      assert.ok(u.checkedAt.slice(0, 10) >= u.date, 'A historical entry cannot be checked before its date');
      english(u.concept); english(u.exercise);
    }
    if (u.productionChange) {
      assert.equal(u.status, 'confirmed');
      assert.ok(u.productionEvidenceIds?.length, 'Production changes need explicit launch/handoff evidence');
      for (const id of u.productionEvidenceIds) assert.ok(u.sourceIds.includes(id), 'Production evidence must be cited');
    }
  }
  assert.equal(research.updates[0].date, research.snapshot);
  const days = new Set(research.updates.map(u => u.date));
  for (let cursor = new Date(`${research.coverageStart}T00:00:00Z`); cursor.toISOString().slice(0, 10) <= research.snapshot; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    assert.ok(days.has(cursor.toISOString().slice(0, 10)), `Missing research day: ${cursor.toISOString().slice(0, 10)}`);
  }
  assert.deepEqual(research.claimGroups.map(g => g.status).sort(), [...statuses].sort());
  for (const g of research.claimGroups) {
    assert.ok(g.facts.en.length);
    for (const fact of g.facts.en) english({ en: fact });
    checkSources(g);
  }
}
