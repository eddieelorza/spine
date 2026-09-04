#!/usr/bin/env node
/**
 * CLI: argument parsing, rendering choice, exit codes. Owns no logic.
 * Exit codes (Phase 3 §3.2): 0 ok · 1 validation errors · 2 usage · 3 no workspace · 4 refused.
 */
import { parseArgs } from 'node:util';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { ADAPTER_ROOT, generate } from '../adapters/claude-code.js';
import { loadAll, loadContract, agentNames } from '../core/agents.js';
import { WorkspaceNotFound } from '../core/fs.js';
import { init } from '../core/init.js';
import { load, type Loaded } from '../core/load.js';
import { Refused, accept, drop, link, newNode, unlink } from '../core/mutate.js';
import { runRules } from '../core/rules.js';
import { context } from '../core/query/context.js';
import { list } from '../core/query/list.js';
import { status } from '../core/query/status.js';
import { why } from '../core/query/why.js';
import { renderCheck } from '../core/render/check.js';
import { renderStatus } from '../core/render/status.js';
import { renderWhy } from '../core/render/why.js';
import { bold, cyan, dim, green, setColor, yellow } from '../core/render/style.js';
import { KIND_LIST, type EdgeType, type Epistemic, type Finding, type Kind, type Status } from '../core/types.js';

const SCHEMA = 1;

const OPTIONS = {
  json: { type: 'boolean' as const, default: false },
  'no-color': { type: 'boolean' as const, default: false },
  quiet: { type: 'boolean' as const, default: false },
  workspace: { type: 'string' as const },
  help: { type: 'boolean' as const, short: 'h', default: false },
  version: { type: 'boolean' as const, default: false },
  // command-specific
  name: { type: 'string' as const },
  title: { type: 'string' as const },
  parent: { type: 'string' as const },
  edge: { type: 'string' as const },
  epistemic: { type: 'string' as const },
  confidence: { type: 'string' as const },
  evidence: { type: 'string' as const },
  body: { type: 'string' as const },
  agent: { type: 'string' as const },
  kind: { type: 'string' as const },
  status: { type: 'string' as const },
  orphans: { type: 'boolean' as const, default: false },
  unvalidated: { type: 'boolean' as const, default: false },
  depth: { type: 'string' as const },
  'no-footer': { type: 'boolean' as const, default: false },
  rule: { type: 'string' as const },
  severity: { type: 'string' as const },
  'budget-tokens': { type: 'string' as const },
  direction: { type: 'string' as const },
  'superseded-by': { type: 'string' as const },
  'product-dir': { type: 'string' as const },
  out: { type: 'string' as const },
  install: { type: 'boolean' as const, default: false },
  check: { type: 'boolean' as const, default: false },
};

type Flags = Record<string, string | boolean | undefined>;

