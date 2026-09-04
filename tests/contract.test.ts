/**
 * Contract tests. These are the ones that stop the spec and the code drifting apart —
 * the standard way a validator rots (Phase 3 §10.5).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { EDGE_MATRIX, KINDS, isEdgeValid } from '../src/core/kinds.js';
import { IMPLEMENTED } from '../src/core/rules.js';
import { EDGE_LIST, KIND_LIST } from '../src/core/types.js';

const spec = parseYaml(readFileSync('spec/rules/rules.yaml', 'utf8')) as {
  rules: { id: string; name: string; severity: string; description: string; rationale: string }[];
};

test('every declared rule has an implementation', () => {
  const missing = spec.rules.filter((r) => !IMPLEMENTED[r.id]).map((r) => r.id);
  assert.deepEqual(missing, [], `declared in spec/rules but not implemented: ${missing.join(', ')}`);
});

test('every implemented rule is declared in spec/rules', () => {
  const declared = new Set(spec.rules.map((r) => r.id));
  const undeclared = Object.keys(IMPLEMENTED).filter((id) => !declared.has(id));
  assert.deepEqual(undeclared, [], `implemented but undocumented: ${undeclared.join(', ')}`);
});

test('every declared rule states a rationale', () => {
  for (const r of spec.rules) {
    assert.ok(r.rationale?.trim(), `${r.id} has no rationale — a rule nobody can justify gets disabled`);
  }
});

test('every rule has a test that triggers it', () => {
  const suite = readdirSync('tests')
    .filter((f) => f.endsWith('.test.ts'))
    .map((f) => readFileSync(`tests/${f}`, 'utf8'))
    .join('\n');
  const untested = spec.rules.filter((r) => !suite.includes(`'${r.id}`) && !suite.includes(`"${r.id}`));
  assert.deepEqual(untested.map((r) => r.id), [], 'rules with no fixture that triggers them');
});

test('every edge in the matrix is accepted, and cross-pairs are rejected', () => {
  for (const rule of EDGE_MATRIX) {
    const froms = rule.from === '*' ? KIND_LIST : rule.from;
    for (const from of froms) {
      const tos = rule.to === 'same' ? [from] : rule.to;
      for (const to of tos) {
        assert.ok(isEdgeValid(from, rule.edge, to), `${from} ${rule.edge} ${to} should be valid`);
      }
    }
  }
});

test('edges outside the matrix are rejected', () => {
  assert.equal(isEdgeValid('TASK', 'derives_from', 'OBJ'), false);
  assert.equal(isEdgeValid('FEAT', 'serves', 'OBJ'), false);   // FEAT serves GOAL, not OBJ
  assert.equal(isEdgeValid('US', 'derives_from', 'TASK'), false);
  assert.equal(isEdgeValid('NEED', 'serves', 'GOAL'), false);
  assert.equal(isEdgeValid('KPI', 'measured_by', 'KPI'), false);
});

test('every kind declares a folder and its required links are legal edges', () => {
  for (const kind of KIND_LIST) {
    const def = KINDS[kind];
    assert.ok(def.folder, `${kind} has no folder`);
    if (def.root) {
      assert.deepEqual(def.requiredLinks, [], `${kind} is a root kind but declares required links`);
    } else {
      assert.ok(def.requiredLinks.length > 0, `${kind} is not a root kind but requires no link`);
      for (const edge of def.requiredLinks) {
        assert.ok((EDGE_LIST as readonly string[]).includes(edge), `${kind} requires unknown edge ${edge}`);
        assert.ok(
          EDGE_MATRIX.some((r) => r.edge === edge && (r.from === '*' || r.from.includes(kind))),
          `${kind} requires edge '${edge}' that the matrix does not permit from ${kind}`,
        );
      }
    }
  }
});
