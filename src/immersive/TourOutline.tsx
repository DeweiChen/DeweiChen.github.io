import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useResume } from '@/i18n/useResume'
import { cn } from '@/lib/utils'
import { OPEN_EVENT, type OpenDetail } from './panel'
import { EXPERIENCE, goToStation, SECTIONS, SIDE_PROJECTS, type Station } from './stations'
import { COMPANIES } from './timelineLayout'

// Hidden from sight, but focusable controls show up as a chip while they have focus.
const CONTROL = cn(
  'sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-20 focus-visible:right-4 focus-visible:z-50',
  'focus-visible:rounded-full focus-visible:border focus-visible:border-primary/60 focus-visible:bg-black/75',
  'focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:text-foreground focus-visible:backdrop-blur-md',
  'focus-visible:outline-none sm:focus-visible:top-24 sm:focus-visible:right-8',
)

const firstOf = (id: Station['id']) => SECTIONS.find((s) => s.id === id)!.first

function open(detail: OpenDetail) {
  window.dispatchEvent(new CustomEvent<OpenDetail>(OPEN_EVENT, { detail }))
}

/** A button that walks the camera to `station` when focused, and runs `onClick` when pressed. */
function TourButton({ station, onClick, children }: { station: number; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={CONTROL} onFocus={() => goToStation(station)} onClick={onClick}>
      {children}
    </button>
  )
}

function TourLink({ station, href, children }: { station: number; href: string; children: ReactNode }) {
  const external = !href.startsWith('mailto:')
  return (
    <a
      href={href}
      className={CONTROL}
      onFocus={() => goToStation(station)}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      {children}
    </a>
  )
}

/**
 * The whole resume as plain, semantic HTML for screen readers and crawlers, since
 * the 3D room paints it all on a canvas. Its controls drive the tour from the
 * keyboard: tabbing to one walks the camera to it, Enter opens it.
 */
export function TourOutline({ onExit }: { onExit?: () => void }) {
  const { t } = useTranslation()
  const r = useResume()
  const contact = firstOf('contact')

  return (
    <main aria-label={t('labels.skipTour')}>
      <h1 className="sr-only">
        {r.fullName} · {r.headline}
      </h1>
      <p className="sr-only">{r.location}</p>

      <section aria-labelledby="tour-about">
        <h2 id="tour-about" className="sr-only">
          {t('labels.about')}
        </h2>
        {r.about.map((line) => (
          <p key={line.lead} className="sr-only">
            <strong>{line.lead}</strong>
            {line.text}
          </p>
        ))}
      </section>

      <section aria-labelledby="tour-skills">
        <h2 id="tour-skills" className="sr-only">
          {t('labels.skills')}
        </h2>
        {r.skills.map((g) => (
          <div key={g.group} className="sr-only">
            <h3>{g.group}</h3>
            <ul>
              {g.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="tour-experience">
        <h2 id="tour-experience" className="sr-only">
          {t('labels.experience')}
        </h2>
        {r.experience.map((c, i) => {
          // Boards stand oldest first; the resume lists newest first.
          const stop = COMPANIES.findIndex((b) => b.index === i)
          return (
            <article key={c.id}>
              <h3 className="sr-only">{c.name}</h3>
              {c.roles.map((role) => (
                <div key={role.id} className="sr-only">
                  <h4>
                    {role.title}, {role.period}
                  </h4>
                  <ul>
                    {role.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  {role.groups?.map((g) => (
                    <p key={g.id}>
                      {g.title}: {g.items.map((it) => it.name).join(', ')}
                    </p>
                  ))}
                </div>
              ))}
              <TourButton station={EXPERIENCE.first + stop} onClick={() => open({ id: 'experience', index: stop })}>
                {t('labels.details')}: {c.name}
              </TourButton>
            </article>
          )
        })}
      </section>

      <section aria-labelledby="tour-side-projects">
        <h2 id="tour-side-projects" className="sr-only">
          {t('labels.sideProjects')}
        </h2>
        {r.sideProjects.map((p, i) => (
          <article key={p.id}>
            <h3 className="sr-only">
              {p.name}, {p.period}
            </h3>
            <p className="sr-only">{p.description}</p>
            <TourButton station={SIDE_PROJECTS.first + i} onClick={() => open({ id: 'sideProjects', index: i })}>
              {t('labels.details')}: {p.name}
            </TourButton>
            {p.link && (
              <TourLink station={SIDE_PROJECTS.first + i} href={p.link}>
                {t('labels.link')}: {p.name} ↗
              </TourLink>
            )}
          </article>
        ))}
      </section>

      <section aria-labelledby="tour-education">
        <h2 id="tour-education" className="sr-only">
          {t('labels.education')}
        </h2>
        {r.education.map((e) => (
          <div key={e.id} className="sr-only">
            <h3>
              {e.degree}, {e.school}, {e.period}
            </h3>
            <p>{e.note}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="tour-contact">
        <h2 id="tour-contact" className="sr-only">
          {t('labels.contact')}
        </h2>
        <TourLink station={contact} href={`mailto:${r.email}`}>
          Email: {r.email}
        </TourLink>
        <TourLink station={contact} href={r.links.github}>
          GitHub ↗
        </TourLink>
        <TourLink station={contact} href={r.links.linkedin}>
          LinkedIn ↗
        </TourLink>
        {onExit && (
          <TourButton station={contact} onClick={onExit}>
            ↩ {t('labels.backToClassic')}
          </TourButton>
        )}
      </section>
    </main>
  )
}
