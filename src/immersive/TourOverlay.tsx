import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { SocialLinks } from '@/components/SocialLinks'
import { useTranslation } from 'react-i18next'
import { useResume } from '@/i18n/useResume'
import { cn } from '@/lib/utils'
import { READER_EVENT } from './Timeline'
import { EXPERIENCE, SECTIONS, sectionOf, STATION_AT, STATIONS, TOUR_LENGTH, stationLabel, tourPosition } from './stations'
import { headX, yearOfX } from './timelineLayout'

const coarsePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

function goTo(i: number) {
  const index = Math.min(STATIONS.length - 1, Math.max(0, i))
  window.scrollTo({ top: STATION_AT[index] * innerHeight, behavior: 'smooth' })
}

/** Scroll offset in viewport heights, updated once per animation frame. */
function useScreens() {
  const [screens, setScreens] = useState(() => scrollY / innerHeight)
  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setScreens(scrollY / innerHeight))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  return screens
}

// Floor plan bounds in room units (x, z), including the hero stop in front of the open wall.
const PLAN = { x0: -3.6, x1: 3.6, z0: -4.4, z1: 3 }
const planX = (x: number) => ((x - PLAN.x0) / (PLAN.x1 - PLAN.x0)) * 100
const planY = (z: number) => ((z - PLAN.z0) / (PLAN.z1 - PLAN.z0)) * 100

/** Top-down map of the room, like a headset's guardian view: stations as dots, you as the marker. */
function FloorPlan({ position, current }: { position: number; current: number }) {
  const { t } = useTranslation()
  const i = Math.min(STATIONS.length - 2, Math.floor(position))
  const f = position - i
  const [ax, az] = STATIONS[i].map
  const [bx, bz] = STATIONS[i + 1].map
  const me = [ax + (bx - ax) * f, az + (bz - az) * f]

  return (
    <svg viewBox="0 0 100 100" className="size-24 sm:size-28" aria-hidden>
      <rect x={planX(-3.2)} y={planY(-4)} width={planX(3.2) - planX(-3.2)} height={planY(2) - planY(-4)} className="fill-white/[0.03] stroke-white/25" strokeWidth={0.8} />
      <polyline
        points={STATIONS.map((s) => `${planX(s.map[0])},${planY(s.map[1])}`).join(' ')}
        className="fill-none stroke-white/15"
        strokeWidth={0.6}
        strokeDasharray="2 2"
      />
      {STATIONS.map((s, k) => (
        <circle
          key={k}
          cx={planX(s.map[0])}
          cy={planY(s.map[1])}
          r={k === current ? 3.2 : 2}
          className={cn('cursor-pointer transition-all', k === current ? 'fill-primary' : 'fill-white/40 hover:fill-white/80')}
          onClick={() => goTo(k)}
        >
          <title>{stationLabel(s.id, t)}</title>
        </circle>
      ))}
      <circle cx={planX(me[0])} cy={planY(me[1])} r={4.5} className="fill-none stroke-primary" strokeWidth={1} />
    </svg>
  )
}

