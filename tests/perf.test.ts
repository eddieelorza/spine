/** A budget that isn't enforced isn't a budget (Phase 1 T8). */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { P, cleanup, makeWorkspace, node } from './helper.js';
import { load } from '../src/core/load.js';
import { runRules } from '../src/core/rules.js';
import { why } from '../src/core/query/why.js';
import { status } from '../src/core/query/status.js';

after(cleanup);

function largeWorkspace(): string {
  const files: Record<string, string> = {
    [P.obj('OBJ-001')]: node('OBJ-001', 'OBJ', { links: { measured_by: ['KPI-001'] } }),
    [P.kpi('KPI-001')]: node('KPI-001', 'KPI', { definition: 'd', target: 't' }),
    [P.need('NEED-001')]: node('NEED-001', 'NEED', { who: 'x', epistemic: 'fact', evidence: 'interviews' }),
    [P.goal('GOAL-001')]: node('GOAL-001', 'GOAL', { links: { serves: ['OBJ-001'] } }),
  };
  const id = (p: string, i: number) => `${p}-${String(i).padStart(3, '0')}`;
  for (let f = 1; f <= 20; f++) {
    files[P.feat(id('FEAT', f))] = node(id('FEAT', f), 'FEAT', {
      links: { serves: ['GOAL-001'], addresses: ['NEED-001'], measured_by: ['KPI-001'] },
    });
    for (let s = 0; s < 8; s++) {
      const sid = id('US', (f - 1) * 8 + s + 1);
      files[P.us(sid)] = node(sid, 'US', { acceptance_criteria: ['it settles'], links: { derives_from: [id('FEAT', f)] } });
      const tid = id('TASK', (f - 1) * 8 + s + 1);
      files[P.task(tid)] = node(tid, 'TASK', { links: { derives_from: [sid] } });
    }
  }
  return makeWorkspace(files);
}

test('check stays under 1s at ~350 nodes', () => {
  const root = largeWorkspace();
  const t0 = performance.now();
  const ws = load(root);
  const findings = runRules({ workspace: ws, graph: ws.graph, now: new Date() });
  const ms = performance.now() - t0;
  assert.ok(ws.nodes.length > 300, `expected a large fixture, got ${ws.nodes.length}`);
  assert.deepEqual(findings.filter((f) => f.severity === 'error'), []);
  assert.ok(ms < 1000, `check took ${ms.toFixed(0)}ms (budget 1000ms)`);
});

test('why stays under 300ms, status under 1s', () => {
  const ws = load(largeWorkspace());
  const findings = runRules({ workspace: ws, graph: ws.graph, now: new Date() });

  const t0 = performance.now();
  why(ws.graph, 'TASK-160');
  const whyMs = performance.now() - t0;

  const t1 = performance.now();
  status(ws, ws.graph, findings);
  const statusMs = performance.now() - t1;

  assert.ok(whyMs < 300, `why took ${whyMs.toFixed(0)}ms (budget 300ms)`);
  assert.ok(statusMs < 1000, `status took ${statusMs.toFixed(0)}ms (budget 1000ms)`);
});
