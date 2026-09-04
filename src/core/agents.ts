/**
 * Agent contracts (Phase 3 §4). The contract is the tool-neutral source of truth:
 * adapters are generated from it, and the CLI enforces its whitelist at write time.
 * Six of the nine prohibitions are structural because of this module.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { exists, isDir, read } from './fs.js';
import { parseFile } from './parse.js';
import { toStringList } from './schema.js';
import { EDGE_LIST, KIND_LIST, type EdgeType, type Epistemic, type Kind } from './types.js';

export interface Prohibition {
  rule: string;
  enforced_by: 'cli' | 'prompt';
  note?: string;
}

export interface AgentContract {
  name: string;
  version: number;
  role: string;
  reads: Kind[];
  writes: Kind[];
  narrative_writes: string[];
  preconditions: string[];
  epistemic_defaults: Partial<Record<Kind, { epistemic: Epistemic; confidence?: string }>>;
  required_links: Partial<Record<Kind, EdgeType[]>>;
  prohibitions: Prohibition[];
  done_when: string[];
  handoff: { next?: string; message?: string };
  /** The prompt body: everything after the frontmatter. */
  instructions: string;
  file: string;
}

export class ContractError extends Error {}

/** Resolves spec/agents whether running from source, from dist, or from an npm install. */
export function specDir(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, 'spec', 'agents');
    if (isDir(candidate)) return candidate;
    dir = dirname(dir);
  }
  throw new ContractError('Could not locate spec/agents relative to the installed package.');
}

export function contractPath(name: string): string {
  return join(specDir(), `${name}.agent.md`);
}

export function agentNames(): string[] {
  return ['product-discovery', 'product-manager', 'system-analyst', 'product-critic']
    .filter((n) => exists(contractPath(n)));
}

export function loadContract(name: string): AgentContract {
  const file = contractPath(name);
  if (!exists(file)) {
    throw new ContractError(`No agent contract for '${name}'. Known agents: ${agentNames().join(', ')}`);
  }
  const parsed = parseFile(file, read(file));
  if (!parsed.ok) throw new ContractError(`${file}: ${parsed.broken.message}`);
  const f = parsed.raw.front;

  const kinds = (key: string): Kind[] => {
    const list = toStringList(f[key]) ?? [];
    for (const k of list) {
      if (!(KIND_LIST as readonly string[]).includes(k)) {
        throw new ContractError(`${name}: '${k}' in ${key} is not a known kind`);
      }
    }
    return list as Kind[];
  };

  const requiredLinks: Partial<Record<Kind, EdgeType[]>> = {};
  for (const [kind, val] of Object.entries((f['required_links'] ?? {}) as Record<string, unknown>)) {
    if (!(KIND_LIST as readonly string[]).includes(kind)) {
      throw new ContractError(`${name}: required_links names unknown kind '${kind}'`);
    }
    const edges = toStringList(val) ?? [];
    for (const e of edges) {
      if (!(EDGE_LIST as readonly string[]).includes(e)) {
        throw new ContractError(`${name}: required_links.${kind} names unknown edge '${e}'`);
      }
    }
    requiredLinks[kind as Kind] = edges as EdgeType[];
  }

  const prohibitions = (Array.isArray(f['prohibitions']) ? f['prohibitions'] : []).map((p) => {
    const o = p as Record<string, unknown>;
    const enforced = String(o['enforced_by'] ?? 'prompt');
    if (enforced !== 'cli' && enforced !== 'prompt') {
      throw new ContractError(`${name}: prohibition enforced_by must be 'cli' or 'prompt', got '${enforced}'`);
    }
    return {
      rule: String(o['rule'] ?? ''),
      enforced_by: enforced,
      ...(o['note'] ? { note: String(o['note']) } : {}),
    } as Prohibition;
  });

  return {
    name: String(f['name'] ?? name),
    version: Number(f['version'] ?? 1),
    role: String(f['role'] ?? '').trim(),
    reads: kinds('reads'),
    writes: kinds('writes'),
    narrative_writes: toStringList(f['narrative_writes']) ?? [],
    preconditions: toStringList(f['preconditions']) ?? [],
    epistemic_defaults: (f['epistemic_defaults'] ?? {}) as AgentContract['epistemic_defaults'],
    required_links: requiredLinks,
    prohibitions,
    done_when: toStringList(f['done_when']) ?? [],
    handoff: (f['handoff'] ?? {}) as AgentContract['handoff'],
    instructions: parsed.raw.body.trim(),
    file,
  };
}

export function loadAll(): AgentContract[] {
  return agentNames().map(loadContract);
}

/** May this agent create or mutate a node of this kind? The §4.2 hard whitelist. */
export function mayWrite(contract: AgentContract, kind: Kind): boolean {
  return contract.writes.includes(kind);
}
