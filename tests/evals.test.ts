/**
 * The eval fixtures are themselves a liability if they rot: a scenario whose workspace no
 * longer loads, or whose expectations name a check the scorer does not implement, fails
 * silently and quietly stops testing anything.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { load } from '../src/core/load.js';
import { runRules } from '../src/core/rules.js';
import { agentNames } from '../src/core/agents.js';

const DIR = 'evals/scenarios';

/** Must stay in step with the switch in evals/score.mjs. */
const SUPPORTED = new Set([
  'total_nodes_max', 'total_nodes', 'kind_max', 'forbidden_kinds', 'no_epistemic',
  'all_of_kind', 'no_accepted', 'check_errors', 'every_kpi_measurable', 'narratives_exist',
  'unchanged_files',
]);

const scenarios = readdirSync(DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

function meta(name: string): Record<string, unknown> {
  const text = readFileSync(join(DIR, name, 'SCENARIO.md'), 'utf8');
  const end = text.indexOf('\n---', 4);
  return parseYaml(text.slice(4, end)) as Record<string, unknown>;
}

test('there are scenarios, and each has a workspace', () => {
  assert.ok(scenarios.length >= 6, `expected at least 6 scenarios, found ${scenarios.length}`);
  for (const s of scenarios) {
    assert.ok(existsSync(join(DIR, s, 'workspace/.product/config.yaml')), `${s} has no workspace`);
  }
});

test('every scenario names a real agent and a prompt', () => {
  const known = new Set(agentNames());
  for (const s of scenarios) {
    const m = meta(s);
    assert.ok(known.has(String(m['agent'])), `${s} names unknown agent '${m['agent']}'`);
    assert.match(String(m['prompt']), /^\/product:/, `${s} has no slash-command prompt`);
    assert.ok(String(m['tests']).length > 40, `${s} does not say what it tests`);
  }
});

test('every expectation names a check the scorer implements', () => {
  for (const s of scenarios) {
    for (const key of Object.keys((meta(s)['expect'] ?? {}) as object)) {
      assert.ok(SUPPORTED.has(key), `${s} expects '${key}', which evals/score.mjs cannot evaluate`);
    }
  }
});

test('every scenario asks at least one question only a human can answer', () => {
  // A scenario scored purely by machine is testing the CLI, not the agent.
  for (const s of scenarios) {
    const human = meta(s)['human_scored'] as string[] | undefined;
    assert.ok(human && human.length > 0, `${s} has no human-scored questions`);
  }
});

test('every scenario workspace loads without parse errors', () => {
  for (const s of scenarios) {
    const ws = load(join(DIR, s, 'workspace'));
    assert.deepEqual(ws.broken, [], `${s} has unparseable fixture files`);
  }
});

test('the critic fixture plants exactly the defects it claims', () => {
  const dir = join(DIR, '06-critic-planted-defects');
  const { defects } = parseYaml(readFileSync(join(dir, 'defects.yaml'), 'utf8')) as {
    defects: { id: string; machine_detectable: boolean; rule?: string; nodes: string[] }[];
  };
  const ws = load(join(dir, 'workspace'));
  const findings = runRules({ workspace: ws, graph: ws.graph, now: new Date() });
  const caught = new Set(findings.map((f) => f.rule));

  const machine = defects.filter((d) => d.machine_detectable);
  const judgement = defects.filter((d) => !d.machine_detectable);
  assert.ok(judgement.length >= 5, 'the critic needs enough invisible defects to be worth scoring');

  // Each defect claimed machine-detectable really is.
  for (const d of machine) {
    assert.ok(d.rule, `${d.id} claims to be machine-detectable but names no rule`);
    assert.ok(caught.has(d.rule), `${d.id} claims rule ${d.rule} fires, but it does not`);
  }

  // And the linter finds NOTHING beyond them — otherwise the critic is being scored
  // against defects that `product check` would hand it for free.
  assert.equal(
    findings.length, machine.length,
    `expected exactly ${machine.length} findings, got ${findings.length}: ` +
      findings.map((f) => `${f.rule}/${f.node}`).join(', '),
  );

  // Every node a defect cites actually exists.
  for (const d of defects) {
    for (const id of d.nodes) assert.ok(ws.graph.has(id), `${d.id} cites ${id}, which is not in the fixture`);
  }
});
