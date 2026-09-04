/**
 * The rule engine (Phase 3 §7). Rules are declared as data in spec/rules/rules.yaml
 * and implemented here by ID. A contract test asserts the two never drift apart.
 */
import { KINDS, describeAllowed, isEdgeValid } from './kinds.js';
import type { Graph } from './graph.js';
import {
  UNVALIDATED, type EdgeType, type Finding, type Kind, type Severity, type Workspace,
} from './types.js';

export const HEDGE_WORDS = ['etc.', 'and so on', 'as appropriate', 'properly', 'if needed', 'and more', 'as required'];
export const UNVALIDATED_DESCENDANT_THRESHOLD = 5;
export const STALE_DRAFT_DAYS = 14;

export interface RuleContext {
  workspace: Workspace;
  graph: Graph;
  now: Date;
}

export type RuleFn = (ctx: RuleContext) => Finding[];

export const IMPLEMENTED: Record<string, RuleFn> = {
  E001: dangling,
  E002: duplicateId,
  E003: invalidEdge,
  E004: cycles,
  E005: orphan,
  E006: kpiNotMeasurable,
  E007: factWithoutEvidence,
  E008: malformed,
  W101: featureWithoutMetric,
  W102: unvalidatedFoundation,
  W103: intentWithoutWork,
  W104: weakAcceptanceCriteria,
  W105: staleDraft,
  W106: linkToRetired,
  W107: softCap,
};

const DEFAULT_SEVERITY: Record<string, Severity> = Object.fromEntries(
  Object.keys(IMPLEMENTED).map((id) => [id, id.startsWith('E') ? 'error' : 'warn']),
);

export function runRules(ctx: RuleContext, only?: string[]): Finding[] {
  const overrides = ctx.workspace.config.rules ?? {};
  const findings: Finding[] = [];
  for (const [id, fn] of Object.entries(IMPLEMENTED)) {
    if (only && !only.includes(id)) continue;
    const severity = overrides[id] ?? DEFAULT_SEVERITY[id] ?? 'warn';
    if (severity === 'off') continue;
    for (const f of fn(ctx)) findings.push({ ...f, severity });
  }
  return findings.sort(bySeverityThenId);
}

// ---------------------------------------------------------------- errors

function dangling({ graph }: RuleContext): Finding[] {
  const out: Finding[] = [];
  for (const e of graph.out) {
    if (graph.has(e.to)) continue;
    const n = graph.node(e.from);
    out.push({
      rule: 'E001', severity: 'error', node: e.from, file: n?.file,
      message: `${e.from} → ${e.to} does not exist (links.${e.edge})`,
      fix: `create ${e.to}, or remove it from links.${e.edge} in ${n?.file ?? e.from}`,
    });
  }
  return out;
}

function duplicateId({ workspace }: RuleContext): Finding[] {
  const byId = new Map<string, string[]>();
  for (const n of workspace.nodes) {
    const list = byId.get(n.id);
    if (list) list.push(n.file); else byId.set(n.id, [n.file]);
  }
  return [...byId.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([id, files]) => ({
      rule: 'E002', severity: 'error' as Severity, node: id, file: files[0],
      message: `${id} is defined in ${files.length} files: ${files.join(', ')}`,
      fix: `keep one; recreate the other with 'product node new' and link it with 'supersedes'`,
    }));
}

function invalidEdge({ graph }: RuleContext): Finding[] {
  const out: Finding[] = [];
  for (const e of graph.out) {
    const from = graph.node(e.from);
    const to = graph.node(e.to);
    if (!from || !to) continue; // dangling is E001's job
    if (isEdgeValid(from.kind, e.edge, to.kind)) continue;
    out.push({
      rule: 'E003', severity: 'error', node: e.from, file: from.file,
      message: `${e.from} ${e.edge} ${e.to} — ${describeAllowed(from.kind, e.edge)}`,
      fix: `remove ${e.to} from links.${e.edge} in ${from.file}`,
    });
  }
  return out;
}

