/** Human rendering of status. Bars only where a denominator exists (§8.2). */
import { score, type StatusResult } from '../query/status.js';
import { bar, bold, cyan, dim, pad, red, yellow } from './style.js';

export function renderStatus(res: StatusResult): string {
  const out: string[] = [];
  out.push(`${bold('AI PRODUCT OS')}  ${dim('·')}  ${cyan(res.product)}`);
  out.push('');

  const width = Math.max(...res.stages.map((s) => s.name.length)) + 2;
  for (const stage of res.stages) {
    const { passed, total } = score(stage);
    if (stage.enumerable) {
      out.push(`${pad(stage.name, width)}${bar(passed, total)}  ${passed}/${total}   ${failedLabels(stage)}`);
    } else {
      const counts = Object.entries(stage.counts ?? {}).map(([k, v]) => `${v} ${k}`).join(', ');
      out.push(`${pad(stage.name, width)}${dim('(no defined denominator)')}  ${counts}   ${failedLabels(stage)}`);
    }
  }

  const h = res.honesty;
  out.push('');
  out.push(bold('Honesty'));
  const lines: string[] = [];
  if (h.unvalidated_needs.length) {
    lines.push(`${yellow(String(h.unvalidated_needs.length))} unvalidated need${plural(h.unvalidated_needs.length)} underpin${h.unvalidated_needs.length === 1 ? 's' : ''} ${h.affected_stories} stor${h.affected_stories === 1 ? 'y' : 'ies'}  ${dim(h.unvalidated_needs.join(', '))}`);
  }
  if (h.open_assumptions.length) lines.push(`${yellow(String(h.open_assumptions.length))} assumption${plural(h.open_assumptions.length)} require validation  ${dim(h.open_assumptions.join(', '))}`);
  if (h.blocking_questions.length) lines.push(`${yellow(String(h.blocking_questions.length))} open question${plural(h.blocking_questions.length)} blocking  ${dim(h.blocking_questions.join(', '))}`);
  if (h.features_without_metric.length) lines.push(`${yellow(String(h.features_without_metric.length))} feature${plural(h.features_without_metric.length)} with no success metric  ${dim(h.features_without_metric.join(', '))}`);
  lines.push(`${h.errors ? red(String(h.errors)) : '0'} error${plural(h.errors)}, ${h.warnings ? yellow(String(h.warnings)) : '0'} warning${plural(h.warnings)} from 'product check'`);
  for (const l of lines) out.push(`  ${l}`);

  const totals = Object.entries(res.totals).map(([k, v]) => `${v} ${k}`).join(' · ');
  if (totals) { out.push(''); out.push(dim(`  ${totals}`)); }
  return out.join('\n');
}

function failedLabels(stage: { checks: { label: string; passed: boolean; detail?: string }[] }): string {
  const failed = stage.checks.filter((c) => !c.passed);
  if (!failed.length) return dim('all checks pass');
  return dim(`missing: ${failed.map((c) => c.label + (c.detail ? ` (${c.detail})` : '')).join(', ')}`);
}

function plural(n: number): string { return n === 1 ? '' : 's'; }
