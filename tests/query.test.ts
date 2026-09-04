/** why / status / context behaviour, including the properties that must hold on broken graphs. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { P, cleanup, check, makeWorkspace, node } from './helper.js';
import { why } from '../src/core/query/why.js';
import { status } from '../src/core/query/status.js';
import { context } from '../src/core/query/context.js';
import { renderWhy } from '../src/core/render/why.js';
import { setColor } from '../src/core/render/style.js';

after(cleanup);
setColor(false);

const KPI = (id: string) => node(id, 'KPI', { definition: 'completed / started, weekly', target: '55%' });

/** The canonical spine, with an unvalidated need and an open assumption hanging off it. */
function spine(needEpistemic = 'hypothesis') {
  return makeWorkspace({
    [P.obj('OBJ-001')]: node('OBJ-001', 'OBJ', { links: { measured_by: ['KPI-001'] } }),
    [P.kpi('KPI-001')]: KPI('KPI-001'),
    [P.need('NEED-001')]: node('NEED-001', 'NEED', { who: 'groups', epistemic: needEpistemic, evidence: '' }),
    [P.assum('ASSUM-001')]: node('ASSUM-001', 'ASSUM', { epistemic: 'assumption', status: 'draft' }),
    [P.goal('GOAL-001')]: node('GOAL-001', 'GOAL', { links: { serves: ['OBJ-001'] } }),
    [P.feat('FEAT-001')]: node('FEAT-001', 'FEAT', {
      links: { serves: ['GOAL-001'], addresses: ['NEED-001'], measured_by: ['KPI-001'], assumes: ['ASSUM-001'] },
    }),
    [P.us('US-001')]: node('US-001', 'US', { acceptance_criteria: ['a share settles'], links: { derives_from: ['FEAT-001'] } }),
    [P.task('TASK-001')]: node('TASK-001', 'TASK', { links: { derives_from: ['US-001'] } }),
  });
}

test('why walks a task all the way to the business objective', () => {
  const { ws } = check(spine());
  const res = why(ws.graph, 'TASK-001');
  assert.ok(res.found);
  assert.deepEqual(res.roots.sort(), ['NEED-001', 'OBJ-001']);
  assert.deepEqual(res.metrics.map((m) => m.id), ['KPI-001']);
});

test('the honesty footer names the unvalidated need and the open assumption', () => {
  const { ws } = check(spine());
  const res = why(ws.graph, 'TASK-001');
  const unvalidated = res.warnings.filter((w) => w.kind === 'unvalidated').map((w) => w.id);
  const assumptions = res.warnings.filter((w) => w.kind === 'open_assumption').map((w) => w.id);
  assert.deepEqual(unvalidated, ['NEED-001']);
  assert.deepEqual(assumptions, ['ASSUM-001']);
  assert.match(renderWhy(res), /This chain rests on/);
});

test('a fully evidenced chain produces no footer', () => {
  const root = makeWorkspace({
    [P.obj('OBJ-001')]: node('OBJ-001', 'OBJ', { links: { measured_by: ['KPI-001'] } }),
    [P.kpi('KPI-001')]: KPI('KPI-001'),
    [P.need('NEED-001')]: node('NEED-001', 'NEED', { who: 'groups', epistemic: 'fact', evidence: '6 interviews' }),
    [P.goal('GOAL-001')]: node('GOAL-001', 'GOAL', { links: { serves: ['OBJ-001'] } }),
    [P.feat('FEAT-001')]: node('FEAT-001', 'FEAT', { links: { serves: ['GOAL-001'], addresses: ['NEED-001'], measured_by: ['KPI-001'] } }),
  });
  const { ws } = check(root);
  const res = why(ws.graph, 'FEAT-001');
  assert.deepEqual(res.warnings, []);
  assert.doesNotMatch(renderWhy(res), /This chain rests on/);
});

test('--no-footer cannot strip warnings from JSON output', () => {
  const { ws } = check(spine());
  const res = why(ws.graph, 'TASK-001');
  // renderWhy can hide it for humans; the result object always carries it.
  assert.doesNotMatch(renderWhy(res, { footer: false }), /rests on/);
  assert.ok(res.warnings.length > 0, 'warnings must survive in the data the JSON path serialises');
});

