/** Adjacency, inversion, cycles, ancestry. Pure — takes nodes, returns a graph. */
import { ACYCLIC_EDGES, UPWARD_EDGES, type EdgeType, type Node } from './types.js';

export interface Edge { from: string; to: string; edge: EdgeType; }

export class Graph {
  readonly byId = new Map<string, Node>();
  readonly out: Edge[] = [];
  /** target id -> edges pointing at it (the inverted index; descendants are derived, never stored). */
  readonly inbound = new Map<string, Edge[]>();
  readonly cycles: string[][] = [];

  constructor(nodes: Node[]) {
    for (const n of nodes) this.byId.set(n.id, n);
    for (const n of nodes) {
      for (const [edge, targets] of Object.entries(n.links) as [EdgeType, string[]][]) {
        for (const to of targets) {
          const e: Edge = { from: n.id, to, edge };
          this.out.push(e);
          const list = this.inbound.get(to);
          if (list) list.push(e); else this.inbound.set(to, [e]);
        }
      }
    }
    this.cycles = this.findCycles();
  }

  has(id: string): boolean { return this.byId.has(id); }
  node(id: string): Node | undefined { return this.byId.get(id); }
  all(): Node[] { return [...this.byId.values()]; }

  edgesFrom(id: string, only?: EdgeType[]): Edge[] {
    return this.out.filter((e) => e.from === id && (!only || only.includes(e.edge)));
  }

  edgesTo(id: string, only?: EdgeType[]): Edge[] {
    return (this.inbound.get(id) ?? []).filter((e) => !only || only.includes(e.edge));
  }

  /** Does this node have any upstream link at all? Basis of the orphan rule (E005). */
  hasUpstream(id: string): boolean {
    return this.edgesFrom(id, UPWARD_EDGES).length > 0;
  }

  /** Everything reachable upward. Cycle-safe: runs on broken workspaces too (§9.1). */
  ancestors(id: string, edges: EdgeType[] = UPWARD_EDGES): Set<string> {
    const seen = new Set<string>();
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop() as string;
      for (const e of this.edgesFrom(cur, edges)) {
        if (seen.has(e.to)) continue;
        seen.add(e.to);
        stack.push(e.to);
      }
    }
    return seen;
  }

  /** Everything that depends on this node, by inverting the adjacency. */
  descendants(id: string, edges: EdgeType[] = UPWARD_EDGES): Set<string> {
    const seen = new Set<string>();
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop() as string;
      for (const e of this.edgesTo(cur, edges)) {
        if (seen.has(e.from)) continue;
        seen.add(e.from);
        stack.push(e.from);
      }
    }
    return seen;
  }

  private findCycles(): string[][] {
    const found: string[][] = [];
    const state = new Map<string, 0 | 1 | 2>(); // 0 unvisited, 1 in-stack, 2 done
    const path: string[] = [];
    const visit = (id: string): void => {
      state.set(id, 1);
      path.push(id);
      for (const e of this.edgesFrom(id, ACYCLIC_EDGES)) {
        const s = state.get(e.to) ?? 0;
        if (s === 1) {
          const start = path.indexOf(e.to);
          if (start !== -1) found.push([...path.slice(start), e.to]);
        } else if (s === 0 && this.has(e.to)) {
          visit(e.to);
        }
      }
      path.pop();
      state.set(id, 2);
    };
    for (const id of this.byId.keys()) if ((state.get(id) ?? 0) === 0) visit(id);
    return dedupeCycles(found);
  }
}

function dedupeCycles(cycles: string[][]): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const c of cycles) {
    const key = [...c].slice(0, -1).sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}
