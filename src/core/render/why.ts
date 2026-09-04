/** Human rendering of a WhyResult. The honesty footer is not optional in JSON (§9.2). */
import type { WhyResult, WhyStep } from '../query/why.js';
import { bold, cyan, dim, yellow } from './style.js';

export function renderWhy(res: WhyResult, opts: { footer?: boolean } = {}): string {
  if (!res.found) return `${res.start} not found.`;
  const showFooter = opts.footer !== false;
  const out: string[] = [];

  const root = res.tree as WhyStep;
  out.push(headline(root));
  emit(root, out, '');

  if (res.metrics.length) {
    out.push('');
    for (const m of res.metrics) {
      const baseline = m.extra['baseline'] ? String(m.extra['baseline']) : '';
      const target = m.extra['target'] ? String(m.extra['target']) : '';
      const range = baseline || target ? dim(`  [${[baseline, target].filter(Boolean).join(' -> ')}]`) : '';
      out.push(`   ${dim('measured by')} ${cyan(m.id)}  ${m.title}${range}`);
    }
  }

  if (showFooter && res.warnings.length) {
    out.push('');
    out.push(footer(res));
  }
  return out.join('\n');
}

function headline(step: WhyStep): string {
  const n = step.node;
  if (!n) return `${bold(step.id)}  ${yellow('(missing)')}`;
  return `${bold(n.id)}  ${n.title}  ${dim(`[${n.status}]`)}`;
}

function emit(step: WhyStep, out: string[], prefix: string): void {
  const kids = step.children;
  kids.forEach((child, i) => {
    const last = i === kids.length - 1;
    const branch = last ? '└─ ' : '├─ ';
    const nextPrefix = prefix + (last ? '   ' : '│  ');
    const n = child.node;
    const label = n
      ? `${dim(child.edge ?? '')} ${bold(n.id)}  ${n.title}  ${tag(n.status, n.epistemic, n.confidence)}`
      : `${dim(child.edge ?? '')} ${bold(child.id)}  ${yellow('<- does not exist')}`;
    const also = child.alsoVia && child.children.length === 0 && n ? `  ${dim('(also reached above)')}` : '';
    out.push(prefix + branch + label + also);
    emit(child, out, nextPrefix);
  });
}

function tag(status: string, epistemic: string, confidence?: string): string {
  const unvalidated = epistemic === 'hypothesis' || epistemic === 'assumption' || epistemic === 'open_question';
  const text = `[${unvalidated ? epistemic : status}${confidence ? ` · ${confidence}` : ''}]`;
  return unvalidated ? yellow(text) : dim(text);
}

function footer(res: WhyResult): string {
  const unvalidated = res.warnings.filter((w) => w.kind === 'unvalidated');
  const assumptions = res.warnings.filter((w) => w.kind === 'open_assumption');
  const questions = res.warnings.filter((w) => w.kind === 'open_question');
  const risks = res.warnings.filter((w) => w.kind === 'risk');
  const missing = res.warnings.filter((w) => w.kind === 'missing');

  const summary: string[] = [];
  if (unvalidated.length) summary.push(`${unvalidated.length} unvalidated node${plural(unvalidated.length)}`);
  if (assumptions.length) summary.push(`${assumptions.length} open assumption${plural(assumptions.length)}`);
  if (questions.length) summary.push(`${questions.length} open question${plural(questions.length)}`);
  if (risks.length) summary.push(`${risks.length} recorded risk${plural(risks.length)}`);
  if (missing.length) summary.push(`${missing.length} missing reference${plural(missing.length)}`);

  const parts: string[] = [yellow(`!  This chain rests on ${summary.join(', ')}:`)];
  for (const w of [...unvalidated, ...assumptions, ...questions, ...risks, ...missing]) {
    parts.push(`     ${cyan(w.id)}  ${w.detail}`);
  }
  const first = res.warnings[0];
  if (first) parts.push(dim(`   Run  product node show ${first.id}  to see it.`));
  return parts.join('\n');
}

function plural(n: number): string { return n === 1 ? '' : 's'; }
