/** Core domain types. Pure data — no I/O, no behaviour. */

export const KIND_LIST = [
  'OBJ', 'GOAL', 'KPI', 'NEED', 'FEAT', 'US', 'TASK',
  'ASSUM', 'QUES', 'DEC', 'RISK',
] as const;
export type Kind = (typeof KIND_LIST)[number];

export const STATUS_LIST = ['draft', 'proposed', 'accepted', 'superseded', 'dropped'] as const;
export type Status = (typeof STATUS_LIST)[number];

export const EPISTEMIC_LIST = ['fact', 'assumption', 'hypothesis', 'decision', 'open_question'] as const;
export type Epistemic = (typeof EPISTEMIC_LIST)[number];

export const CONFIDENCE_LIST = ['low', 'medium', 'high'] as const;
export type Confidence = (typeof CONFIDENCE_LIST)[number];

export const EDGE_LIST = [
  'serves', 'addresses', 'derives_from', 'depends_on', 'measured_by',
  'assumes', 'questions', 'decided_by', 'risks', 'supersedes',
] as const;
export type EdgeType = (typeof EDGE_LIST)[number];

/** Edges walked upward by `why`. Order is significant: it fixes render order (§9.3). */
export const UPWARD_EDGES: EdgeType[] = ['derives_from', 'addresses', 'serves'];

/** Edges that must never form a cycle. */
export const ACYCLIC_EDGES: EdgeType[] = ['serves', 'addresses', 'derives_from', 'supersedes', 'depends_on'];

/** Epistemic states that mean "not established". Used by the honesty footer (§9.2). */
export const UNVALIDATED: Epistemic[] = ['assumption', 'hypothesis', 'open_question'];

export interface Provenance {
  author: string;
  command?: string;
  created: string;
  updated: string;
  accepted_by?: string;
}

export interface Node {
  id: string;
  kind: Kind;
  title: string;
  status: Status;
  epistemic: Epistemic;
  confidence?: Confidence;
  evidence?: string;
  links: Partial<Record<EdgeType, string[]>>;
  provenance: Provenance;
  tags?: string[];
  /** Kind-specific fields (acceptance_criteria, definition, target, ...). */
  extra: Record<string, unknown>;
  body: string;
  file: string;
}

/** A file that could not become a Node. The pipeline never throws (§1.4 fail-soft). */
export interface BrokenNode {
  file: string;
  line: number;
  message: string;
  id?: string;
}

export type Severity = 'error' | 'warn' | 'info' | 'off';

export interface Finding {
  rule: string;
  severity: Severity;
  node?: string;
  file?: string;
  line?: number;
  message: string;
  fix?: string;
}

export interface Workspace {
  root: string;
  productRoot: string;
  config: Config;
  nodes: Node[];
  broken: BrokenNode[];
  narratives: Narrative[];
}

export interface Narrative {
  file: string;
  relPath: string;
  cites: string[];
}

export interface Config {
  schema_version: number;
  product: string;
  created?: string;
  paths?: { root?: string };
  rules?: Record<string, Severity>;
  limits?: { soft_cap?: Partial<Record<Kind, number>> };
}
