/**
 * The guard-rails from Phase 3 §4.2. Six of the nine agent prohibitions are structural,
 * and these tests are what make that claim true rather than aspirational.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { P, cleanup, makeWorkspace, node } from './helper.js';
import { load } from '../src/core/load.js';
import { Refused, accept, allocateId, link, newNode } from '../src/core/mutate.js';

after(cleanup);

const AGENT = { agent: 'product-discovery' };

function ws(files: Record<string, string> = {}) {
  return load(makeWorkspace(files));
}

test('refuses epistemic: fact without evidence', () => {
  assert.throws(
    () => newNode(ws(), { kind: 'NEED', title: 'x', epistemic: 'fact' }, AGENT),
    (e: Error) => e instanceof Refused && /fact and no evidence/.test(e.message),
  );
});

test('refuses to create an orphan', () => {
  // product-manager IS permitted to write US, so the orphan guard is what fires here.
  assert.throws(
    () => newNode(ws(), { kind: 'US', title: 'x' }, { agent: 'product-manager' }),
    (e: Error) => e instanceof Refused && /orphan/.test(e.message),
  );
});

test('agents cannot accept nodes — only a human decides what is real', () => {
  const w = ws({ [P.need('NEED-001')]: node('NEED-001', 'NEED', { who: 'x', status: 'draft' }) });
  assert.throws(
    () => accept(w, 'NEED-001', AGENT),
    (e: Error) => e instanceof Refused && /Agents cannot accept/.test(e.message),
  );
  accept(w, 'NEED-001');  // a human can
  assert.equal(load(w.root).graph.node('NEED-001')?.status, 'accepted');
});

test('agents cannot modify an accepted node', () => {
  const w = ws({
    [P.obj('OBJ-001')]: node('OBJ-001', 'OBJ'),
    [P.kpi('KPI-001')]: node('KPI-001', 'KPI', { definition: 'd', target: 't' }),
  });
  assert.throws(
    () => link(w, 'OBJ-001', 'measured_by', 'KPI-001', { agent: 'product-manager' }),
    (e: Error) => e instanceof Refused && /may not modify accepted nodes/.test(e.message),
  );
});

test('refuses an edge the matrix does not permit', () => {
  const w = ws({
    [P.obj('OBJ-001')]: node('OBJ-001', 'OBJ', { status: 'draft' }),
    [P.task('TASK-001')]: node('TASK-001', 'TASK', { status: 'draft' }),
  });
  assert.throws(
    () => link(w, 'TASK-001', 'derives_from', 'OBJ-001', { agent: 'system-analyst' }),
    (e: Error) => e instanceof Refused && /not a valid edge/.test(e.message),
  );
});

test('ids are sequential, never reused, and allocation is atomic per call', () => {
  const w = ws();
  const ids = Array.from({ length: 12 }, () => allocateId(w.root, 'US'));
  assert.deepEqual(ids.slice(0, 3), ['US-001', 'US-002', 'US-003']);
  assert.equal(new Set(ids).size, ids.length, 'duplicate id allocated');
  const counters = readFileSync(join(w.root, '.product/counters.yaml'), 'utf8');
  assert.match(counters, /US: 12/);
});

test('a created node lands at draft with agent provenance', () => {
  const w = ws();
  const res = newNode(w, { kind: 'NEED', title: 'Groups need to split' }, AGENT);
  const created = load(w.root).graph.node(res.id);
  assert.equal(created?.status, 'draft');
  assert.equal(created?.epistemic, 'hypothesis', 'agent-created needs must default to hypothesis');
  assert.equal(created?.provenance.author, 'agent:product-discovery');
  assert.ok(res.warnings.some((warning) => /unvalidated|hypothesis/.test(warning)));
});

test('creating a child links it upward in one step', () => {
  const w = ws({ [P.need('NEED-001')]: node('NEED-001', 'NEED', { who: 'x', status: 'draft' }) });
  const goal = newNode(w, { kind: 'FEAT', title: 'Split Bill', parent: 'NEED-001' });
  const created = load(w.root).graph.node(goal.id);
  assert.deepEqual(created?.links.addresses, ['NEED-001']);
});
