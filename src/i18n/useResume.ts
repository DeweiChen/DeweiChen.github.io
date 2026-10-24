import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { education, experience, profile, sideProjects, skills, stats, type Lang, type Period } from '@/data/resume'
import type en from './locales/en.json'

type Messages = typeof en

const MONTH_EN = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' })

function formatDate(date: string, lang: Lang) {
  const [y, m] = date.split('-')
  if (!m) return y
  return lang === 'zh' ? `${y}.${m}` : MONTH_EN.format(new Date(Number(y), Number(m) - 1))
}

export function formatPeriod(p: Period, lang: Lang, present: string) {
  const start = formatDate(p.start, lang)
  if (p.end === undefined) return start
  return `${start} – ${p.end === null ? present : formatDate(p.end, lang)}`
}

/**
 * The resume in the current language: the neutral data in src/data/resume.ts
 * merged with the matching strings from the active locale.
 */
export function useResume() {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage as Lang

  return useMemo(() => {
    const m = i18n.getResourceBundle(lang, 'translation') as Messages
    const period = (p: Period) => formatPeriod(p, lang, m.format.present)
    const companies = m.experience as Record<string, { name: string; roles: Record<string, RoleMessages> }>

    return {
      ...m.profile,
      ...profile,
      stats: stats.map((s) => ({ value: s.value, label: m.stats[s.id] })),
      about: m.about,
      skills: skills.map((id) => m.skills[id]),
      experience: experience.map((c) => ({
        id: c.id,
        name: companies[c.id].name,
        roles: c.roles.map((r) => {
          const rm = companies[c.id].roles[r.id]
          return {
            id: r.id,
            title: rm.title,
            period: period(r.period),
            bullets: rm.bullets,
            groups: r.groups?.map((g) => ({
              id: g.id,
              title: rm.groups![g.id].title,
              items: g.items.map((it) => ({ ...rm.groups![g.id].items[it.id], id: it.id, link: it.link })),
            })),
          }
        }),
      })),
      sideProjects: sideProjects.map((p) => ({ ...m.sideProjects[p.id as keyof Messages['sideProjects']], id: p.id, period: period(p.period), link: p.link })),
      education: education.map((e) => ({ ...m.education[e.id as keyof Messages['education']], id: e.id, period: period(e.period) })),
    }
  }, [i18n, lang])
}

interface RoleMessages {
  title: string
  bullets: string[]
  groups?: Record<string, { title: string; items: Record<string, { name: string; detail?: string }> }>
}

export type Resume = ReturnType<typeof useResume>