function cycles({ graph }: RuleContext): Finding[] {
  return graph.cycles.map((c) => ({
    rule: 'E004', severity: 'error' as Severity, node: c[0], file: graph.node(c[0] ?? '')?.file,
    message: `cycle: ${c.join(' → ')}`,
    fix: `break the loop by removing one link in the chain`,
  }));
}

function orphan({ workspace, graph }: RuleContext): Finding[] {
  return workspace.nodes
    .filter((n) => !KINDS[n.kind].root && n.status !== 'dropped' && !graph.hasUpstream(n.id))
    .map((n) => {
      const required = KINDS[n.kind].requiredLinks;
      return {
        rule: 'E005', severity: 'error' as Severity, node: n.id, file: n.file, line: 1,
        message: `${n.id} has no upstream link — it traces to no intent`,
        fix: `product node link ${n.id} ${required[0] ?? 'derives_from'} <ID>`,
      };
    });
}

function kpiNotMeasurable({ workspace }: RuleContext): Finding[] {
  return workspace.nodes
    .filter((n) => n.kind === 'KPI')
    .flatMap((n) => {
      const missing = ['definition', 'target'].filter((f) => empty(n.extra[f]));
      if (!missing.length) return [];
      return [{
        rule: 'E006', severity: 'error' as Severity, node: n.id, file: n.file,
        message: `${n.id} is not measurable — missing ${missing.join(' and ')}`,
        fix: `add ${missing.join(' and ')} to ${n.file}; if you cannot state a target, it is not a KPI`,
      }];
    });
}

function factWithoutEvidence({ workspace }: RuleContext): Finding[] {
  return workspace.nodes
    .filter((n) => n.epistemic === 'fact' && empty(n.evidence))
    .map((n) => ({
      rule: 'E007', severity: 'error' as Severity, node: n.id, file: n.file,
      message: `${n.id} claims 'fact' with no evidence recorded`,
      fix: `add evidence, or change epistemic to 'hypothesis' in ${n.file}`,
    }));
}

/** Fields a dedicated rule already reports, with a better message than a generic one. */
const OWNED_BY_RULE: Partial<Record<Kind, string[]>> = {
  KPI: ['definition', 'target'],   // E006
  US: ['acceptance_criteria'],     // W104
};

function malformed({ workspace }: RuleContext): Finding[] {
  const out: Finding[] = workspace.broken.map((b) => ({
    rule: 'E008', severity: 'error' as Severity, node: b.id, file: b.file, line: b.line,
    message: b.message,
  }));
  for (const n of workspace.nodes) {
    const owned = OWNED_BY_RULE[n.kind] ?? [];
    for (const field of KINDS[n.kind].requiredFields) {
      if (owned.includes(field) || !empty(n.extra[field])) continue;
      out.push({
        rule: 'E008', severity: 'error', node: n.id, file: n.file,
        message: `${n.id} is missing required field '${field}' for kind ${n.kind}`,
        fix: `add '${field}:' to ${n.file}`,
      });
    }
  }
  return out;
}

// -------------------------------------------------------------- warnings

function featureWithoutMetric({ workspace, graph }: RuleContext): Finding[] {
  return workspace.nodes
    .filter((n) => n.kind === 'FEAT' && n.status !== 'dropped' && graph.edgesFrom(n.id, ['measured_by']).length === 0)
    .map((n) => ({
      rule: 'W101', severity: 'warn' as Severity, node: n.id, file: n.file,
      message: `${n.id} has no success metric`,
      fix: `product node link ${n.id} measured_by <KPI-ID>`,
    }));
}

function unvalidatedFoundation({ workspace, graph }: RuleContext): Finding[] {
  return workspace.nodes
    .filter((n) => n.kind === 'NEED' && UNVALIDATED.includes(n.epistemic))
    .flatMap((n) => {
      const count = graph.descendants(n.id).size;
      if (count < UNVALIDATED_DESCENDANT_THRESHOLD) return [];
      return [{
        rule: 'W102', severity: 'warn' as Severity, node: n.id, file: n.file,
        message: `${n.id} is a ${n.epistemic} with ${count} descendants — substantial work on unvalidated ground`,
        fix: `validate it and set epistemic: fact with evidence, or accept the risk explicitly`,
      }];
    });
}

