import { useRef, useState } from 'react';
import { useLang } from '../lang';

/**
 * Takes the text to copy as an explicit prop rather than reading the
 * rendered DOM — the static predecessor had to reconstruct the command
 * from `pre.innerText` and strip its own button label back out of the
 * result. Here the button never touches its sibling's markup at all.
 */
export function CopyButton({ getText }: { getText: () => string }) {
  const { lang } = useLang();
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
  const timeoutRef = useRef<number | undefined>(undefined);

  const flash = (next: 'copied' | 'error') => {
    setState(next);
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setState('idle'), 1400);
  };

  const onClick = () => {
    const text = getText();
    navigator.clipboard.writeText(text).then(
      () => flash('copied'),
      () => {
        // Clipboard API blocked (older browser, denied permission, insecure
        // context) — fall back to the legacy selection-based copy instead
        // of failing silently. A button that does nothing on click is
        // worse than not having the button.
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          const worked = document.execCommand('copy');
          document.body.removeChild(ta);
          flash(worked ? 'copied' : 'error');
        } catch {
          flash('error');
        }
      },
    );
  };

  const label =
    state === 'copied'
      ? lang === 'en'
        ? 'Copied'
        : 'Copiado'
      : state === 'error'
        ? 'Error'
        : lang === 'en'
          ? 'Copy'
          : 'Copiar';

  return (
    <button
      type="button"
      className="copy-btn"
      onClick={onClick}
      aria-label={lang === 'en' ? 'Copy command' : 'Copiar comando'}
      data-copied={state === 'copied' ? '' : undefined}
      data-error={state === 'error' ? '' : undefined}
    >
      {label}
    </button>
  );
}
