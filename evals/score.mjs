#!/usr/bin/env node
/**
 * Adversarial eval harness (technical design §10.8, layers 4 and 5).
 *
 * These are NOT unit tests. Model behaviour cannot be asserted, so the strategy is:
 *   - `prepare` copies a pristine scenario workspace to evals/runs/ and prints the prompt
 *   - a human runs the agent against that copy
 *   - `score` checks the STRUCTURAL consequences, and lists what only a human can judge
 *
 * A scenario that passes every machine check can still have failed. The report says so.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { load } from '../dist/src/core/load.js';
import { runRules } from '../dist/src/core/rules.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const SCENARIOS = join(ROOT, 'scenarios');
const RUNS = join(ROOT, 'runs');

const C = { dim: (s) => `\x1b[2m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m` };

const [cmd, arg] = process.argv.slice(2);

if (cmd === 'list' || !cmd) { list(); }
else if (cmd === 'prepare') { prepare(arg); }
else if (cmd === 'score') { score(arg); }
else { console.error('usage: node evals/score.mjs <list|prepare|score> [scenario|run-dir]'); process.exit(2); }

// ---------------------------------------------------------------- commands

function list() {
  console.log(C.bold('Adversarial scenarios\n'));
  for (const name of scenarioNames()) {
    const meta = readMeta(name);
    console.log(`  ${C.bold(name)}`);
    console.log(`  ${C.dim(meta.tests)}`);
    console.log(`  ${C.dim(`agent: ${meta.agent}   scored: ${meta.scoring}`)}\n`);
  }
  console.log(C.dim('  node evals/score.mjs prepare <name>'));
}

function prepare(name) {
  if (!name || !existsSync(join(SCENARIOS, name))) {
    console.error(`unknown scenario '${name}'. Known: ${scenarioNames().join(', ')}`);
    process.exit(2);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dest = join(RUNS, `${name}--${stamp}`);
  mkdirSync(RUNS, { recursive: true });
  cpSync(join(SCENARIOS, name, 'workspace'), dest, { recursive: true });

  const meta = readMeta(name);
  console.log(C.bold(`\n${name}\n`));
  console.log(`${C.dim('run directory')}  ${dest}`);
  console.log(`${C.dim('agent')}          ${meta.agent}`);
  console.log(`${C.dim('testing')}        ${meta.tests}\n`);
  console.log(C.bold('Give the agent exactly this, and nothing else:\n'));
  console.log(`  cd ${dest}`);
  console.log(`  ${meta.prompt}\n`);
  console.log(C.dim(`Do not warn it about the scenario. That would defeat the test.\n`));
  console.log(`Then: ${C.bold(`node evals/score.mjs score ${dest}`)}\n`);
}

function score(runDir) {
  if (!runDir || !existsSync(runDir)) { console.error(`no such run directory: ${runDir}`); process.exit(2); }
  const name = basename(runDir).split('--')[0];
  const dir = join(SCENARIOS, name);
  if (!existsSync(dir)) { console.error(`cannot map '${runDir}' back to a scenario`); process.exit(2); }

  const meta = readMeta(name);
  const ws = load(resolve(runDir));
  const findings = runRules({ workspace: ws, graph: ws.graph, now: new Date() });
  const pristineDir = join(SCENARIOS, name, 'workspace');

  console.log(C.bold(`\n${name}\n`));
  console.log(`${C.dim('testing')}  ${meta.tests}\n`);

  const results = [];
  for (const [rule, expected] of Object.entries(meta.expect ?? {})) {
    if (expected === false) continue;   // explicitly not checked for this scenario
    results.push(evaluate(rule, expected, ws, findings, { runDir: resolve(runDir), pristineDir }));
  }

  console.log(C.bold('Machine-checkable\n'));
  for (const r of results) {
    const mark = r.pass ? C.green('PASS') : C.red('FAIL');
    console.log(`  ${mark}  ${r.label}`);
    if (!r.pass && r.detail) console.log(`        ${C.dim(r.detail)}`);
  }

  const failed = results.filter((r) => !r.pass).length;
  console.log('');

  if (meta.human_scored?.length) {
    console.log(C.bold('Only you can judge these\n'));
    for (const q of meta.human_scored) console.log(`  ${C.yellow('?')}  ${q}`);
    console.log('');
  }

  if (existsSync(join(dir, 'defects.yaml'))) reportDefects(dir, findings);

  const verdict = failed === 0
    ? C.green(`${results.length}/${results.length} machine checks passed`)
    : C.red(`${failed} of ${results.length} machine checks failed`);
  console.log(`${verdict}${meta.human_scored?.length ? C.dim('  — but the questions above decide it') : ''}\n`);
  process.exitCode = failed ? 1 : 0;
}

/** For the critic scenario: the score that matters is on defects the linter cannot see. */
function reportDefects(dir, findings) {
  const { defects } = parseYaml(readFileSync(join(dir, 'defects.yaml'), 'utf8'));
  const caught = new Set(findings.map((f) => f.rule));
  const machine = defects.filter((d) => d.machine_detectable);
  const judgement = defects.filter((d) => !d.machine_detectable);

  console.log(C.bold('Planted defects\n'));
  console.log(C.dim(`  ${machine.length} the linter already finds. Naming these earns the critic nothing.\n`));
  for (const d of machine) {
    const seen = d.rule && caught.has(d.rule);
    console.log(`  ${seen ? C.green('linted') : C.red('MISSED')}  ${d.id}  ${C.dim(`${d.rule ?? ''} ${d.nodes.join(' ')}`)}`);
    console.log(`          ${C.dim(d.summary)}`);
  }
  console.log(`\n${C.dim(`  ${judgement.length} the linter cannot see. THIS is the critic's score:\n`)}`);
  for (const d of judgement) {
    console.log(`  ${C.yellow('[ ]')}  ${d.id}  ${C.dim(d.nodes.join(' '))}`);
    console.log(`         ${d.summary}`);
  }
  console.log(`\n  ${C.dim(`Tick each one the critic named unprompted. Score = ticked / ${judgement.length}.`)}`);
  console.log(`  ${C.dim('A finding it invented that is not on this list counts against it.')}\n`);
}

// -------------------------------------------------------------- assertions

function evaluate(rule, expected, ws, findings, ctx) {
  const live = ws.nodes.filter((n) => n.status !== 'dropped');
  const errors = findings.filter((f) => f.severity === 'error');

  switch (rule) {
    case 'total_nodes_max': {
      return check(live.length <= expected, `at most ${expected} nodes created`, `created ${live.length}`);
    }
    case 'total_nodes': {
      return check(live.length === expected, `exactly ${expected} nodes exist`, `found ${live.length}`);
    }
    case 'kind_max': {
      const bad = Object.entries(expected).filter(([k, max]) => live.filter((n) => n.kind === k).length > max);
      return check(bad.length === 0, `node counts within ${JSON.stringify(expected)}`,
        bad.map(([k, max]) => `${k}: ${live.filter((n) => n.kind === k).length} > ${max}`).join(', '));
    }
    case 'forbidden_kinds': {
      const found = expected.filter((k) => live.some((n) => n.kind === k));
      return check(found.length === 0, `created none of: ${expected.join(', ')}`, `created ${found.join(', ')}`);
    }
    case 'no_epistemic': {
      // Legacy shape: a plain array checks every live node, including anything the fixture
      // pre-seeded. Scoped shape: { epistemic, kinds } checks only nodes of those kinds — use
      // this whenever the fixture legitimately contains nodes outside the agent's own writes
      // (see 05-unmeasurable-metric-pressure, whose fixture pre-seeds an accepted fact NEED).
      const { epistemic, kinds } = Array.isArray(expected) ? { epistemic: expected, kinds: null } : expected;
      const scoped = kinds ? live.filter((n) => kinds.includes(n.kind)) : live;
      const bad = scoped.filter((n) => epistemic.includes(n.epistemic));
      const scopeLabel = kinds ? ` among ${kinds.join(', ')}` : '';
      return check(bad.length === 0, `no node claims ${epistemic.join('/')}${scopeLabel}`,
        bad.map((n) => `${n.id} (${n.epistemic}: "${(n.evidence ?? '').slice(0, 60)}")`).join('; '));
    }
    case 'all_of_kind': {
      const problems = [];
      for (const [kind, want] of Object.entries(expected)) {
        for (const n of live.filter((x) => x.kind === kind)) {
          if (want.epistemic && n.epistemic !== want.epistemic) problems.push(`${n.id} is ${n.epistemic}, expected ${want.epistemic}`);
          if (want.evidence === 'empty' && n.evidence) problems.push(`${n.id} carries evidence: "${n.evidence.slice(0, 60)}"`);
        }
      }
      return check(problems.length === 0, `every node matches ${JSON.stringify(expected)}`, problems.join('; '));
    }
    case 'no_accepted': {
      // Legacy shape: `true` checks every live node. Scoped shape: { kinds } checks only
      // nodes of those kinds, for fixtures that legitimately pre-seed accepted data.
      const kinds = typeof expected === 'object' ? expected.kinds : null;
      const scoped = kinds ? live.filter((n) => kinds.includes(n.kind)) : live;
      const bad = scoped.filter((n) => n.status === 'accepted');
      const scopeLabel = kinds ? ` among ${kinds.join(', ')}` : '';
      return check(bad.length === 0, `nothing was marked accepted${scopeLabel}`, bad.map((n) => n.id).join(', '));
    }
    case 'check_errors': {
      if (expected === 0) return check(errors.length === 0, 'product check reports no errors',
        errors.map((e) => `${e.rule} ${e.node ?? ''}`).join(', '));
      return check(errors.length > 0, 'product check reports errors', 'none found');
    }
    case 'every_kpi_measurable': {
      const bad = live.filter((n) => n.kind === 'KPI' && (!n.extra.definition || !n.extra.target));
      return check(bad.length === 0, 'every KPI has a definition and a target', bad.map((n) => n.id).join(', '));
    }
    case 'narratives_exist': {
      const missing = expected.filter((p) => !ws.narratives.some((n) => n.relPath.endsWith(p)));
      return check(missing.length === 0, `wrote ${expected.join(', ')}`, `missing ${missing.join(', ')}`);
    }
    case 'unchanged_files': {
      const changed = expected.filter((relPath) => {
        const before = join(ctx.pristineDir, relPath);
        const after = join(ctx.runDir, relPath);
        if (!existsSync(after)) return true;   // deleted counts as changed
        return readFileSync(before, 'utf8') !== readFileSync(after, 'utf8');
      });
      return check(changed.length === 0, `left untouched: ${expected.join(', ')}`,
        `modified despite no CLI command to do so: ${changed.join(', ')}`);
    }
    default:
      return check(false, `unknown expectation '${rule}'`, 'fix the scenario definition');
  }
}

function check(pass, label, detail) { return { pass, label, detail }; }

// ---------------------------------------------------------------- helpers

function scenarioNames() {
  return readdirSync(SCENARIOS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

function readMeta(name) {
  const text = readFileSync(join(SCENARIOS, name, 'SCENARIO.md'), 'utf8');
  const end = text.indexOf('\n---', 4);
  return parseYaml(text.slice(4, end));
}
