import { useRef, type ReactNode, type PointerEvent } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { ChevronDown, Mail } from 'lucide-react'
import { GitHubIcon, LinkedInIcon, SocialLinks } from '@/components/SocialLinks'
import { Badge } from '@/components/ui/badge'
import { useLang } from '@/i18n/LangContext'
import { cn } from '@/lib/utils'

/** Glass card that tilts toward the cursor, like a panel floating in the scene. */
function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rotateY = useSpring(useTransform(px, [0, 1], [-7, 7]), { stiffness: 180, damping: 18 })
  const rotateX = useSpring(useTransform(py, [0, 1], [6, -6]), { stiffness: 180, damping: 18 })
  const glowX = useTransform(px, (v) => `${v * 100}%`)
  const glowY = useTransform(py, (v) => `${v * 100}%`)
  const glow = useTransform(
    [glowX, glowY],
    ([x, y]) => `radial-gradient(420px circle at ${x} ${y}, oklch(0.82 0.12 205 / 0.14), transparent 60%)`,
  )

  const onMove = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width)
    py.set((e.clientY - r.top) / r.height)
  }
  const onLeave = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      initial={{ opacity: 0, y: 40, rotateX: 18 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformPerspective: 1000 }}
      className="group"
    >
      <motion.div
        style={{ rotateX, rotateY, transformPerspective: 1000 }}
        className={cn(
          'relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl',
          className,
        )}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glow }}
        />
        <div className="relative">{children}</div>
      </motion.div>
    </motion.div>
  )
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-6 bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-sm font-semibold tracking-[0.25em] text-transparent uppercase">
      {children}
    </h2>
  )
}

/** DOM content layered over the particle canvas. Real text, so it stays selectable and indexable. */
export function FloatingPanels({ visible }: { visible: boolean }) {
  const { t } = useLang()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.6, delay: visible ? 0.9 : 0 }}
      className={cn('relative z-10', !visible && 'pointer-events-none')}
    >
      {/* First screen belongs to the particles; only a caption and the stats sit at the bottom. */}
      <section className="pointer-events-none flex h-svh flex-col items-center justify-end px-4 pb-10 text-center">
        <p className="text-base text-foreground/90 sm:text-lg">{t.headline}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t.location}</p>
        <SocialLinks className="pointer-events-auto mt-3 text-muted-foreground" iconClassName="size-4" />
        <dl className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-3">
          {t.stats.map((s) => (
            <div key={s.label}>
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{s.value}</dd>
              <dd className="text-xs text-muted-foreground">{s.label}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-xs tracking-widest text-muted-foreground/80">{t.labels.hint}</p>
        <ChevronDown className="mt-2 size-5 animate-bounce text-muted-foreground" aria-label={t.labels.scroll} />
      </section>

      <div className="mx-auto max-w-5xl space-y-28 px-4 pb-32">
        <section>
          <Heading>{t.labels.about}</Heading>
          <TiltCard className="sm:p-8">
            <ul className="space-y-4 text-base leading-relaxed sm:text-lg">
              {t.about.map((line) => <li key={line.lead}><strong className="font-semibold text-primary">{line.lead}</strong>{line.text}</li>)}
            </ul>
          </TiltCard>
        </section>

        <section>
          <Heading>{t.labels.skills}</Heading>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {t.skills.map((s) => (
              <TiltCard key={s.group}>
                <h3 className="mb-3 font-medium">{s.group}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {s.items.map((item) => (
                    <Badge key={item} variant="secondary" className="bg-white/10 font-normal">{item}</Badge>
                  ))}
                </div>
              </TiltCard>
            ))}
          </div>
        </section>

        <section>
          <Heading>{t.labels.experience}</Heading>
          <div className="space-y-6">
            {t.experience.map((company) => (
              <TiltCard key={company.name}>
                <h3 className="text-2xl font-semibold">{company.name}</h3>
                <div className="mt-5 space-y-6">
                  {company.roles.map((role) => (
                    <div key={role.title + role.period}>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                        <h4 className="font-medium text-primary">{role.title}</h4>
                        <span className="text-sm text-muted-foreground tabular-nums">{role.period}</span>
                      </div>
                      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                        {role.bullets.map((b) => <li key={b}>{b}</li>)}
                      </ul>
                      {role.groups?.map((g) => (
                        <div key={g.title} className="mt-3 flex flex-wrap gap-1.5">
                          {g.items.map((it) => (
                            <Badge key={it.name} variant="outline" className="border-white/15 font-normal" title={it.detail}>
                              {it.link ? <a href={it.link} target="_blank" rel="noreferrer">{it.name}</a> : it.name}
                            </Badge>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </TiltCard>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div>
            <Heading>{t.labels.sideProjects}</Heading>
            <div className="space-y-6">
              {t.sideProjects.map((p) => (
                <TiltCard key={p.name}>
                  <h3 className="font-medium">{p.link ? <a href={p.link} target="_blank" rel="noreferrer">{p.name}</a> : p.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
                </TiltCard>
              ))}
            </div>
          </div>
          <div>
            <Heading>{t.labels.education}</Heading>
            <div className="space-y-6">
              {t.education.map((e) => (
                <TiltCard key={e.degree}>
                  <h3 className="font-medium">{e.degree}</h3>
                  <p className="text-sm text-muted-foreground">{e.school} · {e.period}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{e.note}</p>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-center gap-3 text-center">
          <a
            href={`mailto:${t.email}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm backdrop-blur-md transition hover:border-primary/60 hover:text-primary"
          >
            <Mail className="size-4" />
            {t.labels.contact} · {t.email}
          </a>
          <a href={t.links.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm backdrop-blur-md transition hover:border-primary/60 hover:text-primary">
            <GitHubIcon className="size-4" />
            GitHub
          </a>
          <a href={t.links.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm backdrop-blur-md transition hover:border-primary/60 hover:text-primary">
            <LinkedInIcon className="size-4" />
            LinkedIn
          </a>
        </section>
      </div>
    </motion.div>
  )
}
