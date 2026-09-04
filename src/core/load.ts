/** Workspace assembly: fs → parse → schema → graph. The one place the pipeline is wired. */
import { join } from 'node:path';
import * as fsx from './fs.js';
import { parseFile } from './parse.js';
import { isNarrative, toNode, toStringList } from './schema.js';
import { Graph } from './graph.js';
import type { BrokenNode, Config, Narrative, Node, Workspace } from './types.js';

export interface Loaded extends Workspace { graph: Graph; }

export function load(startDir?: string): Loaded {
  const root = fsx.discoverRoot(startDir);
  const config: Config = fsx.readConfig(root);
  const pRoot = fsx.productRoot(root, config);

  const nodes: Node[] = [];
  const broken: BrokenNode[] = [];
  const narratives: Narrative[] = [];

  for (const file of fsx.listMarkdown(pRoot)) {
    const relPath = fsx.rel(root, file);
    const parsed = parseFile(relPath, fsx.read(file));
    if (!parsed.ok) {
      // A .md file with no frontmatter is prose, not a broken node — ignore it silently.
      if (parsed.broken.message.startsWith('missing YAML frontmatter')) continue;
      broken.push(parsed.broken);
      continue;
    }
    if (isNarrative(parsed.raw.front)) {
      narratives.push({
        file: relPath,
        relPath,
        cites: toStringList(parsed.raw.front['cites']) ?? [],
      });
      continue;
    }
    const res = toNode(parsed.raw, relPath);
    if (res.ok) nodes.push(res.node);
    else broken.push(...res.broken);
  }

  nodes.sort((a, b) => compareIds(a.id, b.id));
  return { root, productRoot: pRoot, config, nodes, broken, narratives, graph: new Graph(nodes) };
}

/** Numeric ordering on the suffix, so US-1000 sorts after US-999 (§6.1). */
export function compareIds(a: string, b: string): number {
  const [ka = '', na = '0'] = a.split('-');
  const [kb = '', nb = '0'] = b.split('-');
  if (ka !== kb) return ka.localeCompare(kb);
  return Number(na) - Number(nb);
}

export function countersPath(root: string): string {
  return join(root, fsx.CONFIG_DIR, fsx.COUNTERS_FILE);
}