function intentWithoutWork({ workspace, graph }: RuleContext): Finding[] {
  return workspace.nodes
    .filter((n) => (n.kind === 'OBJ' || n.kind === 'GOAL') && n.status !== 'dropped' && graph.descendants(n.id).size === 0)
    .map((n) => ({
      rule: 'W103', severity: 'warn' as Severity, node: n.id, file: n.file,
      message: `${n.id} has no descendants — stated intent nobody is working on`,
      fix: `link work to it, or drop it: product node drop ${n.id}`,
    }));
}

function weakAcceptanceCriteria({ workspace }: RuleContext): Finding[] {
  const out: Finding[] = [];
  for (const n of workspace.nodes) {
    if (n.kind !== 'US' || n.status === 'dropped') continue;
    const ac = Array.isArray(n.extra['acceptance_criteria']) ? (n.extra['acceptance_criteria'] as unknown[]).map(String) : [];
    if (ac.length === 0) {
      out.push({
        rule: 'W104', severity: 'warn', node: n.id, file: n.file,
        message: `${n.id} has no acceptance criteria`,
        fix: `add acceptance_criteria to ${n.file}`,
      });
      continue;
    }
    const hedged = ac.filter((c) => HEDGE_WORDS.some((w) => c.toLowerCase().includes(w)));
    for (const c of hedged) {
      out.push({
        rule: 'W104', severity: 'warn', node: n.id, file: n.file,
        message: `${n.id} has hedged acceptance criteria: "${truncate(c, 60)}"`,
        fix: `state the condition precisely enough to be testable`,
      });
    }
  }
  return out;
}

function staleDraft({ workspace, now }: RuleContext): Finding[] {
  const cutoff = now.getTime() - STALE_DRAFT_DAYS * 86_400_000;
  return workspace.nodes
    .filter((n) => n.status === 'draft' && Date.parse(n.provenance.updated) < cutoff)
    .map((n) => {
      const days = Math.floor((now.getTime() - Date.parse(n.provenance.updated)) / 86_400_000);
      return {
        rule: 'W105', severity: 'warn' as Severity, node: n.id, file: n.file,
        message: `${n.id} has been a draft for ${days} days`,
        fix: `product node accept ${n.id}   (or drop it)`,
      };
    });
}

function linkToRetired({ graph }: RuleContext): Finding[] {
  const out: Finding[] = [];
  for (const e of graph.out) {
    if (e.edge === 'supersedes') continue;
    const to = graph.node(e.to);
    const from = graph.node(e.from);
    if (!to || !from) continue;
    if (to.status !== 'superseded' && to.status !== 'dropped') continue;
    out.push({
      rule: 'W106', severity: 'warn', node: e.from, file: from.file,
      message: `${e.from} links to ${e.to}, which is ${to.status}`,
      fix: `repoint links.${e.edge} at the replacement`,
    });
  }
  return out;
}

function softCap({ workspace }: RuleContext): Finding[] {
  const caps = workspace.config.limits?.soft_cap ?? {};
  const counts = new Map<Kind, number>();
  for (const n of workspace.nodes) {
    if (n.status === 'dropped') continue;
    counts.set(n.kind, (counts.get(n.kind) ?? 0) + 1);
  }
  return Object.entries(caps).flatMap(([kind, cap]) => {
    const count = counts.get(kind as Kind) ?? 0;
    if (typeof cap !== 'number' || count <= cap) return [];
    return [{
      rule: 'W107', severity: 'warn' as Severity,
      message: `${count} ${kind} nodes exceeds the soft cap of ${cap} — is the graph still navigable?`,
      fix: `raise limits.soft_cap.${kind} in .product/config.yaml, or consolidate`,
    }];
  });
}

// ---------------------------------------------------------------- helpers

function empty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

const SEVERITY_ORDER: Record<string, number> = { error: 0, warn: 1, info: 2, off: 3 };

function bySeverityThenId(a: Finding, b: Finding): number {
  const s = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
  if (s !== 0) return s;
  if (a.rule !== b.rule) return a.rule.localeCompare(b.rule);
  return (a.node ?? '').localeCompare(b.node ?? '');
}

export type { EdgeType };
