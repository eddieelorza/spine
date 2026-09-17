import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Lang = 'es' | 'en';

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue | null>(null);

const STORAGE_KEY = 'aipos-lang';

function readInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es') return saved;
  } catch {
    // localStorage unavailable (private mode, disabled storage) — fall
    // through to the default rather than failing the whole page.
  }
  return 'es';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Same as above: a private-mode/storage-disabled browser just won't
      // remember the choice across visits. Not fatal.
    }
  }, [lang]);

  const setLang = (value: Lang) => setLangState(value);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang() must be used inside <LangProvider>');
  return ctx;
}

/**
 * Renders whichever language is active. This is the entire i18n mechanism —
 * no key lookup, no translation file, just the two real strings sitting
 * next to each other in the JSX where they're used, the same way the
 * hand-authored static page kept them, minus the DOM duplication.
 */
export function T({ es, en }: { es: ReactNode; en: ReactNode }) {
  const { lang } = useLang();
  return <>{lang === 'en' ? en : es}</>;
}
