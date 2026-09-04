/**
 * Frontmatter + body → RawNode. Never throws (§1.4): a bad file becomes a BrokenNode
 * so that `check` can report every problem in one run.
 */
import { parse as parseYaml } from 'yaml';
import type { BrokenNode } from './types.js';

export interface RawNode {
  file: string;
  front: Record<string, unknown>;
  body: string;
  /** Line number where the frontmatter block starts its content (for error offsets). */
  frontStartLine: number;
}

export type ParseResult =
  | { ok: true; raw: RawNode }
  | { ok: false; broken: BrokenNode };

const FENCE = /^---\s*$/;

export function parseFile(file: string, text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0 || !FENCE.test(lines[0] ?? '')) {
    return {
      ok: false,
      broken: { file, line: 1, message: 'missing YAML frontmatter (file must begin with ---)' },
    };
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (FENCE.test(lines[i] ?? '')) { end = i; break; }
  }
  if (end === -1) {
    return { ok: false, broken: { file, line: 1, message: 'unterminated YAML frontmatter (no closing ---)' } };
  }

  const frontText = lines.slice(1, end).join('\n');
  const body = lines.slice(end + 1).join('\n').replace(/^\n+/, '');

  let front: unknown;
  try {
    front = parseYaml(frontText);
  } catch (err) {
    const e = err as { linePos?: Array<{ line: number }>; message?: string };
    const line = (e.linePos?.[0]?.line ?? 1) + 1; // +1 for the opening fence
    return { ok: false, broken: { file, line, message: `invalid YAML: ${firstLine(e.message)}` } };
  }

  if (front === null || front === undefined) {
    return { ok: false, broken: { file, line: 2, message: 'empty frontmatter' } };
  }
  if (typeof front !== 'object' || Array.isArray(front)) {
    return { ok: false, broken: { file, line: 2, message: 'frontmatter must be a mapping' } };
  }

  return { ok: true, raw: { file, front: front as Record<string, unknown>, body, frontStartLine: 2 } };
}

/** Line number of a top-level frontmatter key, for precise error positions. */
export function keyLine(text: string, key: string): number {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (new RegExp(`^${key}\\s*:`).test(lines[i] ?? '')) return i + 1;
  }
  return 1;
}

function firstLine(s: string | undefined): string {
  return (s ?? 'unknown error').split('\n')[0] ?? 'unknown error';
}
