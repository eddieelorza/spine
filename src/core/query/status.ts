/**
 * `status` (Phase 3 §8). Every number here is structural. Nothing consults a model,
 * and no stage gets a bar unless its checks are fully enumerable.
 */
import type { Graph } from '../graph.js';
import { UNVALIDATED, type Finding, type Kind, type Node, type Workspace } from '../types.js';

export interface Check { label: string; passed: boolean; detail?: string; }

export interface Stage {
  name: string;
  /** A bar renders only when the denominator is genuinely defined (§8.2). */
  enumerable: boolean;
  checks: Check[];
  counts?: Record<string, number>;
}

export interface Honesty {
  unvalidated_needs: string[];
  affected_stories: number;
  open_assumptions: string[];
  blocking_questions: string[];
  features_without_metric: string[];
  errors: number;
  warnings: number;
}

export interface StatusResult {
  product: string;
  stages: Stage[];
  honesty: Honesty;
  totals: Record<string, number>;
}

export function status(ws: Workspace, graph: Graph, findings: Finding[]): StatusResult {
  const of = (k: Kind): Node[] => ws.nodes.filter((n) => n.kind === k && n.status !== 'dropped');
  const accepted = (ns: Node[]): Node[] => ns.filter((n) => n.status === 'accepted');
  const errorsFor = (kinds: Kind[]): number =>
    findings.filter((f) => f.severity === 'error' && f.node && kinds.includes(kindOf(f.node))).length;
  const hasFile = (p: string): boolean => ws.narratives.some((n) => n.relPath.endsWith(p));

  const needs = of('NEED'), objs = of('OBJ'), goals = of('GOAL'), kpis = of('KPI');
  const feats = of('FEAT'), stories = of('US'), tasks = of('TASK');

  const discovery: Stage = {
    name: 'Discovery', enumerable: true,
    checks: [
      { label: 'at least one user need', passed: needs.length > 0, detail: `${needs.length}` },
      { label: 'problem definition written', passed: hasFile('problem-definition.md') },
      { label: 'assumptions or questions captured', passed: of('ASSUM').length + of('QUES').length > 0 },
      { label: 'all needs accepted', passed: needs.length > 0 && accepted(needs).length === needs.length, detail: `${accepted(needs).length}/${needs.length}` },
      { label: 'no errors', passed: errorsFor(['NEED', 'ASSUM', 'QUES']) === 0 },
    ],
  };

  const strategy: Stage = {
    name: 'Strategy', enumerable: true,
    checks: [
      { label: 'at least one objective', passed: objs.length > 0, detail: `${objs.length}` },
      { label: 'at least one goal', passed: goals.length > 0, detail: `${goals.length}` },
      { label: 'at least one KPI', passed: kpis.length > 0, detail: `${kpis.length}` },
      { label: 'every objective is measured', passed: objs.length > 0 && objs.every((o) => graph.edgesFrom(o.id, ['measured_by']).length > 0) },
      { label: 'every goal serves an objective', passed: goals.length > 0 && goals.every((g) => graph.edgesFrom(g.id, ['serves']).length > 0) },
      { label: 'all accepted', passed: [...objs, ...goals, ...kpis].length > 0 && [...objs, ...goals, ...kpis].every((n) => n.status === 'accepted') },
      { label: 'no errors', passed: errorsFor(['OBJ', 'GOAL', 'KPI']) === 0 },
    ],
  };

  const citedIds = new Set(ws.narratives.flatMap((n) => n.cites));
  const prd: Stage = {
    name: 'PRD', enumerable: true,
    checks: [
      { label: 'prd.md exists', passed: hasFile('prd.md') },
      { label: 'every feature cited', passed: feats.length > 0 && feats.every((f) => citedIds.has(f.id)), detail: `${feats.filter((f) => citedIds.has(f.id)).length}/${feats.length}` },
      { label: 'all features accepted', passed: feats.length > 0 && accepted(feats).length === feats.length, detail: `${accepted(feats).length}/${feats.length}` },
    ],
  };

  // Backlog and Delivery have no defined denominator — counts only, never a bar (P8).
  const orphanStories = stories.filter((s) => !graph.hasUpstream(s.id));
  const backlog: Stage = {
    name: 'Backlog', enumerable: false,
    checks: [
      { label: 'every feature has a story', passed: feats.length > 0 && feats.every((f) => graph.edgesTo(f.id, ['derives_from']).length > 0) },
      { label: 'no orphan stories', passed: orphanStories.length === 0, detail: orphanStories.length ? orphanStories.map((s) => s.id).join(', ') : undefined },
    ],
    counts: { stories: stories.length, accepted: accepted(stories).length, orphans: orphanStories.length },
  };

  const orphanTasks = tasks.filter((t) => !graph.hasUpstream(t.id));
  const delivery: Stage = {
    name: 'Delivery', enumerable: false,
    checks: [
      { label: 'every accepted story has a task', passed: accepted(stories).length > 0 && accepted(stories).every((s) => graph.edgesTo(s.id, ['derives_from']).length > 0) },
      { label: 'no orphan tasks', passed: orphanTasks.length === 0 },
    ],
    counts: { tasks: tasks.length, accepted: accepted(tasks).length, orphans: orphanTasks.length },
  };

  const unvalidatedNeeds = needs.filter((n) => UNVALIDATED.includes(n.epistemic));
  const affected = new Set<string>();
  for (const n of unvalidatedNeeds) {
    for (const d of graph.descendants(n.id)) if (kindOf(d) === 'US') affected.add(d);
  }

  const honesty: Honesty = {
    unvalidated_needs: unvalidatedNeeds.map((n) => n.id),
    affected_stories: affected.size,
    open_assumptions: of('ASSUM').filter((a) => a.status !== 'accepted').map((a) => a.id),
    blocking_questions: of('QUES').filter((q) => q.extra['blocking'] === true && !q.extra['answer']).map((q) => q.id),
    features_without_metric: feats.filter((f) => graph.edgesFrom(f.id, ['measured_by']).length === 0).map((f) => f.id),
    errors: findings.filter((f) => f.severity === 'error').length,
    warnings: findings.filter((f) => f.severity === 'warn').length,
  };

  const totals: Record<string, number> = {};
  for (const n of ws.nodes) totals[n.kind] = (totals[n.kind] ?? 0) + 1;

  return {
    product: ws.config.product,
    stages: [discovery, strategy, prd, backlog, delivery],
    honesty,
    totals,
  };
}

export function score(stage: Stage): { passed: number; total: number } {
  return { passed: stage.checks.filter((c) => c.passed).length, total: stage.checks.length };
}

function kindOf(id: string): Kind {
  return (id.split('-')[0] ?? '') as Kind;
}
