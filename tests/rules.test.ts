/**
 * One fixture per error class. Each asserts its rule fires AND that no other error
 * fires — an over-broad rule is as bad as a missing one.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { P, cleanup, check, makeWorkspace, node, rules } from './helper.js';

after(cleanup);

const KPI = (id: string) => node(id, 'KPI', { definition: 'x/y weekly', target: '10%' });
const NEED = (id: string, extra = {}) => node(id, 'NEED', { who: 'testers', ...extra });

function errorsOnly(root: string): string[] {
  return check(root).findings.filter((f) => f.severity === 'error').map((f) => f.rule);
}

test('E001 dangling reference', () => {
  const root = makeWorkspace({
    [P.need('NEED-001')]: NEED('NEED-001'),
    [P.goal('GOAL-001')]: node('GOAL-001', 'GOAL', { links: { serves: ['OBJ-999'] } }),
  });
  assert.deepEqual([...new Set(errorsOnly(root))], ['E001']);
});

test('E002 duplicate id', () => {
  const root = makeWorkspace({
    [P.need('NEED-001')]: NEED('NEED-001'),
    'product/01-discovery/other/NEED-001.md': NEED('NEED-001'),
  });
  assert.ok(errorsOnly(root).includes('E002'));
});

test('E003 invalid edge type', () => {
  const root = makeWorkspace({
    [P.obj('OBJ-001')]: node('OBJ-001', 'OBJ'),
    [P.feat('FEAT-001')]: node('FEAT-001', 'FEAT', { links: { serves: ['OBJ-001'] } }),
  });
  // FEAT serves GOAL, never OBJ.
  assert.ok(errorsOnly(root).includes('E003'));
});

test('E004 cycle', () => {
  const root = makeWorkspace({
    [P.task('TASK-001')]: node('TASK-001', 'TASK', { links: { depends_on: ['TASK-002'] } }),
    [P.task('TASK-002')]: node('TASK-002', 'TASK', { links: { depends_on: ['TASK-001'] } }),
  });
  assert.ok(errorsOnly(root).includes('E004'));
});

test('E005 orphan — the traceability rule', () => {
  const root = makeWorkspace({
    [P.us('US-001')]: node('US-001', 'US', { acceptance_criteria: ['a thing happens'] }),
  });
  assert.deepEqual([...new Set(errorsOnly(root))], ['E005']);
});

test('E005 does not fire for root kinds', () => {
  const root = makeWorkspace({
    [P.need('NEED-001')]: NEED('NEED-001'),
    [P.obj('OBJ-001')]: node('OBJ-001', 'OBJ'),
    [P.assum('ASSUM-001')]: node('ASSUM-001', 'ASSUM', { epistemic: 'assumption' }),
  });
  assert.equal(errorsOnly(root).length, 0);
});

test('E006 kpi without a target is not measurable', () => {
  const root = makeWorkspace({ [P.kpi('KPI-001')]: node('KPI-001', 'KPI', { definition: 'engagement' }) });
  assert.deepEqual([...new Set(errorsOnly(root))], ['E006']);
});

test('E007 fact without evidence', () => {
  const root = makeWorkspace({
    [P.need('NEED-001')]: node('NEED-001', 'NEED', { who: 'x', epistemic: 'fact', evidence: '' }),
  });
  assert.deepEqual([...new Set(errorsOnly(root))], ['E007']);
});

test('E008 malformed node', () => {
  const root = makeWorkspace({ [P.need('NEED-001')]: '---\nid: NEED-001\nkind: [broken\n---\n' });
  assert.deepEqual([...new Set(errorsOnly(root))], ['E008']);
});

test('E008 catches a filename that does not match its id', () => {
  const root = makeWorkspace({ [P.need('NEED-002')]: NEED('NEED-001') });
  assert.ok(errorsOnly(root).includes('E008'));
});

test('a well-formed spine produces no findings at all', () => {
  const root = makeWorkspace({
    [P.obj('OBJ-001')]: node('OBJ-001', 'OBJ', { links: { measured_by: ['KPI-001'] } }),
    [P.kpi('KPI-001')]: KPI('KPI-001'),
    [P.need('NEED-001')]: NEED('NEED-001', { epistemic: 'fact', evidence: '6 interviews, Aug 2026' }),
    [P.goal('GOAL-001')]: node('GOAL-001', 'GOAL', { links: { serves: ['OBJ-001'] } }),
    [P.feat('FEAT-001')]: node('FEAT-001', 'FEAT', { links: { serves: ['GOAL-001'], addresses: ['NEED-001'], measured_by: ['KPI-001'] } }),
    [P.us('US-001')]: node('US-001', 'US', { acceptance_criteria: ['the share settles independently'], links: { derives_from: ['FEAT-001'] } }),
    [P.task('TASK-001')]: node('TASK-001', 'TASK', { links: { derives_from: ['US-001'] } }),
  });
  assert.deepEqual(rules(root), []);
});

test('W102 flags substantial work on an unvalidated need', () => {
  const files: Record<string, string> = {
    [P.need('NEED-001')]: NEED('NEED-001', { epistemic: 'hypothesis' }),
    [P.obj('OBJ-001')]: node('OBJ-001', 'OBJ', { links: { measured_by: ['KPI-001'] } }),
    [P.kpi('KPI-001')]: KPI('KPI-001'),
    [P.goal('GOAL-001')]: node('GOAL-001', 'GOAL', { links: { serves: ['OBJ-001'] } }),
    [P.feat('FEAT-001')]: node('FEAT-001', 'FEAT', { links: { serves: ['GOAL-001'], addresses: ['NEED-001'], measured_by: ['KPI-001'] } }),
  };
  for (let i = 1; i <= 5; i++) {
    const id = `US-00${i}`;
    files[P.us(id)] = node(id, 'US', { acceptance_criteria: ['x happens'], links: { derives_from: ['FEAT-001'] } });
  }
  assert.ok(rules(makeWorkspace(files)).includes('W102'));
});

test('W104 flags hedged acceptance criteria', () => {
  const root = makeWorkspace({
    [P.need('NEED-001')]: NEED('NEED-001'),
    [P.feat('FEAT-001')]: node('FEAT-001', 'FEAT', { links: { addresses: ['NEED-001'], serves: ['GOAL-001'] } }),
    [P.goal('GOAL-001')]: node('GOAL-001', 'GOAL', { links: { serves: ['OBJ-001'] } }),
    [P.obj('OBJ-001')]: node('OBJ-001', 'OBJ'),
    [P.us('US-001')]: node('US-001', 'US', { acceptance_criteria: ['it works properly'], links: { derives_from: ['FEAT-001'] } }),
  });
  assert.ok(rules(root).includes('W104'));
});
