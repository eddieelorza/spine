/**
 * Agent contracts and the adapter.
 *
 * The point of these tests: §4.2 of the technical design claims six of nine prohibitions are
 * "hard". A claim like that is worth nothing unless something fails when it is violated.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { P, cleanup, makeWorkspace, node } from './helper.js';
import { load } from '../src/core/load.js';
import { Refused, accept, link, newNode } from '../src/core/mutate.js';
import { loadAll, loadContract, agentNames, mayWrite } from '../src/core/agents.js';
import { generate } from '../src/adapters/claude-code.js';
import { KINDS } from '../src/core/kinds.js';
import { EDGE_LIST, KIND_LIST } from '../src/core/types.js';

after(cleanup);

const CONTRACTS = loadAll();

// ------------------------------------------------------------- contracts

test('all four agent contracts load', () => {
  assert.deepEqual(
    CONTRACTS.map((c) => c.name).sort(),
    ['product-critic', 'product-discovery', 'product-manager', 'system-analyst'],
  );
});

test('contracts declare only real kinds and real edges', () => {
  for (const c of CONTRACTS) {
    for (const k of [...c.reads, ...c.writes]) {
      assert.ok((KIND_LIST as readonly string[]).includes(k), `${c.name} names unknown kind ${k}`);
    }
    for (const [kind, edges] of Object.entries(c.required_links)) {
      for (const e of edges ?? []) {
        assert.ok((EDGE_LIST as readonly string[]).includes(e), `${c.name}.${kind} names unknown edge ${e}`);
      }
    }
  }
});

test("a contract's required links agree with the kind model", () => {
  for (const c of CONTRACTS) {
    for (const [kind, edges] of Object.entries(c.required_links)) {
      const expected = KINDS[kind as keyof typeof KINDS].requiredLinks;
      assert.deepEqual(
        [...(edges ?? [])].sort(), [...expected].sort(),
        `${c.name} declares different required links for ${kind} than the kind model does`,
      );
    }
  }
});

test('every contract carries instructions and a stated role', () => {
  for (const c of CONTRACTS) {
    assert.ok(c.role.length > 20, `${c.name} has no meaningful role`);
    assert.ok(c.instructions.length > 500, `${c.name} has a suspiciously thin prompt body`);
  }
});

test('the critic may create nothing at all', () => {
  const critic = loadContract('product-critic');
  assert.deepEqual(critic.writes, []);
  for (const kind of KIND_LIST) assert.equal(mayWrite(critic, kind), false);
});

test('every contract marks at least one prohibition as unenforceable', () => {
  // If a contract claimed everything was machine-enforced, it would be lying.
  for (const c of CONTRACTS) {
    assert.ok(
      c.prohibitions.some((p) => p.enforced_by === 'prompt'),
      `${c.name} claims every prohibition is enforced — no prompt-level rule is ever fully enforceable`,
    );
  }
});

// ------------------------------------------------- the whitelist is real

function ws(files: Record<string, string> = {}) {
  return load(makeWorkspace(files));
}

test('discovery cannot create a feature', () => {
  assert.throws(
    () => newNode(ws({ [P.need('NEED-001')]: node('NEED-001', 'NEED', { who: 'x' }) }),
      { kind: 'FEAT', title: 'Split Bill', parent: 'NEED-001' }, { agent: 'product-discovery' }),
    (e: Error) => e instanceof Refused && /may not create a FEAT/.test(e.message),
  );
});

test('the product manager cannot create a technical task', () => {
  const w = ws({
    [P.feat('FEAT-001')]: node('FEAT-001', 'FEAT', { status: 'draft' }),
    [P.us('US-001')]: node('US-001', 'US', { status: 'draft', acceptance_criteria: ['x'], links: { derives_from: ['FEAT-001'] } }),
  });
  assert.throws(
    () => newNode(w, { kind: 'TASK', title: 'Wire the API', parent: 'US-001' }, { agent: 'product-manager' }),
    (e: Error) => e instanceof Refused && /may not create a TASK/.test(e.message),
  );
});

test('the critic cannot create anything, nor modify anything', () => {
  const w = ws({
    [P.need('NEED-001')]: node('NEED-001', 'NEED', { who: 'x', status: 'draft' }),
    [P.assum('ASSUM-001')]: node('ASSUM-001', 'ASSUM', { epistemic: 'assumption', status: 'draft' }),
  });
  const critic = { agent: 'product-critic' };
  assert.throws(() => newNode(w, { kind: 'RISK', title: 'x' }, critic), Refused);
  assert.throws(() => link(w, 'NEED-001', 'assumes', 'ASSUM-001', critic), Refused);
  assert.throws(() => accept(w, 'NEED-001', critic), Refused);
});

test('an agent may write the kinds its contract permits', () => {
  const w = ws();
  const res = newNode(w, { kind: 'NEED', title: 'Groups need to split' }, { agent: 'product-discovery' });
  assert.match(res.id, /^NEED-\d{3}$/);
});

test('the contract pins the epistemic default, not the caller', () => {
  const w = ws();
  const res = newNode(w, { kind: 'NEED', title: 'Groups need to split' }, { agent: 'product-discovery' });
  const created = load(w.root).graph.node(res.id);
  assert.equal(created?.epistemic, 'hypothesis');
  assert.equal(created?.evidence, undefined, 'agent-invented needs carry no evidence');
  assert.equal(created?.provenance.author, 'agent:product-discovery');
});

test('an unknown agent name is refused rather than silently trusted', () => {
  assert.throws(
    () => newNode(ws(), { kind: 'NEED', title: 'x' }, { agent: 'not-a-real-agent' }),
    /No agent contract/,
  );
});

// ---------------------------------------------------------------- adapter

test('adapter generation is deterministic', () => {
  assert.deepEqual(generate(CONTRACTS), generate(CONTRACTS));
});

test('the committed adapter matches the contracts', () => {
  // The mechanical proof behind the portability claim: adapters are generated, never authored.
  for (const file of generate(CONTRACTS)) {
    assert.ok(existsSync(file.path), `${file.path} is missing — run 'product agents build'`);
    assert.equal(
      readFileSync(file.path, 'utf8'), file.content,
      `${file.path} is out of date — run 'product agents build'`,
    );
  }
});

test('every generated subagent states its enforced prohibitions', () => {
  const files = generate(CONTRACTS);
  for (const c of CONTRACTS) {
    const f = files.find((x) => x.path.endsWith(`agents/${c.name}.md`));
    assert.ok(f, `no subagent generated for ${c.name}`);
    assert.match(f.content, /exit code 4/);
    assert.match(f.content, /Only the human accepts/);
    assert.match(f.content, new RegExp(`--agent ${c.name}`));
  }
});

test('every generated slash command names a real agent or a real CLI command', () => {
  const names = new Set(agentNames());
  for (const f of generate(CONTRACTS)) {
    if (!f.path.includes('commands/product/')) continue;
    const usesAgent = /Use the \*\*([a-z-]+)\*\* subagent/.exec(f.content);
    if (usesAgent) {
      assert.ok(names.has(usesAgent[1] as string), `${f.path} references unknown agent ${usesAgent[1]}`);
    } else {
      assert.match(f.content, /```bash\nproduct (why|status|check|context)/, `${f.path} wraps no known command`);
    }
  }
});
