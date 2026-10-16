import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { resume, type Lang, type Resume } from '@/data/resume'

const STORAGE_KEY = 'about-dw:lang'

function initialLang(): Lang {
  const param = new URLSearchParams(location.search).get('lang')
  if (param === 'zh' || param === 'en') return param
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    // Storage can be unavailable (private mode); fall through to the browser language.
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

interface LangState {
  lang: Lang
  t: Resume
  setLang: (lang: Lang) => void
}

const LangContext = createContext<LangState | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Ignore: the choice just won't persist.
    }
    const url = new URL(location.href)
    url.searchParams.set('lang', next)
    history.replaceState(null, '', url)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en'
  }, [lang])

  const value = useMemo(() => ({ lang, t: resume[lang], setLang }), [lang, setLang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>')
  return ctx
}
