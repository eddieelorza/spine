/**
 * The only module that writes nodes (§1.4). Agents call these paths rather than editing
 * structured YAML themselves, which is what makes the guard-rails in §4.2 real.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { loadContract, mayWrite } from './agents.js';
import { KINDS, describeAllowed, isEdgeValid } from './kinds.js';
import { countersPath, load, type Loaded } from './load.js';
import { UNVALIDATED, type EdgeType, type Epistemic, type Kind, type Node, type Status } from './types.js';

/** Guard-rail violation. The CLI maps this to exit code 4, distinct from "graph has problems" (1). */
export class Refused extends Error {
  constructor(message: string, readonly hint?: string) { super(message); }
}

export interface Actor { agent?: string; }

function author(actor: Actor): string {
  return actor.agent ? `agent:${actor.agent}` : 'human';
}

/**
 * The §4.2 write whitelist. An agent may only touch the kinds its contract declares,
 * so "product-discovery cannot invent a roadmap" is a property of the tool, not of the prompt.
 */
function assertMayWrite(actor: Actor, kind: Kind, what: string): void {
  if (!actor.agent) return;
  const contract = loadContract(actor.agent);
  if (mayWrite(contract, kind)) return;
  throw new Refused(
    `Agent '${actor.agent}' may not ${what} a ${kind} node.`,
    `Its contract permits: ${contract.writes.join(', ') || '(nothing)'}.`,
  );
}

// ------------------------------------------------------------------ ids

export function allocateId(root: string, kind: Kind): string {
  const path = countersPath(root);
  const counters: Record<string, number> = existsSync(path)
    ? ((parseYaml(readFileSync(path, 'utf8')) as Record<string, number>) ?? {})
    : {};
  const next = (counters[kind] ?? 0) + 1;
  counters[kind] = next;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stringifyYaml(sortKeys(counters)), 'utf8');
  return `${kind}-${String(next).padStart(3, '0')}`;
}

// -------------------------------------------------------------- creation

export interface NewNodeInput {
  kind: Kind;
  title: string;
  parent?: string;
  edge?: EdgeType;
  epistemic?: Epistemic;
  confidence?: string;
  evidence?: string;
  body?: string;
  fields?: Record<string, unknown>;
  command?: string;
}

export interface NewNodeResult { id: string; path: string; warnings: string[]; }

export function newNode(ws: Loaded, input: NewNodeInput, actor: Actor = {}): NewNodeResult {
  assertMayWrite(actor, input.kind, 'create');
  const def = KINDS[input.kind];
  const warnings: string[] = [];
  const epistemic: Epistemic = input.epistemic ?? contractDefault(actor, input.kind) ?? defaultEpistemic(input.kind);

  // Guard: fact requires evidence (E007 made unwriteable, not merely detectable).
  if (epistemic === 'fact' && !input.evidence?.trim()) {
    throw new Refused(
      `Refusing to create a '${input.kind}' with epistemic: fact and no evidence.`,
      `Supply --evidence, or use --epistemic hypothesis.`,
    );
  }

  // Guard: no orphans. A non-root kind must be linked at creation time.
  if (!def.root && !input.parent) {
    throw new Refused(
      `Refusing to create an orphan ${input.kind}: it must link upstream at creation.`,
      `Pass --parent <ID> (expected edge: ${def.requiredLinks.join(' or ')}).`,
    );
  }

  let edge: EdgeType | undefined;
  if (input.parent) {
    const parent = ws.graph.node(input.parent);
    if (!parent) throw new Refused(`Parent ${input.parent} does not exist.`);
    edge = input.edge ?? inferEdge(input.kind, parent.kind);
    if (!edge) {
      throw new Refused(
        `No valid edge from ${input.kind} to ${parent.kind}.`,
        describeAllowed(input.kind, def.requiredLinks[0] ?? 'derives_from'),
      );
    }
    if (!isEdgeValid(input.kind, edge, parent.kind)) {
      throw new Refused(`${input.kind} ${edge} ${parent.kind} is not a valid edge.`, describeAllowed(input.kind, edge));
    }
  }

  for (const field of def.requiredFields) {
    if (input.fields?.[field] === undefined) {
      warnings.push(`${input.kind} requires '${field}' — the node will fail 'product check' until you add it.`);
    }
  }

  const id = allocateId(ws.root, input.kind);
  const now = new Date().toISOString();
  const front: Record<string, unknown> = {
    id,
    kind: input.kind,
    title: input.title,
    status: 'draft' as Status,
    epistemic,
  };
  if (input.confidence) front['confidence'] = input.confidence;
  if (input.evidence) front['evidence'] = input.evidence;
  if (edge && input.parent) front['links'] = { [edge]: [input.parent] };
  for (const [k, v] of Object.entries(input.fields ?? {})) front[k] = v;
  front['provenance'] = {
    author: author(actor),
    ...(input.command ? { command: input.command } : {}),
    created: now,
    updated: now,
  };

  const file = join(ws.productRoot, def.folder, `${id}.md`);
  mkdirSync(dirname(file), { recursive: true });
  const body = input.body?.trim() ? `${input.body.trim()}\n` : `_No description yet._\n`;
  writeFileSync(file, `---\n${stringifyYaml(front).trimEnd()}\n---\n\n${body}`, 'utf8');

  if (UNVALIDATED.includes(epistemic)) {
    warnings.push(`${id} is ${epistemic} with no evidence — 'product why' will flag anything built on it.`);
  }
  return { id, path: relTo(ws.root, file), warnings };
}

// ----------------------------------------------------------------- links

