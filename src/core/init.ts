/** Workspace scaffolding. Creates only the folders v0.1 actually uses. */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { CONFIG_DIR, CONFIG_FILE, COUNTERS_FILE } from './fs.js';
import { Refused } from './mutate.js';

export const FOLDERS = [
  '00-context',
  '01-discovery/needs',
  '01-discovery/assumptions',
  '01-discovery/questions',
  '02-strategy/objectives',
  '02-strategy/goals',
  '02-strategy/metrics',
  '03-product/features',
  '04-backlog/stories',
  '05-delivery/tasks',
  'decisions',
];

export interface InitResult { root: string; productRoot: string; created: string[]; }

export function init(root: string, opts: { name?: string; productDir?: string } = {}): InitResult {
  const configPath = join(root, CONFIG_DIR, CONFIG_FILE);
  if (existsSync(configPath)) {
    throw new Refused(`A workspace already exists at ${CONFIG_DIR}/${CONFIG_FILE}.`, 'Refusing to overwrite it.');
  }
  const productDir = opts.productDir ?? 'product';
  const name = opts.name ?? 'Untitled Product';
  const created: string[] = [];

  mkdirSync(join(root, CONFIG_DIR), { recursive: true });
  writeFileSync(configPath, stringifyYaml({
    schema_version: 1,
    product: name,
    created: new Date().toISOString().slice(0, 10),
    paths: { root: productDir },
    rules: {},
    limits: { soft_cap: { NEED: 15, FEAT: 20, US: 80 } },
  }), 'utf8');
  created.push(`${CONFIG_DIR}/${CONFIG_FILE}`);

  writeFileSync(join(root, CONFIG_DIR, COUNTERS_FILE), stringifyYaml({}), 'utf8');
  created.push(`${CONFIG_DIR}/${COUNTERS_FILE}`);

  const pRoot = join(root, productDir);
  for (const f of FOLDERS) {
    mkdirSync(join(pRoot, f), { recursive: true });
    writeFileSync(join(pRoot, f, '.gitkeep'), '', 'utf8');
  }
  created.push(`${productDir}/ (${FOLDERS.length} folders)`);

  writeFile(join(pRoot, '00-context/idea.md'), ideaTemplate(name), created, productDir);
  writeFile(join(pRoot, '01-discovery/problem-definition.md'), narrativeTemplate('Problem Definition',
    'What problem are we solving, for whom, and how do we know it is real?'), created, productDir);
  writeFile(join(pRoot, '03-product/prd.md'), narrativeTemplate('PRD',
    'Composed from the nodes in this workspace. Cite IDs; do not restate facts that already live in a node.'), created, productDir);

  return { root, productRoot: pRoot, created };
}

function writeFile(path: string, content: string, created: string[], productDir: string): void {
  if (existsSync(path)) return;
  writeFileSync(path, content, 'utf8');
  created.push(`${productDir}/${path.split(`${productDir}/`)[1] ?? path}`);
}

function ideaTemplate(name: string): string {
  return `---
type: narrative
cites: []
---

# ${name}

## The idea

_Describe it in a few sentences. Plain language, no structure required._

## What you already know

_Anything you have actually observed. Evidence, not belief._

## What you are guessing

_Be honest here. These become assumptions, and everything downstream will be marked accordingly._
`;
}

function narrativeTemplate(title: string, hint: string): string {
  return `---
type: narrative
cites: []
---

# ${title}

_${hint}_
`;
}
