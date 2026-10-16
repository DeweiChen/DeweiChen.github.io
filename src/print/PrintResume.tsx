import { GitHubIcon, LinkedInIcon } from '@/components/SocialLinks'
import { useLang } from '@/i18n/LangContext'
import photo from '@/assets/print/photo.jpg'
import homee from '@/assets/print/homee.png'
import xrspace from '@/assets/print/xrspace.png'
import vive from '@/assets/print/vive.png'
import htc from '@/assets/print/htc.png'
import './print.css'

const LOGOS: Record<string, string> = { 'Homee AI': homee, XRSPACE: xrspace, 'HTC Vive': vive, HTC: htc }

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
  const { t, lang } = useLang()
  const fullName = lang === 'zh' ? `${t.name} (${t.altName})` : `${t.altName} (${t.name})`
  const colon = lang === 'zh' ? '：' : ': '
  const listSep = lang === 'zh' ? '、' : ', '
  const titleSep = lang === 'zh' ? '｜' : ', '

  return (
    <div className="print-resume" aria-hidden>
      <header className="pr-header">
        <img src={photo} alt="" className="pr-photo" />
        <div>
          <h1>{fullName}</h1>
          <div className="pr-social">
            <a href={t.links.github} aria-label="GitHub"><GitHubIcon /></a>
            <a href={t.links.linkedin} aria-label="LinkedIn"><LinkedInIcon /></a>
          </div>
          <p>{t.headline.split(' · ')[0]} · {t.location}</p>
          <p className="pr-accent">{t.email}</p>
        </div>
      </header>

      <section>
        <h2 className="pr-ruled">{t.labels.about}</h2>
        <ul className="pr-bullets">
          {t.about.map((a) => (
            <li key={a.lead}><b>{a.lead}</b>{a.text}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="pr-ruled">{t.labels.skills}</h2>
        <ul className="pr-bullets">
          {t.skills.map((s) => (
            <li key={s.group}><b>{s.group}{colon.trim()}</b>{lang === 'zh' ? '' : ' '}{s.items.join(listSep)}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t.labels.experience}</h2>
        {t.experience.map((c) => (
          <div key={c.name} className="pr-entry">
            <div className="pr-body">
              <h3>{c.name}</h3>
              {c.roles.map((r) => (
                <div key={r.title + r.period} className="pr-role">
                  <h3>{r.title}{titleSep}{r.period}</h3>
                  {r.bullets.length === 1 && !r.groups ? (
                    <ul className="pr-bullets"><li>{r.bullets[0]}</li></ul>
                  ) : r.bullets.length === 1 ? (
                    <p>{r.bullets[0]}</p>
                  ) : (
                    <ul className="pr-bullets">{r.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                  )}
                  {r.groups?.map((g) => (
                    <div key={g.title} className="pr-group">
                      <h4>{g.title}</h4>
                      <ul className="pr-bullets">
                        {g.items.map((it) => (
                          <li key={it.name}>
                            {it.name}
                            {it.link && <> (<a href={it.link} className="pr-accent">Link</a>)</>}
                            {it.detail && <>{colon}{it.detail}</>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {LOGOS[c.name] && <img src={LOGOS[c.name]} alt="" className="pr-logo" />}
          </div>
        ))}
      </section>

      <section>
        <h2>{t.labels.sideProjects}</h2>
        {t.sideProjects.map((p) => (
          <div key={p.name} className="pr-entry pr-compact">
            <div className="pr-body">
              <h3>
                {p.name}
                {p.link && <> (<a href={p.link} className="pr-accent">Link</a>)</>}
              </h3>
              <p>{p.description}</p>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2>{t.labels.education}</h2>
        {t.education.map((e) => (
          <div key={e.degree} className="pr-entry pr-compact">
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
