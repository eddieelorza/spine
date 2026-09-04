/**
 * `why` (Phase 3 §9). Walks upward, collects metrics and epistemic attachments,
 * and computes the honesty footer. Returns data — never strings.
 */
import type { Graph } from '../graph.js';
import { UNVALIDATED, UPWARD_EDGES, type EdgeType, type Node } from '../types.js';

export interface WhyStep {
  id: string;
  edge: EdgeType | null;
  depth: number;
  node: Node | null;
  /** Set when this ancestor was already rendered on another branch (diamond). */
  alsoVia?: string;
  children: WhyStep[];
}

export interface WhyWarning {
  kind: 'unvalidated' | 'open_assumption' | 'open_question' | 'risk' | 'missing';
  id: string;
  detail: string;
}

export interface WhyResult {
  start: string;
  found: boolean;
  tree: WhyStep | null;
  roots: string[];
  metrics: Node[];
  attachments: Node[];
  warnings: WhyWarning[];
  visitedCount: number;
}

const ATTACHMENT_EDGES: EdgeType[] = ['assumes', 'questions', 'risks'];

export function why(graph: Graph, id: string, maxDepth = Infinity): WhyResult {
  const start = graph.node(id);
  if (!start) {
    return { start: id, found: false, tree: null, roots: [], metrics: [], attachments: [], warnings: [], visitedCount: 0 };
  }

  const visited = new Map<string, WhyStep>();
  const roots: string[] = [];

  const build = (nodeId: string, edge: EdgeType | null, depth: number): WhyStep => {
    const node = graph.node(nodeId) ?? null;
    const step: WhyStep = { id: nodeId, edge, depth, node, children: [] };

    const already = visited.get(nodeId);
    if (already) {
      // Diamond: render once, mark the second path rather than duplicating the subtree.
      step.alsoVia = already.id;
      return step;
    }
    visited.set(nodeId, step);

    if (!node || depth >= maxDepth) return step;

    // Stable ordering: edge type in UPWARD_EDGES order, then numeric id (§9.3).
    const next = graph
      .edgesFrom(nodeId, UPWARD_EDGES)
      .sort((a, b) => {
        const e = UPWARD_EDGES.indexOf(a.edge) - UPWARD_EDGES.indexOf(b.edge);
        return e !== 0 ? e : numericId(a.to) - numericId(b.to);
      });

    if (next.length === 0) roots.push(nodeId);
    for (const e of next) step.children.push(build(e.to, e.edge, depth + 1));
    return step;
  };

  const tree = build(id, null, 0);

  const metrics: Node[] = [];
  const attachments: Node[] = [];
  const warnings: WhyWarning[] = [];
  const seenMetric = new Set<string>();
  const seenAttach = new Set<string>();

  for (const visitedId of visited.keys()) {
    const n = graph.node(visitedId);
    if (!n) {
      warnings.push({ kind: 'missing', id: visitedId, detail: 'referenced but does not exist' });
      continue;
    }
    if (UNVALIDATED.includes(n.epistemic)) {
      warnings.push({
        kind: 'unvalidated', id: n.id,
        detail: `${n.epistemic}${n.confidence ? ` · ${n.confidence} confidence` : ''}${n.evidence ? '' : ', no evidence recorded'}`,
      });
    }
    for (const e of graph.edgesFrom(visitedId, ['measured_by'])) {
      const m = graph.node(e.to);
      if (m && !seenMetric.has(m.id)) { seenMetric.add(m.id); metrics.push(m); }
    }
    for (const e of graph.edgesFrom(visitedId, ATTACHMENT_EDGES)) {
      const a = graph.node(e.to);
      if (!a || seenAttach.has(a.id)) continue;
      seenAttach.add(a.id);
      attachments.push(a);
      if (a.kind === 'ASSUM' && a.status !== 'accepted' && a.status !== 'dropped') {
        warnings.push({ kind: 'open_assumption', id: a.id, detail: a.title });
      } else if (a.kind === 'QUES' && !a.extra['answer']) {
        warnings.push({ kind: 'open_question', id: a.id, detail: a.title });
      } else if (a.kind === 'RISK' && a.status !== 'dropped') {
        warnings.push({ kind: 'risk', id: a.id, detail: a.title });
      }
    }
  }

  metrics.sort((a, b) => numericId(a.id) - numericId(b.id));
  attachments.sort((a, b) => a.id.localeCompare(b.id));

  return {
    start: id, found: true, tree, roots,
    metrics, attachments, warnings,
    visitedCount: visited.size,
  };
}

export function numericId(id: string): number {
  return Number(id.split('-')[1] ?? 0);
}