/** Everything DOM in immersive mode: the hero caption, the scroll track that drives the tour, and the HUD. */
export function TourOverlay({ visible }: { visible: boolean }) {
  const r = useResume()
  const { t } = useTranslation()
  const screens = useScreens()
  const position = tourPosition(screens)
  const current = Math.round(position)
  const section = sectionOf(current)
  // The Experience walk keeps its title up the whole way, with the year ticking under it.
  const walking = position > EXPERIENCE.first - 0.5 && position < EXPERIENCE.last + 0.5
  const arrived = Math.abs(position - current) < 0.08 || walking
  const year = Math.floor(yearOfX(headX(position - EXPERIENCE.first)))
  const [reading, setReading] = useState(false)
  const hudVisible = visible && screens > 0.5 && !reading

  useEffect(() => {
    const onReader = (e: Event) => setReading((e as CustomEvent<boolean>).detail)
    window.addEventListener(READER_EVENT, onReader)
    return () => window.removeEventListener(READER_EVENT, onReader)
  }, [])

  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowRight') goTo(current + 1)
      else if (e.key === 'ArrowLeft') goTo(current - 1)
      else if (/^[1-9]$/.test(e.key) && Number(e.key) <= SECTIONS.length) goTo(SECTIONS[Number(e.key) - 1].first)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, current])

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.6, delay: visible ? 0.9 : 0 }}
        // Transparent to the pointer so the books and frames in the canvas below can be hovered.
        className="pointer-events-none relative z-10 overflow-x-clip"
      >
        {/* First screen belongs to the particles; only a caption and the stats sit at the bottom. */}
        <section className="pointer-events-none flex h-svh flex-col items-center justify-end px-4 pb-8 text-center sm:pb-10">
          <p className="text-sm text-foreground/90 sm:text-lg">{r.headline}</p>
          <p className="mt-1 text-sm text-muted-foreground">{r.location}</p>
          <SocialLinks className={cn('mt-3 text-muted-foreground', visible && 'pointer-events-auto')} iconClassName="size-4" />
          <dl className="mt-5 grid grid-cols-4 gap-x-4 sm:mt-6 sm:flex sm:gap-x-8">
            {r.stats.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-xl font-semibold tabular-nums sm:text-2xl">{s.value}</dd>
                <dd className="text-[11px] leading-tight text-muted-foreground sm:text-xs">{s.label}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-xs tracking-widest text-muted-foreground/80 sm:mt-8">
            {coarsePointer ? t('labels.hintTouch') : t('labels.hint')}
          </p>
          <ChevronDown className="mt-2 size-5 animate-bounce text-muted-foreground" aria-label={t('labels.scroll')} />
        </section>
        {/* Empty track: its height is the tour, the camera reads the scroll position. */}
        <div aria-hidden style={{ height: `${TOUR_LENGTH * 100}vh` }} />
      </motion.div>

      <AnimatePresence>
        {hudVisible && arrived && section > 0 && (
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none fixed top-20 left-4 z-20 sm:top-24 sm:left-8"
          >
            <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground">
              {String(section).padStart(2, '0')} / {String(SECTIONS.length - 1).padStart(2, '0')}
            </p>
            <h2 className="mt-1 bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-3xl font-semibold tracking-wide text-transparent sm:text-5xl">
              {stationLabel(STATIONS[current].id, t)}
            </h2>
            {walking && (
              <p className="mt-2 font-mono text-5xl font-light tracking-tight text-foreground/90 tabular-nums sm:text-7xl" aria-live="off">
                {year}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav
        aria-label={t('labels.tour')}
        initial={false}
        animate={{ opacity: hudVisible ? 1 : 0, y: hudVisible ? 0 : 16 }}
        transition={{ duration: 0.4 }}
        className={cn(
          'fixed bottom-4 left-4 z-20 flex items-end gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur-md sm:bottom-8 sm:left-8',
          !hudVisible && 'pointer-events-none',
        )}
      >
        <FloorPlan position={position} current={current} />
        <div className="flex flex-col gap-2 pb-1">
          <ol className="hidden space-y-0.5 text-xs sm:block">
            {SECTIONS.map((s, k) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => goTo(s.first)}
                  className={cn('transition-colors', k === section ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
                >
                  <span className="mr-2 font-mono tabular-nums opacity-60">{k + 1}</span>
                  {stationLabel(s.id, t)}
                </button>
              </li>
            ))}
          </ol>
          <div className="flex gap-1.5">
            {[
              { to: current - 1, Icon: ChevronLeft, disabled: current === 0 },
              { to: current + 1, Icon: ChevronRight, disabled: current === STATIONS.length - 1 },
            ].map(({ to, Icon, disabled }) => (
              <button
                key={to}
                type="button"
                disabled={disabled}
                onClick={() => goTo(to)}
                aria-label={disabled ? undefined : stationLabel(STATIONS[to].id, t)}
                className="grid size-8 place-items-center rounded-full border border-white/15 bg-white/5 transition hover:border-primary/60 hover:text-primary disabled:opacity-30"
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </motion.nav>
    </>
  )
}