test('why terminates on a cyclic graph — you need it most when things are broken', () => {
  const root = makeWorkspace({
    [P.task('TASK-001')]: node('TASK-001', 'TASK', { links: { depends_on: ['TASK-002'], derives_from: ['US-001'] } }),
    [P.task('TASK-002')]: node('TASK-002', 'TASK', { links: { depends_on: ['TASK-001'] } }),
    [P.us('US-001')]: node('US-001', 'US', { acceptance_criteria: ['x'], links: { derives_from: ['FEAT-001'] } }),
    [P.feat('FEAT-001')]: node('FEAT-001', 'FEAT', { links: { addresses: ['NEED-001'], serves: ['GOAL-001'] } }),
    [P.need('NEED-001')]: node('NEED-001', 'NEED', { who: 'x' }),
    [P.goal('GOAL-001')]: node('GOAL-001', 'GOAL', { links: { serves: ['OBJ-001'] } }),
    [P.obj('OBJ-001')]: node('OBJ-001', 'OBJ'),
  });
  const { ws } = check(root);
  assert.ok(ws.graph.cycles.length > 0, 'fixture should contain a cycle');
  const res = why(ws.graph, 'TASK-001');   // must not hang or overflow
  assert.ok(res.found);
});

test('why reports a dangling ancestor rather than pretending it resolved', () => {
  const root = makeWorkspace({
    [P.goal('GOAL-001')]: node('GOAL-001', 'GOAL', { links: { serves: ['OBJ-404'] } }),
  });
  const { ws } = check(root);
  const res = why(ws.graph, 'GOAL-001');
  assert.ok(res.warnings.some((w) => w.kind === 'missing' && w.id === 'OBJ-404'));
});

test('why output is byte-identical across runs', () => {
  const { ws } = check(spine());
  assert.equal(renderWhy(why(ws.graph, 'TASK-001')), renderWhy(why(ws.graph, 'TASK-001')));
});

test('descendants is the exact inverse of ancestors', () => {
  const { ws } = check(spine());
  for (const n of ws.nodes) {
    for (const ancestor of ws.graph.ancestors(n.id)) {
      assert.ok(
        ws.graph.descendants(ancestor).has(n.id),
        `${ancestor} is an ancestor of ${n.id} but ${n.id} is not among its descendants`,
      );
    }
  }
});

test('status gives no bar to a stage with no defined denominator', () => {
  const { ws, findings } = check(spine());
  const res = status(ws, ws.graph, findings);
  const byName = Object.fromEntries(res.stages.map((s) => [s.name, s]));
  assert.equal(byName['Discovery']?.enumerable, true);
  assert.equal(byName['Backlog']?.enumerable, false, 'story counts have no denominator — never a percentage');
  assert.equal(byName['Delivery']?.enumerable, false);
});

test('status counts unvalidated foundations and the stories resting on them', () => {
  const { ws, findings } = check(spine());
  const res = status(ws, ws.graph, findings);
  assert.deepEqual(res.honesty.unvalidated_needs, ['NEED-001']);
  assert.equal(res.honesty.affected_stories, 1);
  assert.deepEqual(res.honesty.open_assumptions, ['ASSUM-001']);
});

test('validated needs disappear from the honesty block', () => {
  const { ws, findings } = check(spine('fact'));
  const res = status(ws, ws.graph, findings);
  assert.deepEqual(res.honesty.unvalidated_needs, []);
  assert.equal(res.honesty.affected_stories, 0);
});

test('context bundles the ancestor chain and flags what is unvalidated', () => {
  const { ws } = check(spine());
  const bundle = context(ws.graph, 'TASK-001');
  assert.ok(bundle.found);
  for (const id of ['TASK-001', 'US-001', 'FEAT-001', 'NEED-001', 'OBJ-001', 'KPI-001', 'ASSUM-001']) {
    assert.ok(bundle.included.includes(id), `${id} missing from context bundle`);
  }
  assert.match(bundle.markdown, /Unvalidated reasoning in this context/);
  assert.match(bundle.markdown, /NEED-001/);
});

test('context respects a token budget and says what it dropped', () => {
  const { ws } = check(spine());
  const bundle = context(ws.graph, 'TASK-001', { budgetTokens: 60 });
  assert.ok(bundle.omitted.length > 0);
  assert.ok(bundle.included.includes('TASK-001'), 'the requested node is never dropped');
  assert.match(bundle.markdown, /omitted to stay within the token budget/);
});
