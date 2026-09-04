/** Human rendering of findings. Every finding carries a fix; a nag without a remedy gets disabled. */
import type { Finding } from '../types.js';
import { bold, dim, green, red, yellow } from './style.js';

export function renderCheck(findings: Finding[]): string {
  const errors = findings.filter((f) => f.severity === 'error');
  const warns = findings.filter((f) => f.severity === 'warn');
  if (findings.length === 0) return green('OK  no problems found');

  const out: string[] = [];
  const head: string[] = [];
  if (errors.length) head.push(red(`${errors.length} error${plural(errors.length)}`));
  if (warns.length) head.push(yellow(`${warns.length} warning${plural(warns.length)}`));
  out.push(`${errors.length ? red('FAIL') : yellow('WARN')}  ${head.join(', ')}`);
  out.push('');

  for (const f of findings) {
    const label = f.severity === 'error' ? red('ERROR') : yellow('WARN ');
    out.push(`${label}  ${dim(f.rule)}  ${bold(f.node ?? '')}${f.node ? '  ' : ''}${f.message}`);
    if (f.file) out.push(`       ${dim(`${f.file}${f.line ? `:${f.line}` : ''}`)}`);
    if (f.fix) out.push(`       ${dim('fix:')} ${f.fix}`);
    out.push('');
  }
  return out.join('\n').trimEnd();
}

function plural(n: number): string { return n === 1 ? '' : 's'; }