function main(argv: string[]): number {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n\nRun 'product --help' for usage.\n`);
    return 2;
  }
  const flags = parsed.values as Flags;
  const pos = parsed.positionals;
  const json = flags['json'] === true;

  setColor(!json && flags['no-color'] !== true && !process.env['NO_COLOR'] && process.stdout.isTTY === true);

  if (flags['version'] === true) { out('0.1.0'); return 0; }
  if (flags['help'] === true || pos.length === 0) { out(usage()); return pos.length === 0 && flags['help'] !== true ? 2 : 0; }

  const cmd = pos[0] as string;
  try {
    switch (cmd) {
      case 'init':    return cmdInit(flags, json);
      case 'node':    return cmdNode(pos.slice(1), flags, json);
      case 'list':    return cmdList(flags, json);
      case 'why':     return cmdWhy(pos[1], flags, json);
      case 'check':   return cmdCheck(flags, json);
      case 'status':  return cmdStatus(flags, json);
      case 'context': return cmdContext(pos[1], flags, json);
      case 'agents':  return cmdAgents(pos.slice(1), flags, json);
      case 'help':    out(usage()); return 0;
      default:
        fail(json, 2, `unknown command '${cmd}'`, `Run 'product --help' for usage.`);
        return 2;
    }
  } catch (err) {
    if (err instanceof WorkspaceNotFound) { fail(json, 3, err.message); return 3; }
    if (err instanceof Refused) { fail(json, 4, err.message, err.hint); return 4; }
    fail(json, 2, (err as Error).message);
    return 2;
  }
}

// ------------------------------------------------------------------ cmds

function cmdInit(flags: Flags, json: boolean): number {
  const root = resolve(str(flags['workspace']) ?? process.cwd());
  const res = init(root, { name: str(flags['name']), productDir: str(flags['product-dir']) });
  if (json) return emit({ ok: true, root: res.root, created: res.created });
  out(`${green('Created')} an AI Product OS workspace in ${cyan(res.root)}\n`);
  for (const c of res.created) out(`  ${dim('+')} ${c}`);
  out(`\nNext:\n  1. Describe the idea in ${cyan('product/00-context/idea.md')}`);
  out(`  2. Capture what a user actually needs:`);
  out(`     ${cyan('product node new NEED --title "..." --evidence "how you know"')}`);
  out(`  3. ${cyan('product status')}   to see where you are`);
  return 0;
}

function cmdNode(args: string[], flags: Flags, json: boolean): number {
  const sub = args[0];
  const actor = str(flags['agent']) ? { agent: str(flags['agent']) as string } : {};

  if (sub === 'new') {
    const ws = open(flags);
    const kind = (args[1] ?? '').toUpperCase() as Kind;
    if (!(KIND_LIST as readonly string[]).includes(kind)) {
      fail(json, 2, `unknown kind '${args[1] ?? ''}'`, `valid kinds: ${KIND_LIST.join(', ')}`);
      return 2;
    }
    const title = str(flags['title']);
    if (!title) { fail(json, 2, '--title is required'); return 2; }
    const res = newNode(ws, {
      kind, title,
      ...(str(flags['parent']) ? { parent: str(flags['parent']) as string } : {}),
      ...(str(flags['edge']) ? { edge: str(flags['edge']) as EdgeType } : {}),
      ...(str(flags['epistemic']) ? { epistemic: str(flags['epistemic']) as Epistemic } : {}),
      ...(str(flags['confidence']) ? { confidence: str(flags['confidence']) as string } : {}),
      ...(str(flags['evidence']) ? { evidence: str(flags['evidence']) as string } : {}),
      ...(str(flags['body']) ? { body: str(flags['body']) as string } : {}),
    }, actor);
    if (json) return emit({ ok: true, id: res.id, path: res.path, warnings: res.warnings });
    out(`${green('Created')} ${bold(res.id)}  ${res.path}`);
    for (const w of res.warnings) out(`${yellow('  ! ')}${w}`);
    return 0;
  }

  if (sub === 'show') {
    const ws = open(flags);
    const id = args[1];
    const node = id ? ws.graph.node(id) : undefined;
    if (!node) { fail(json, 2, `${id ?? '<ID>'} not found`); return 2; }
    if (json) return emit({ ok: true, node });
    out(`${bold(node.id)}  ${node.title}`);
    out(`${dim('kind')} ${node.kind}   ${dim('status')} ${node.status}   ${dim('epistemic')} ${node.epistemic}${node.confidence ? ` (${node.confidence})` : ''}`);
    out(`${dim('file')} ${node.file}`);
    if (node.evidence) out(`${dim('evidence')} ${node.evidence.replace(/\n/g, ' ')}`);
    for (const [edge, targets] of Object.entries(node.links)) out(`${dim(edge)} ${(targets as string[]).join(', ')}`);
    const back = ws.graph.edgesTo(node.id);
    if (back.length) out(`${dim('referenced by')} ${back.map((e) => e.from).join(', ')}`);
    if (node.body.trim()) { out(''); out(node.body.trim()); }
    return 0;
  }

  if (sub === 'link' || sub === 'unlink') {
    const ws = open(flags);
    const [from, edge, to] = [args[1], args[2] as EdgeType, args[3]];
    if (!from || !edge || !to) { fail(json, 2, `usage: product node ${sub} <FROM-ID> <EDGE> <TO-ID>`); return 2; }
    (sub === 'link' ? link : unlink)(ws, from, edge, to, actor);
    if (json) return emit({ ok: true, from, edge, to, action: sub });
    out(`${green(sub === 'link' ? 'Linked' : 'Unlinked')} ${bold(from)} ${dim(edge)} ${bold(to)}`);
    return 0;
  }

  if (sub === 'accept') {
    const ws = open(flags);
    const ids = args.slice(1);
    if (!ids.length) { fail(json, 2, 'usage: product node accept <ID>...'); return 2; }
    for (const id of ids) accept(ws, id, actor);
    if (json) return emit({ ok: true, accepted: ids });
    out(`${green('Accepted')} ${ids.map((i) => bold(i)).join(', ')}`);
    return 0;
  }

  if (sub === 'drop') {
    const ws = open(flags);
    const id = args[1];
    if (!id) { fail(json, 2, 'usage: product node drop <ID> [--superseded-by <ID>]'); return 2; }
    drop(ws, id, str(flags['superseded-by']), actor);
    if (json) return emit({ ok: true, dropped: id, superseded_by: str(flags['superseded-by']) ?? null });
    out(`${green('Dropped')} ${bold(id)}`);
    return 0;
  }

  fail(json, 2, `usage: product node <new|show|link|unlink|accept|drop>`);
  return 2;
}

function cmdList(flags: Flags, json: boolean): number {
  const ws = open(flags);
  const rows = list(ws, ws.graph, {
    ...(str(flags['kind']) ? { kind: str(flags['kind'])!.toUpperCase() as Kind } : {}),
    ...(str(flags['status']) ? { status: str(flags['status']) as Status } : {}),
    ...(str(flags['epistemic']) ? { epistemic: str(flags['epistemic']) as Epistemic } : {}),
    orphans: flags['orphans'] === true,
    unvalidated: flags['unvalidated'] === true,
  });
  if (json) return emit({ ok: true, count: rows.length, nodes: rows });
  if (!rows.length) { out(dim('no nodes match')); return 0; }
  for (const r of rows) {
    const upstream = r.upstream.length ? dim(` -> ${r.upstream.join(', ')}`) : dim(' (root)');
    out(`${bold(r.id.padEnd(10))} ${dim(r.status.padEnd(10))} ${r.title}${upstream}`);
  }
  out('');
  out(dim(`${rows.length} node${rows.length === 1 ? '' : 's'}`));
  return 0;
}

function cmdWhy(id: string | undefined, flags: Flags, json: boolean): number {
  if (!id) { fail(json, 2, 'usage: product why <ID>'); return 2; }
  const ws = open(flags);
  const depth = str(flags['depth']) ? Number(str(flags['depth'])) : Infinity;
  const res = why(ws.graph, id, depth);
  if (!res.found) { fail(json, 2, `${id} not found`); return 2; }
  if (json) return emit({ ok: true, ...res });  // warnings are never stripped in JSON (§9.2)
  out(renderWhy(res, { footer: flags['no-footer'] !== true }));
  return 0;
}

function cmdCheck(flags: Flags, json: boolean): number {
  const ws = open(flags);
  const findings = evaluate(ws, str(flags['rule']));
  const filtered = str(flags['severity'])
    ? findings.filter((f) => f.severity === str(flags['severity']))
    : findings;
  const errors = filtered.filter((f) => f.severity === 'error').length;
  if (json) { emit({ ok: errors === 0, errors, warnings: filtered.length - errors, findings: filtered }); return errors ? 1 : 0; }
  out(renderCheck(filtered));
  return errors ? 1 : 0;
}

function cmdStatus(flags: Flags, json: boolean): number {
  const ws = open(flags);
  const res = status(ws, ws.graph, evaluate(ws));
  if (json) return emit({ ok: true, ...res });
  out(renderStatus(res));
  return 0;
}

function cmdContext(id: string | undefined, flags: Flags, json: boolean): number {
  if (!id) { fail(json, 2, 'usage: product context <ID>'); return 2; }
  const ws = open(flags);
  const budget = str(flags['budget-tokens']);
  const res = context(ws.graph, id, {
    ...(budget ? { budgetTokens: Number(budget) } : {}),
    ...(str(flags['direction']) ? { direction: str(flags['direction']) as 'up' | 'down' | 'both' } : {}),
  });
  if (!res.found) { fail(json, 2, `${id} not found`); return 2; }
  if (json) return emit({ ok: true, ...res });
  process.stdout.write(`${res.markdown}\n`);
  return 0;
}

function cmdAgents(args: string[], flags: Flags, json: boolean): number {
  const sub = args[0] ?? 'list';

  if (sub === 'list') {
    const contracts = loadAll();
    if (json) return emit({ ok: true, agents: contracts.map(summary) });
    for (const c of contracts) {
      out(`${bold(c.name.padEnd(20))} ${dim('creates')} ${c.writes.join(', ') || dim('nothing (review only)')}`);
      const hard = c.prohibitions.filter((p) => p.enforced_by === 'cli').length;
      const soft = c.prohibitions.filter((p) => p.enforced_by === 'prompt').length;
      out(`${' '.repeat(20)} ${dim(`${hard} prohibitions enforced by the CLI, ${soft} on the model`)}`);
    }
    return 0;
  }

  if (sub === 'show') {
    const name = args[1];
    if (!name) { fail(json, 2, `usage: product agents show <name>`, `known: ${agentNames().join(', ')}`); return 2; }
    const c = loadContract(name);
    if (json) return emit({ ok: true, agent: c });
    out(`${bold(c.name)}  ${dim(`v${c.version}`)}`);
    out(c.role);
    out('');
    out(`${dim('creates')}  ${c.writes.join(', ') || 'nothing'}`);
    out(`${dim('reads')}    ${c.reads.join(', ')}`);
    for (const p of c.prohibitions) {
      const tagLabel = p.enforced_by === 'cli' ? green('[enforced]') : yellow('[prompt]  ');
      out(`  ${tagLabel} ${p.rule}`);
    }
    return 0;
  }

  if (sub === 'build') {
    const root = resolve(str(flags['workspace']) ?? process.cwd());
    const files = generate(loadAll());
    const outDir = str(flags['out']);

    if (flags['check'] === true) {
      const stale = files.filter((f) => {
        const p = join(root, f.path);
        return !existsSync(p) || readFileSync(p, 'utf8') !== f.content;
      });
      if (json) { emit({ ok: stale.length === 0, stale: stale.map((f) => f.path) }); return stale.length ? 1 : 0; }
      if (stale.length) {
        out(`${yellow('stale')}  ${stale.length} generated file(s) differ from the contracts:`);
        for (const f of stale) out(`  ${f.path}`);
        out(dim(`Run 'product agents build' to regenerate.`));
        return 1;
      }
      out(green('OK  generated adapter matches the contracts'));
      return 0;
    }

    const written: string[] = [];
    for (const f of files) {
      const target = outDir ? join(root, outDir, f.path.slice(`${ADAPTER_ROOT}/`.length)) : join(root, f.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, f.content, 'utf8');
      written.push(target.slice(root.length + 1));
    }
    if (flags['install'] === true) {
      for (const f of files) {
        if (f.path.endsWith('README.md')) continue;
        const target = join(root, '.claude', f.path.slice(`${ADAPTER_ROOT}/`.length));
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, f.content, 'utf8');
        written.push(target.slice(root.length + 1));
      }
    }
    if (json) return emit({ ok: true, written });
    out(`${green('Generated')} ${written.length} file(s) from ${loadAll().length} contracts`);
    for (const w of written) out(`  ${dim('+')} ${w}`);
    if (flags['install'] !== true) {
      out('');
      out(dim(`Add --install to copy them into .claude/ for this project.`));
    }
    return 0;
  }

  fail(json, 2, 'usage: product agents <list|show|build>');
  return 2;
}

function summary(c: ReturnType<typeof loadContract>) {
  return {
    name: c.name, version: c.version, role: c.role,
    writes: c.writes, reads: c.reads,
    enforced: c.prohibitions.filter((p) => p.enforced_by === 'cli').length,
    prompt_only: c.prohibitions.filter((p) => p.enforced_by === 'prompt').length,
  };
}

// --------------------------------------------------------------- helpers

function open(flags: Flags): Loaded {
  return load(str(flags['workspace']));
}

function evaluate(ws: Loaded, only?: string): Finding[] {
  return runRules({ workspace: ws, graph: ws.graph, now: new Date() }, only ? [only] : undefined);
}

function emit(payload: object): number {
  process.stdout.write(`${JSON.stringify({ schema: SCHEMA, ...payload }, null, 2)}\n`);
  return 0;
}

function fail(json: boolean, code: number, message: string, hint?: string): void {
  if (json) {
    process.stderr.write(`${JSON.stringify({ schema: SCHEMA, ok: false, code, error: message, hint: hint ?? null }, null, 2)}\n`);
    return;
  }
  process.stderr.write(`${message}\n${hint ? `${hint}\n` : ''}`);
}

function out(s: string): void { process.stdout.write(`${s}\n`); }

function str(v: string | boolean | undefined): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v : undefined;
}

function usage(): string {
  return `${bold('product')} — AI Product OS. From idea to production, without losing the why.

${bold('Understand')}
  product why <ID>              why does this exist? the chain up to a business objective
  product context <ID>          the full reasoning bundle, for briefing a coding agent
  product status                structural completeness, and what rests on guesses
  product check                 validate the graph (exit 1 if errors)
  product list                  browse nodes  [--kind --status --orphans --unvalidated]

${bold('Build the graph')}
  product init                  scaffold a workspace  [--name --product-dir]
  product node new <KIND>       --title <t> [--parent <ID>] [--epistemic <e>] [--evidence <text>]
  product node link <A> <EDGE> <B>
  product node accept <ID>...   humans only: mark reasoning as real
  product node drop <ID>        [--superseded-by <ID>]
  product node show <ID>

${bold('Agents')}
  product agents list           the four agents and what each may create
  product agents show <name>    one contract, and which rules are actually enforced
  product agents build          regenerate the Claude Code adapter  [--install --check]

${bold('Kinds')}   ${KIND_LIST.join('  ')}

${bold('Global')}  --json  --workspace <path>  --no-color  --quiet  --agent <name>

${dim('Exit codes: 0 ok · 1 validation errors · 2 usage · 3 no workspace · 4 refused')}`;
}

process.exitCode = main(process.argv.slice(2));