export function link(ws: Loaded, fromId: string, edge: EdgeType, toId: string, actor: Actor = {}): void {
  const from = requireNode(ws, fromId);
  const to = requireNode(ws, toId);
  assertMutable(from, actor);
  if (!isEdgeValid(from.kind, edge, to.kind)) {
    throw new Refused(`${fromId} ${edge} ${toId} is not a valid edge.`, describeAllowed(from.kind, edge));
  }
  if (fromId === toId) throw new Refused(`${fromId} cannot link to itself.`);

  editFront(ws, from, (front) => {
    const links = (front['links'] ?? {}) as Record<string, string[]>;
    const existing = links[edge] ?? [];
    if (existing.includes(toId)) throw new Refused(`${fromId} already links ${edge} -> ${toId}.`);
    links[edge] = [...existing, toId];
    front['links'] = links;
  }, actor);
}

export function unlink(ws: Loaded, fromId: string, edge: EdgeType, toId: string, actor: Actor = {}): void {
  const from = requireNode(ws, fromId);
  assertMutable(from, actor);
  editFront(ws, from, (front) => {
    const links = (front['links'] ?? {}) as Record<string, string[]>;
    const existing = links[edge] ?? [];
    if (!existing.includes(toId)) throw new Refused(`${fromId} has no ${edge} link to ${toId}.`);
    const next = existing.filter((t) => t !== toId);
    if (next.length) links[edge] = next; else delete links[edge];
    front['links'] = links;
  }, actor);
}

// ------------------------------------------------------------ lifecycle

export function accept(ws: Loaded, id: string, actor: Actor = {}): void {
  if (actor.agent) {
    throw new Refused(
      `Agents cannot accept nodes. Only a human decides what is real.`,
      `Ask the user to run: product node accept ${id}`,
    );
  }
  const node = requireNode(ws, id);
  if (node.status === 'accepted') throw new Refused(`${id} is already accepted.`);
  editFront(ws, node, (front) => {
    front['status'] = 'accepted';
    const prov = (front['provenance'] ?? {}) as Record<string, unknown>;
    prov['accepted_by'] = 'human';
    front['provenance'] = prov;
  }, actor);
}

export function drop(ws: Loaded, id: string, supersededBy?: string, actor: Actor = {}): void {
  const node = requireNode(ws, id);
  assertMutable(node, actor);
  if (supersededBy) {
    const replacement = requireNode(ws, supersededBy);
    if (replacement.kind !== node.kind) {
      throw new Refused(`supersedes must target the same kind (${node.kind}), got ${replacement.kind}.`);
    }
  }
  editFront(ws, node, (front) => {
    front['status'] = supersededBy ? 'superseded' : 'dropped';
    if (supersededBy) {
      const links = (front['links'] ?? {}) as Record<string, string[]>;
      links['supersedes'] = [...new Set([...(links['supersedes'] ?? []), supersededBy])];
      front['links'] = links;
    }
  }, actor);
}

// ------------------------------------------------------------- internals

function requireNode(ws: Loaded, id: string): Node {
  const n = ws.graph.node(id);
  if (!n) throw new Refused(`${id} does not exist.`);
  return n;
}

/** Guard: agents may never modify a node a human has accepted, nor a kind outside their contract. */
function assertMutable(node: Node, actor: Actor): void {
  assertMayWrite(actor, node.kind, 'modify');
  if (actor.agent && node.status === 'accepted') {
    throw new Refused(
      `${node.id} is accepted; agents may not modify accepted nodes.`,
      `Ask the user to change it, or create a replacement and supersede it.`,
    );
  }
}

function editFront(ws: Loaded, node: Node, fn: (front: Record<string, unknown>) => void, actor: Actor): void {
  const abs = join(ws.root, node.file);
  const text = readFileSync(abs, 'utf8');
  const lines = text.split(/\r?\n/);
  let end = -1;
  for (let i = 1; i < lines.length; i++) if (/^---\s*$/.test(lines[i] ?? '')) { end = i; break; }
  if (end === -1) throw new Refused(`${node.file} has no closing frontmatter fence.`);

  const front = (parseYaml(lines.slice(1, end).join('\n')) ?? {}) as Record<string, unknown>;
  fn(front);
  const prov = (front['provenance'] ?? {}) as Record<string, unknown>;
  prov['updated'] = new Date().toISOString();
  if (actor.agent) prov['author'] = author(actor);
  front['provenance'] = prov;

  const body = lines.slice(end + 1).join('\n');
  writeFileSync(abs, `---\n${stringifyYaml(front).trimEnd()}\n---\n${body}`, 'utf8');
}

/** An agent's contract may pin a stricter default than the kind's own. */
function contractDefault(actor: Actor, kind: Kind): Epistemic | undefined {
  if (!actor.agent) return undefined;
  return loadContract(actor.agent).epistemic_defaults[kind]?.epistemic;
}

/** Agent-created reasoning starts unvalidated. This is the schema-level anti-slop default. */
function defaultEpistemic(kind: Kind): Epistemic {
  switch (kind) {
    case 'NEED': return 'hypothesis';
    case 'ASSUM': return 'assumption';
    case 'QUES': return 'open_question';
    case 'DEC': return 'decision';
    default: return 'decision';
  }
}

function inferEdge(child: Kind, parent: Kind): EdgeType | undefined {
  for (const edge of KINDS[child].requiredLinks) if (isEdgeValid(child, edge, parent)) return edge;
  for (const edge of ['derives_from', 'addresses', 'serves', 'depends_on'] as EdgeType[]) {
    if (isEdgeValid(child, edge, parent)) return edge;
  }
  return undefined;
}

function sortKeys(o: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
}

function relTo(root: string, file: string): string {
  return file.startsWith(root) ? file.slice(root.length + 1) : file;
}

export { load };
