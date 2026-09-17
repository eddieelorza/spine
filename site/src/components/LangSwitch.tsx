import { useLang } from '../lang';

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="langswitch" role="group" aria-label="Language / Idioma">
      <button type="button" data-active={lang === 'es'} aria-pressed={lang === 'es'} onClick={() => setLang('es')}>
        ES
      </button>
      <button type="button" data-active={lang === 'en'} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
        EN
      </button>
    </div>
  );
}
