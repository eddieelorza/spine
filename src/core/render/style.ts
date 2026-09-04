/** Minimal ANSI. No dependency, and it disables itself when piped. */
let enabled = true;

export function setColor(on: boolean): void { enabled = on; }

const ESC = '\x1b[';
const wrap = (code: string) => (s: string): string => (enabled ? `${ESC}${code}m${s}${ESC}0m` : s);

export const dim = wrap('2');
export const bold = wrap('1');
export const red = wrap('31');
export const yellow = wrap('33');
export const green = wrap('32');
export const cyan = wrap('36');
export const magenta = wrap('35');

export function bar(passed: number, total: number, width = 10): string {
  if (total === 0) return '░'.repeat(width);
  const filled = Math.round((passed / total) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}
