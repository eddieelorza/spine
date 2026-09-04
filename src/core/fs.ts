/** The only module that touches disk (§1.2). Everything above it is pure. */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { Config } from './types.js';

export const CONFIG_DIR = '.product';
export const CONFIG_FILE = 'config.yaml';
export const COUNTERS_FILE = 'counters.yaml';

export class WorkspaceNotFound extends Error {}

/** Walk up from `start` looking for `.product/config.yaml`, like git does. */
export function discoverRoot(start: string = process.cwd()): string {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, CONFIG_DIR, CONFIG_FILE))) return dir;
    const parent = dirname(dir);
    if (parent === dir) {
      throw new WorkspaceNotFound(
        `No AI Product OS workspace found in ${resolve(start)} or any parent directory.\n` +
          `Run 'product init' to create one.`,
      );
    }
    dir = parent;
  }
}

export function readConfig(root: string): Config {
  const raw = readFileSync(join(root, CONFIG_DIR, CONFIG_FILE), 'utf8');
  const cfg = parseYaml(raw) as Config;
  if (!cfg || typeof cfg !== 'object') throw new Error(`Invalid ${CONFIG_DIR}/${CONFIG_FILE}`);
  return cfg;
}

/** Where node files live, relative to the repo root. */
export function productRoot(root: string, config: Config): string {
  return resolve(root, config.paths?.root ?? 'product');
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.product']);

/** Every .md file under the product root. Node vs narrative is decided by the parser. */
export function listMarkdown(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

export function read(file: string): string {
  return readFileSync(file, 'utf8');
}

export function rel(root: string, file: string): string {
  return relative(root, file).split(sep).join('/');
}

export function exists(p: string): boolean {
  return existsSync(p);
}

export function isDir(p: string): boolean {
  return existsSync(p) && statSync(p).isDirectory();
}
