import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { Lang } from '@/data/resume'
import { STORAGE_KEY } from './index'

/** Current language plus a setter that also persists it and mirrors it into `?lang=`. */
export function useLang() {
  const { i18n } = useTranslation()

  const setLang = useCallback(
    (next: Lang) => {
      void i18n.changeLanguage(next)
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Ignore: the choice just won't persist.
      }
      const url = new URL(location.href)
      url.searchParams.set('lang', next)
      history.replaceState(null, '', url)
    },
    [i18n],
  )

  return { lang: i18n.resolvedLanguage as Lang, setLang }
}
