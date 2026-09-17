import { useEffect, useRef, useState } from 'react';

/**
 * Reveal-on-scroll with a real safety net.
 *
 * An IntersectionObserver alone misses a fast scroll, a direct #anchor
 * jump, or Cmd/Ctrl-F jumping into later content: a single instant
 * position change doesn't generate the intermediate frames the observer
 * relies on, so content revealed only that way can end up permanently
 * invisible — worse than no animation at all. Confirmed by testing the
 * static predecessor of this hook: a scripted jump to the bottom of the
 * page left every observed block unrevealed until a scroll-position sweep
 * and a self-terminating backstop interval were added. Ported here as-is.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      setRevealed(true);
      return;
    }

    let done = false;
    const reveal = () => {
      if (!done) {
        done = true;
        setRevealed(true);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) reveal();
      },
      { threshold: 0, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);

    let ticking = false;
    const sweep = () => {
      ticking = false;
      if (!done && el.getBoundingClientRect().top < window.innerHeight) reveal();
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(sweep);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('hashchange', sweep);
    sweep(); // covers loading the page with a hash already in the URL

    const backstop = window.setInterval(() => {
      sweep();
      if (done) window.clearInterval(backstop);
    }, 400);

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('hashchange', sweep);
      window.clearInterval(backstop);
    };
  }, []);

  return { ref, revealed };
}
