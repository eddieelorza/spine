import { type ReactNode, useRef } from 'react';
import { useReveal } from '../hooks/useReveal';
import { CopyButton } from './CopyButton';

interface TerminalBlockProps {
  lines: ReactNode[];
  className?: string;
  /** Adds the hover-to-reveal copy button (real command blocks only — not
   *  illustrative "what you see on screen" mockups, which aren't literally
   *  copy-pasteable as a unit). */
  copyText?: string;
}

/**
 * One shared component for every block on the page that looks like a
 * terminal. Each line is a discrete array item — never a string split at
 * render time — so the historical bug class (a syntax-color span that
 * straddles a line break, corrupted by a naive text split) is structurally
 * impossible here, unlike the hand-authored static page this replaced.
 */
export function TerminalBlock({ lines, className, copyText }: TerminalBlockProps) {
  const { ref, revealed } = useReveal<HTMLPreElement>();
  const localRef = useRef<HTMLPreElement | null>(null);

  return (
    <pre
      ref={(el) => {
        ref.current = el;
        localRef.current = el;
      }}
      className={[className, revealed ? 'revealed' : ''].filter(Boolean).join(' ')}
    >
      {lines.map((line, i) => (
        <span key={i} className="tline" style={{ transitionDelay: `${Math.min(i, 12) * 30}ms` }}>
          {line}
        </span>
      ))}
      {copyText ? <CopyButton getText={() => copyText} /> : null}
    </pre>
  );
}
