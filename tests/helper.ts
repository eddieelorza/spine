/** Builds throwaway fixture workspaces on disk. Every test gets a real filesystem. */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { load, type Loaded } from '../src/core/load.js';
import { runRules } from '../src/core/rules.js';
import type { Finding } from '../src/core/types.js';

const roots: string[] = [];

export function makeWorkspace(files: Record<string, string>, config = 'schema_version: 1\nproduct: Test\npaths:\n  root: product\n'): string {
  const root = mkdtempSync(join(tmpdir(), 'apos-'));
  roots.push(root);
  write(join(root, '.product/config.yaml'), config);
  write(join(root, '.product/counters.yaml'), '{}\n');
  for (const [path, content] of Object.entries(files)) write(join(root, path), content);
  return root;
}

export function cleanup(): void {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
}

export function check(root: string): { ws: Loaded; findings: Finding[] } {
  const ws = load(root);
  return { ws, findings: runRules({ workspace: ws, graph: ws.graph, now: new Date() }) };
}

export function rules(root: string): string[] {
  return check(root).findings.map((f) => f.rule);
}

/** A minimal valid node. Override any frontmatter field. */
export function node(id: string, kind: string, extra: Record<string, unknown> = {}): string {
  const front: Record<string, unknown> = {
    id, kind, title: `${id} title`, status: 'accepted', epistemic: 'decision',
    evidence: 'test fixture',
    ...extra,
  };
  const lines = Object.entries(front).map(([k, v]) => `${k}: ${serialize(v, 0)}`);
  return `---\n${lines.join('\n')}\n---\n\nbody\n`;
}

function serialize(v: unknown, indent: number): string {
  const pad = '  '.repeat(indent + 1);
  if (Array.isArray(v)) return v.length ? `\n${v.map((x) => `${pad}- ${String(x)}`).join('\n')}` : '[]';
  if (v && typeof v === 'object') {
    return `\n${Object.entries(v as Record<string, unknown>).map(([k, x]) => `${pad}${k}:${serialize(x, indent + 1)}`).join('\n')}`;
  }
  return ` ${String(v)}`;
}

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

export const P = {
  need: (id: string) => `product/01-discovery/needs/${id}.md`,
  assum: (id: string) => `product/01-discovery/assumptions/${id}.md`,
  ques: (id: string) => `product/01-discovery/questions/${id}.md`,
  obj: (id: string) => `product/02-strategy/objectives/${id}.md`,
  goal: (id: string) => `product/02-strategy/goals/${id}.md`,
  kpi: (id: string) => `product/02-strategy/metrics/${id}.md`,
  feat: (id: string) => `product/03-product/features/${id}.md`,
  us: (id: string) => `product/04-backlog/stories/${id}.md`,
  task: (id: string) => `product/05-delivery/tasks/${id}.md`,
};
