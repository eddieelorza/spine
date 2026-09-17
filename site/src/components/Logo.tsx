export function Logo() {
  return (
    <a className="brandmark" href="#" aria-label="Spine">
      <svg width="16" height="20" viewBox="0 0 16 20" aria-hidden="true">
        <line x1="8" y1="2" x2="8" y2="18" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
        <circle cx="8" cy="2" r="2" fill="currentColor" opacity="0.35" />
        <circle cx="8" cy="9" r="2" fill="currentColor" opacity="0.65" />
        <circle cx="8" cy="18" r="2.5" fill="var(--amber)" />
      </svg>
      <span>Spine</span>
    </a>
  );
}
