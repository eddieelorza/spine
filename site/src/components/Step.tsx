import { type ReactNode } from 'react';
import { useReveal } from '../hooks/useReveal';

export function Step({ n, children }: { n: number | string; children: ReactNode }) {
  const { ref, revealed } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`step${revealed ? ' in-view' : ''}`}>
      <div className="step-n">{n}</div>
      <div>{children}</div>
    </div>
  );
}
