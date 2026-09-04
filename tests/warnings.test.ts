/** Fixtures for the warning rules. */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { P, cleanup, makeWorkspace, node, rules } from './helper.js';

after(cleanup);

const KPI = (id: string) => node(id, 'KPI', { definition: 'x/y weekly', target: '10%' });
const NEED = (id: string, extra = {}) => node(id, 'NEED', { who: 'testers', ...extra });

test('W101 feature with no success metric', () => {
  const root = makeWorkspace({
    [P.obj('OBJ-001')]: node('OBJ-001', 'OBJ'),
    [P.need('NEED-001')]: NEED('NEED-001'),
    [P.goal('GOAL-001')]: node('GOAL-001', 'GOAL', { links: { serves: ['OBJ-001'] } }),
    [P.feat('FEAT-001')]: node('FEAT-001', 'FEAT', { links: { serves: ['GOAL-001'], addresses: ['NEED-001'] } }),
  });
  assert.ok(rules(root).includes('W101'));
});

test('W103 stated intent nobody is working on', () => {
  const root = makeWorkspace({
    [P.obj('OBJ-001')]: node('OBJ-001', 'OBJ', { links: { measured_by: ['KPI-001'] } }),
    [P.kpi('KPI-001')]: KPI('KPI-001'),
  });
  assert.ok(rules(root).includes('W103'));
});

test('W105 a draft that has gone stale', () => {
  const old = new Date(Date.now() - 40 * 86_400_000).toISOString();
  const root = makeWorkspace({
    [P.need('NEED-001')]: NEED('NEED-001', {
      status: 'draft',
      provenance: { author: 'human', created: old, updated: old },
    }),
  });
  assert.ok(rules(root).includes('W105'));
});

test('W106 a link to a retired node', () => {
  const root = makeWorkspace({
    [P.obj('OBJ-001')]: node('OBJ-001', 'OBJ', { status: 'dropped' }),
    [P.goal('GOAL-001')]: node('GOAL-001', 'GOAL', { links: { serves: ['OBJ-001'] } }),
  });
  assert.ok(rules(root).includes('W106'));
});

test('W107 soft cap exceeded', () => {
  const files: Record<string, string> = {};
  for (let i = 1; i <= 4; i++) files[P.need(`NEED-00${i}`)] = NEED(`NEED-00${i}`);
  const root = makeWorkspace(
    files,
    'schema_version: 1\nproduct: Test\npaths:\n  root: product\nlimits:\n  soft_cap:\n    NEED: 3\n',
  );
  assert.ok(rules(root).includes('W107'));
});

test('a rule set to off produces no findings', () => {
  const root = makeWorkspace(
    { [P.obj('OBJ-001')]: node('OBJ-001', 'OBJ') },
    'schema_version: 1\nproduct: Test\npaths:\n  root: product\nrules:\n  W103: off\n',
  );
  assert.ok(!rules(root).includes('W103'));
});
