import { GitHubIcon, LinkedInIcon } from '@/components/SocialLinks'
import { useTranslation } from 'react-i18next'
import { useResume } from '@/i18n/useResume'
import photo from '@/assets/print/photo.jpg'
import homee from '@/assets/print/homee.png'
import xrspace from '@/assets/print/xrspace.png'
import vive from '@/assets/print/vive.png'
import htc from '@/assets/print/htc.png'
import './print.css'

const LOGOS: Record<string, string> = { homee, xrspace, vive, htc, freelance: `${import.meta.env.BASE_URL}favicon.svg` }

/** Splits "Lead: rest" (or full-width "：") so the lead can be bolded, as in the PDF. */
function Lead({ text }: { text: string }) {
  const m = text.match(/^([^:：]{1,40}[:：])\s*(.*)$/)
  if (!m) return <>{text}</>
  return (
    <>
      <b>{m[1]}</b> {m[2]}
    </>
  )
}

/**
 * Print-only layout that mirrors the original PDF resume (A4, photo header,
 * timeline with company logos). Hidden on screen; the screen layouts are
 * hidden in print, so Cmd+P from either mode produces this.
 */
export function PrintResume() {
  const r = useResume()
  const { t } = useTranslation()
  const colon = t('format.colon')
  const listSep = t('format.listSep')
  const titleSep = t('format.titleSep')

  return (
    <div className="print-resume" aria-hidden>
      <header className="pr-header">
        <img src={photo} alt="" className="pr-photo" />
        <div>
          <h1>{r.fullName}</h1>
          <div className="pr-social">
            <a href={r.links.github} aria-label="GitHub"><GitHubIcon /></a>
            <a href={r.links.linkedin} aria-label="LinkedIn"><LinkedInIcon /></a>
          </div>
          <p>{r.headline.split(' · ')[0]} · {r.location}</p>
          <p className="pr-accent">{r.email} · <a href={r.links.website}>{r.links.website.replace(/^https:\/\/|\/$/g, '')}</a></p>
        </div>
      </header>

      <section>
        <h2 className="pr-ruled">{t('labels.about')}</h2>
        <ul className="pr-bullets">
          {r.about.map((a) => (
            <li key={a.lead}><b>{a.lead}</b>{a.text}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="pr-ruled">{t('labels.skills')}</h2>
        <ul className="pr-bullets">
          {r.skills.map((s) => (
            <li key={s.group}><b>{s.group}{colon.trim()}</b>{colon.slice(colon.trim().length)}{s.items.join(listSep)}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t('labels.experience')}</h2>
        {r.experience.map((c) => (
          <div key={c.id} className="pr-entry">
            <div className="pr-body">
              <h3>{c.name}</h3>
              {c.roles.map((role) => (
                <div key={role.id} className="pr-role">
                  <h3>{role.title}{titleSep}{role.period}</h3>
                  {role.bullets.length === 1 && !role.groups ? (
                    <ul className="pr-bullets"><li>{role.bullets[0]}</li></ul>
                  ) : role.bullets.length === 1 ? (
                    <p>{role.bullets[0]}</p>
                  ) : (
                    <ul className="pr-bullets">{role.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                  )}
                  {role.groups?.map((g) => (
                    <div key={g.title} className="pr-group">
                      <h4>{g.title}</h4>
                      <ul className="pr-bullets">
                        {g.items.map((it) => (
                          <li key={it.name}>
                            {it.name}
                            {it.link && <> (<a href={it.link} className="pr-accent">{t('labels.link')}</a>)</>}
                            {it.detail && <>{colon}{it.detail}</>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {LOGOS[c.id] && <img src={LOGOS[c.id]} alt="" className="pr-logo" />}
          </div>
        ))}
      </section>

      <section>
        <h2>{t('labels.sideProjects')}</h2>
        {r.sideProjects.map((p) => (
          <div key={p.id} className="pr-entry pr-compact">
            <div className="pr-body">
              <h3>
                {p.name} ({p.period})
                {p.link && <> · <a href={p.link} className="pr-accent">{t('labels.link')}</a></>}
              </h3>
              <p>{p.description}</p>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2>{t('labels.education')}</h2>
        {r.education.map((e) => (
          <div key={e.id} className="pr-entry pr-compact">
            <div className="pr-body">
              <h3>{e.degree} | {e.school} | {e.period}</h3>
              <ul className="pr-bullets"><li><Lead text={e.note} /></li></ul>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
