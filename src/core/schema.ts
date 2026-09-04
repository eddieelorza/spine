/** RawNode → Node, or a BrokenNode carrying every reason it failed (E008). */
import { basename } from 'node:path';
import { kindOfId } from './kinds.js';
import type { RawNode } from './parse.js';
import {
  CONFIDENCE_LIST, EDGE_LIST, EPISTEMIC_LIST, KIND_LIST, STATUS_LIST,
  type BrokenNode, type Confidence, type EdgeType, type Epistemic, type Kind,
  type Node, type Provenance, type Status,
} from './types.js';

export const ID_RE = /^[A-Z]+-\d{3,}$/;

export type SchemaResult =
  | { ok: true; node: Node }
  | { ok: false; broken: BrokenNode[] };

const RESERVED = new Set([
  'id', 'kind', 'title', 'status', 'epistemic', 'confidence',
  'evidence', 'links', 'provenance', 'tags', 'type', 'cites', 'generated_by', 'updated',
]);

export function toNode(raw: RawNode, relPath: string): SchemaResult {
  const f = raw.front;
  const errs: BrokenNode[] = [];
  const bad = (message: string): void => { errs.push({ file: relPath, line: 2, message, id: str(f['id']) }); };

  const id = str(f['id']);
  if (!id) bad('missing required field: id');
  else if (!ID_RE.test(id)) bad(`invalid id '${id}' — expected KIND-NNN (e.g. US-014)`);

  const kindRaw = str(f['kind']);
  let kind: Kind | undefined;
  if (!kindRaw) bad('missing required field: kind');
  else if (!(KIND_LIST as readonly string[]).includes(kindRaw)) bad(`unknown kind '${kindRaw}'`);
  else kind = kindRaw as Kind;

  if (id && kind && kindOfId(id) !== kind) {
    bad(`id prefix does not match kind: '${id}' declares kind '${kind}'`);
  }
  if (id) {
    const expected = `${id}.md`;
    if (basename(relPath) !== expected) bad(`filename must be '${expected}' to match id '${id}'`);
  }

  const title = str(f['title']);
  if (!title) bad('missing required field: title');
  else if (title.length > 120) bad(`title exceeds 120 characters (${title.length})`);

  const status = (str(f['status']) ?? 'draft') as Status;
  if (!(STATUS_LIST as readonly string[]).includes(status)) bad(`unknown status '${status}'`);

  const epistemicRaw = str(f['epistemic']);
  if (!epistemicRaw) bad('missing required field: epistemic');
  else if (!(EPISTEMIC_LIST as readonly string[]).includes(epistemicRaw)) bad(`unknown epistemic '${epistemicRaw}'`);
  const epistemic = (epistemicRaw ?? 'assumption') as Epistemic;

  const confidenceRaw = str(f['confidence']);
  if (confidenceRaw && !(CONFIDENCE_LIST as readonly string[]).includes(confidenceRaw)) {
    bad(`unknown confidence '${confidenceRaw}'`);
  }

  const evidence = str(f['evidence']);

  // links
  const links: Partial<Record<EdgeType, string[]>> = {};
  const rawLinks = f['links'];
  if (rawLinks !== undefined && rawLinks !== null) {
    if (typeof rawLinks !== 'object' || Array.isArray(rawLinks)) {
      bad('links must be a mapping of edge -> [ID, ...]');
    } else {
      for (const [edge, val] of Object.entries(rawLinks as Record<string, unknown>)) {
        if (!(EDGE_LIST as readonly string[]).includes(edge)) {
          bad(`unknown edge type '${edge}' (valid: ${EDGE_LIST.join(', ')})`);
          continue;
        }
        const targets = toStringList(val);
        if (targets === null) { bad(`links.${edge} must be a list of IDs`); continue; }
        const invalid = targets.filter((t) => !ID_RE.test(t));
        if (invalid.length) bad(`links.${edge} contains malformed IDs: ${invalid.join(', ')}`);
        if (targets.length) links[edge as EdgeType] = targets;
      }
    }
  }

  // kind-specific required fields
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) if (!RESERVED.has(k)) extra[k] = v;

  // Kind-required fields are NOT checked here. The schema owns structural validity;
  // semantic completeness is the rule layer's job, where a finding carries a fix hint.
  if (kind === 'US') {
    const ac = extra['acceptance_criteria'];
    if (ac !== undefined && toStringList(ac) === null) bad('acceptance_criteria must be a list of strings');
  }

  if (errs.length) return { ok: false, broken: errs };

  const now = new Date().toISOString();
  const prov = (f['provenance'] ?? {}) as Record<string, unknown>;
  const provenance: Provenance = {
    author: str(prov['author']) ?? 'human',
    created: str(prov['created']) ?? now,
    updated: str(prov['updated']) ?? now,
  };
  const cmd = str(prov['command']); if (cmd) provenance.command = cmd;
  const acceptedBy = str(prov['accepted_by']); if (acceptedBy) provenance.accepted_by = acceptedBy;

  const node: Node = {
    id: id as string,
    kind: kind as Kind,
    title: title as string,
    status,
    epistemic,
    links,
    provenance,
    extra,
    body: raw.body,
    file: relPath,
  };
  if (confidenceRaw) node.confidence = confidenceRaw as Confidence;
  if (evidence) node.evidence = evidence;
  const tags = toStringList(f['tags']); if (tags?.length) node.tags = tags;

  return { ok: true, node };
}

/** A narrative file declares `type: narrative` and carries no id. */
export function isNarrative(front: Record<string, unknown>): boolean {
  return front['type'] === 'narrative' || (front['id'] === undefined && front['cites'] !== undefined);
}

export function toStringList(v: unknown): string[] | null {
  if (v === undefined || v === null) return [];
  if (typeof v === 'string') return [v];
  if (!Array.isArray(v)) return null;
  if (!v.every((x) => typeof x === 'string' || typeof x === 'number')) return null;
  return v.map(String);
}

function str(v: unknown): string | undefined {
  if (typeof v === 'string') return v.trim() === '' ? undefined : v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

