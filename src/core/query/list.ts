/** `list` — the browsing tool, since filenames are bare IDs by design (§5.6). */
import type { Graph } from '../graph.js';
import { KINDS } from '../kinds.js';
import { UNVALIDATED, type Epistemic, type Kind, type Node, type Status, type Workspace } from '../types.js';

export interface ListFilter {
  kind?: Kind;
  status?: Status;
  epistemic?: Epistemic;
  orphans?: boolean;
  unvalidated?: boolean;
}

export interface ListRow {
  id: string;
  kind: Kind;
  title: string;
  status: Status;
  epistemic: Epistemic;
  file: string;
  upstream: string[];
}

export function list(ws: Workspace, graph: Graph, filter: ListFilter = {}): ListRow[] {
  return ws.nodes
    .filter((n) => (!filter.kind || n.kind === filter.kind))
    .filter((n) => (!filter.status || n.status === filter.status))
    .filter((n) => (!filter.epistemic || n.epistemic === filter.epistemic))
    .filter((n) => (!filter.unvalidated || UNVALIDATED.includes(n.epistemic)))
    .filter((n) => (!filter.orphans || (!KINDS[n.kind].root && !graph.hasUpstream(n.id))))
    .map((n) => toRow(n, graph));
}

function toRow(n: Node, graph: Graph): ListRow {
  return {
    id: n.id, kind: n.kind, title: n.title, status: n.status, epistemic: n.epistemic, file: n.file,
    upstream: graph.edgesFrom(n.id).map((e) => e.to),
  };
}
