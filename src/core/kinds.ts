/**
 * The normative kind + edge model (Phase 3 §5.3, §6.3).
 * This module is the single source of truth for structure. Rules read it; they do not restate it.
 */
import type { EdgeType, Kind } from './types.js';

export interface KindDef {
  /** Default folder for `node new`. Decorative — `kind` in frontmatter is authoritative. */
  folder: string;
  label: string;
  /** A root kind needs no upstream link; a non-root kind without one is an orphan (E005). */
  root: boolean;
  /** At least one of these edges must be present on a non-root kind. */
  requiredLinks: EdgeType[];
  /** Kind-specific frontmatter fields that must be present and non-empty. */
  requiredFields: string[];
  optionalFields: string[];
}

export const KINDS: Record<Kind, KindDef> = {
  OBJ:   { folder: '02-strategy/objectives',  label: 'Business Objective', root: true,  requiredLinks: [], requiredFields: [], optionalFields: [] },
  GOAL:  { folder: '02-strategy/goals',       label: 'Product Goal',       root: false, requiredLinks: ['serves'], requiredFields: [], optionalFields: [] },
  KPI:   { folder: '02-strategy/metrics',     label: 'Metric',             root: true,  requiredLinks: [], requiredFields: ['definition', 'target'], optionalFields: ['baseline', 'instrumentation'] },
  NEED:  { folder: '01-discovery/needs',      label: 'User Need',          root: true,  requiredLinks: [], requiredFields: ['who'], optionalFields: [] },
  FEAT:  { folder: '03-product/features',     label: 'Feature',            root: false, requiredLinks: ['addresses', 'serves'], requiredFields: [], optionalFields: [] },
  US:    { folder: '04-backlog/stories',      label: 'User Story',         root: false, requiredLinks: ['derives_from'], requiredFields: ['acceptance_criteria'], optionalFields: [] },
  TASK:  { folder: '05-delivery/tasks',       label: 'Technical Task',     root: false, requiredLinks: ['derives_from'], requiredFields: [], optionalFields: ['estimate', 'area'] },
  ASSUM: { folder: '01-discovery/assumptions', label: 'Assumption',        root: true,  requiredLinks: [], requiredFields: [], optionalFields: ['validation_method', 'validated_at'] },
  QUES:  { folder: '01-discovery/questions',  label: 'Open Question',      root: true,  requiredLinks: [], requiredFields: [], optionalFields: ['blocking', 'answer'] },
  DEC:   { folder: 'decisions',               label: 'Decision',           root: true,  requiredLinks: [], requiredFields: ['context', 'rationale'], optionalFields: ['options_considered'] },
  RISK:  { folder: 'decisions',               label: 'Risk',               root: true,  requiredLinks: [], requiredFields: [], optionalFields: ['likelihood', 'impact', 'mitigated_by'] },
};

export interface EdgeRule {
  edge: EdgeType;
  /** '*' means any kind. */
  from: Kind[] | '*';
  /** 'same' means the target must share the source's kind. */
  to: Kind[] | 'same';
}

/** Phase 3 §6.3. Anything not listed here is an invalid edge (E003). */
export const EDGE_MATRIX: EdgeRule[] = [
  { edge: 'serves',       from: ['GOAL'], to: ['OBJ'] },
  { edge: 'serves',       from: ['FEAT'], to: ['GOAL'] },
  { edge: 'addresses',    from: ['FEAT', 'US'], to: ['NEED'] },
  { edge: 'derives_from', from: ['US'], to: ['FEAT'] },
  { edge: 'derives_from', from: ['TASK'], to: ['US'] },
  { edge: 'depends_on',   from: ['TASK'], to: ['TASK'] },
  { edge: 'measured_by',  from: ['OBJ', 'GOAL', 'FEAT', 'US'], to: ['KPI'] },
  { edge: 'assumes',      from: '*', to: ['ASSUM'] },
  { edge: 'questions',    from: '*', to: ['QUES'] },
  { edge: 'decided_by',   from: '*', to: ['DEC'] },
  { edge: 'risks',        from: '*', to: ['RISK'] },
  { edge: 'supersedes',   from: '*', to: 'same' },
];

/** All (edge, targetKind) pairs legal from a given source kind. */
export function allowedTargets(from: Kind, edge: EdgeType): Kind[] | 'same' | null {
  const matches = EDGE_MATRIX.filter(
    (r) => r.edge === edge && (r.from === '*' || r.from.includes(from)),
  );
  if (matches.length === 0) return null;
  if (matches.some((m) => m.to === 'same')) return 'same';
  return matches.flatMap((m) => (m.to === 'same' ? [] : m.to));
}

export function isEdgeValid(from: Kind, edge: EdgeType, to: Kind): boolean {
  const allowed = allowedTargets(from, edge);
  if (allowed === null) return false;
  if (allowed === 'same') return from === to;
  return allowed.includes(to);
}

/** Human-readable description of what an edge may point at, for error messages. */
export function describeAllowed(from: Kind, edge: EdgeType): string {
  const allowed = allowedTargets(from, edge);
  if (allowed === null) {
    const legal = EDGE_MATRIX.filter((r) => r.from === '*' || r.from.includes(from)).map((r) => r.edge);
    return `${from} has no '${edge}' edge; it may use: ${[...new Set(legal)].join(', ')}`;
  }
  if (allowed === 'same') return `${from} ${edge} must target another ${from}`;
  return `${from} ${edge} may only target: ${allowed.join(', ')}`;
}

export function kindOfId(id: string): Kind | null {
  const prefix = id.split('-')[0];
  return (KIND_SET as Set<string>).has(prefix ?? '') ? (prefix as Kind) : null;
}

const KIND_SET = new Set(Object.keys(KINDS));
