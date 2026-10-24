import { forwardRef } from 'react'
import { ArrowUpRight, Mail, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
          <p className="mt-3 bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-lg font-medium text-transparent">
            {r.headline}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{r.location}</span>
            <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
              <Mail className="size-4" />{r.email}
            </a>
            <SocialLinks className="gap-2.5" iconClassName="size-4" />
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {r.stats.map((s) => (
              <div key={s.label} className="rounded-lg border bg-background/40 px-4 py-3">
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{s.value}</dd>
                <dd className="text-xs text-muted-foreground">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <div className="mt-14 space-y-14">
        <Section id="about" title={t('labels.about')}>
          <ul className="space-y-3 text-[15px] leading-relaxed">
            {r.about.map((line) => (
              <li key={line.lead} className="flex gap-3">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span><strong className="font-semibold">{line.lead}</strong>{line.text}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="skills" title={t('labels.skills')}>
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {r.skills.map((s) => (
              <div key={s.group}>
                <h3 className="mb-2 text-sm font-medium">{s.group}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {s.items.map((item) => (
                    <Badge key={item} variant="secondary" className="font-normal">{item}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="experience" title={t('labels.experience')}>
          <div className="space-y-10">
            {r.experience.map((company) => (
              <article key={company.name} className="break-inside-avoid-page">
                <h3 className="text-xl font-semibold">{company.name}</h3>
                <ol className="mt-4 space-y-6 border-l pl-5">
                  {company.roles.map((role) => (
                    <li key={role.title + role.period} className="relative">
                      <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-background bg-gradient-to-br from-brand-from to-brand-to" />
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                        <h4 className="font-medium">{role.title}</h4>
                        <span className="text-sm text-muted-foreground tabular-nums">{role.period}</span>
                      </div>
                      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                        {role.bullets.map((b) => <li key={b}>{b}</li>)}
                      </ul>
                      {role.groups?.map((g) => (
                        <div key={g.title} className="mt-3">
                          <p className="text-xs font-medium tracking-wide text-foreground/80 uppercase">{g.title}</p>
                          <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                            {g.items.map((it) => (
                              <li key={it.name}>
                                <span className="font-medium text-foreground"><ExternalLink href={it.link}>{it.name}</ExternalLink></span>
                                {it.detail && <> — {it.detail}</>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
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
