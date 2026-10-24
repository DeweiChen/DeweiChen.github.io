import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Lang } from '@/data/resume'
import en from './locales/en.json'
import zh from './locales/zh.json'

// Fails type-checking when zh.json is missing a key or has a different shape than en.json.
const zhMessages: typeof en = zh

export const STORAGE_KEY = 'about-dw:lang'

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

const syncHtmlLang = (lang: string) => {
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en'
}

i18n.on('languageChanged', syncHtmlLang)

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, zh: { translation: zhMessages } },
  lng: initialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
