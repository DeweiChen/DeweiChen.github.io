import { forwardRef } from 'react'
import { ArrowUpRight, BookOpen, Bot, FileText, Glasses, Globe, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SocialLinks } from '@/components/SocialLinks'
import { useTranslation } from 'react-i18next'
import { useResume } from '@/i18n/useResume'
import type { ReactNode } from 'react'

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-4 flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        <span className="h-px w-6 bg-gradient-to-r from-brand-from to-brand-to" />
        {title}
      </h2>
      {children}
    </section>
  )
}

function ExternalLink({ href, children }: { href?: string; children: ReactNode }) {
  if (!href) return <>{children}</>
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline-offset-4 hover:text-primary hover:underline">
      {children}
      <ArrowUpRight className="size-3.5" />
    </a>
  )
}

/** The calm, readable resume (printing uses PrintResume). `heroRef` marks the card the 3D transition peels off. */
const HOBBY_ICONS = { android: Bot, metaverse: Glasses, travel: Globe }

export const ClassicResume = forwardRef<HTMLDivElement>(function ClassicResume(_props, heroRef) {
  const r = useResume()
  const { t } = useTranslation()

  return (
    <main id="top" className="mx-auto max-w-4xl px-4 pt-20 pb-24">
      <Card
        ref={heroRef}
        className="relative overflow-hidden px-6 py-8 sm:px-10"
      >
        <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brand-to/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-brand-from/15 blur-3xl" />
        <div className="relative">
          <p className="text-sm text-muted-foreground">{r.altName}</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">{r.name}</h1>
          <div className="mt-4 max-w-2xl space-y-1.5 text-[15px] leading-relaxed">
            {r.intro.lines.map((line) => <p key={line}>{line}</p>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
              <Mail className="size-4" />{r.email}
            </a>
            <SocialLinks className="gap-2.5" iconClassName="size-4" />
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <p className="flex items-start gap-2.5 rounded-lg border bg-background/40 px-4 py-3 text-sm">
              <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span className="font-medium">{t('labels.now')}</span>
                <span className="text-muted-foreground"> · {r.now.updated}</span>
                <br />
                {r.now.text}
              </span>
            </p>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <FileText />{t('labels.fullResume')}
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-14 space-y-14">
        <Section id="experience" title={t('labels.experience')}>
          <div className="space-y-8">
            {r.experience.map((company) => (
              <article key={company.name} className="break-inside-avoid-page">
                <h3 className="text-xl font-semibold">{company.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{company.summary}</p>
                <ol className="mt-3 space-y-1.5 border-l pl-5">
                  {company.roles.map((role) => (
                    <li key={role.title + role.period} className="relative flex flex-wrap items-baseline justify-between gap-x-4">
                      <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-background bg-gradient-to-br from-brand-from to-brand-to" />
                      <h4 className="text-[15px] font-medium">{role.title}</h4>
                      <span className="text-sm text-muted-foreground tabular-nums">{role.period}</span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </Section>

        <Section id="side-projects" title={t('labels.sideProjects')}>
          <div className="grid gap-4 sm:grid-cols-2">
            {r.sideProjects.map((p) => (
              <Card key={p.name} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="font-medium"><ExternalLink href={p.link}>{p.name}</ExternalLink></h3>
                  <span className="text-xs text-muted-foreground tabular-nums">{p.period}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section id="bookshelf" title={t('labels.bookshelf')}>
          <ul className="flex flex-wrap gap-2">
            {r.books.map((b) => (
              <li key={b.id}>
                <Badge variant={b.reading ? 'default' : 'secondary'} className="px-3 py-1 text-sm font-normal">
                  {b.title}
                  {b.reading && <span className="opacity-80"> · {t('labels.reading')}</span>}
                </Badge>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="hobbies" title={t('labels.hobbies')}>
          <div className="grid gap-4 sm:grid-cols-2">
            {r.hobbies.map((h) => {
              const Icon = HOBBY_ICONS[h.id]
              return (
                <Card key={h.id} className="flex-row items-start gap-4 px-5 py-4">
                  <Icon className="mt-0.5 size-6 shrink-0 text-primary" />
                  <div>
                    <h3 className="font-medium">{h.name}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{h.text}</p>
                  </div>
                </Card>
              )
            })}
          </div>
        </Section>

        <Section id="education" title={t('labels.education')}>
          <div className="space-y-4">
            {r.education.map((e) => (
              <div key={e.degree}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="font-medium">{e.degree} · <span className="text-muted-foreground">{e.school}</span></h3>
                  <span className="text-sm text-muted-foreground tabular-nums">{e.period}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{e.note}</p>
              </div>
            ))}
          </div>
        </Section>

        <p className="text-[15px]">{t('contactPitch')}</p>
        <Separator />
        <footer className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} {r.name}</span>
          <div className="flex items-center gap-4">
            <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
              <Mail className="size-4" />{t('labels.contact')}
            </a>
            <SocialLinks iconClassName="size-4" />
          </div>
        </footer>
      </div>
    </main>
  )
})
