import { useEffect, useRef, useState } from 'react';

interface TypewriterProps {
  text: string;
  /** Only begins once true — lets a parent gate typing behind its own
   *  reveal (scroll-in, or the hero's load-in stagger slot). */
  start: boolean;
  /** Called once typing finishes, so a parent can chain the next beat
   *  (the hero reveals its tree lines only after its caption finishes). */
  onDone?: () => void;
  className?: string;
}

/**
 * Re-reads `text` on every tick rather than capturing it once, so a language
 * toggle mid-type retargets the in-progress animation instead of racing
 * against the parent re-rendering with new text over the same node.
 */
export function Typewriter({ text, start, onDone, className }: TypewriterProps) {
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!start) return;
    doneRef.current = false;
    setCount(0);
    let i = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      i = Math.min(i + 1, text.length);
      setCount(i);
      if (i < text.length) {
        window.setTimeout(tick, 14 + Math.random() * 10);
      } else if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
    };
    const id = window.setTimeout(tick, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, text]);

  const typing = start && count < text.length;

  return (
    <span className={[className, typing ? 'typing' : ''].filter(Boolean).join(' ')}>
      {start ? text.slice(0, count) : ''}
    </span>
  );
}
