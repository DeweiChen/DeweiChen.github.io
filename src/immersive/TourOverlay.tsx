import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronLeft, ChevronRight, Footprints, Map, Route } from 'lucide-react'
import { SocialLinks } from '@/components/SocialLinks'
import { useTranslation } from 'react-i18next'
import { useResume } from '@/i18n/useResume'
import { cn } from '@/lib/utils'
import { POSE_EVENT, setFree, useFreeMode } from './freeMode'
import { READER_EVENT } from './panel'
import { EXPERIENCE, goToStation, SECTIONS, sectionOf, STATIONS, TOUR_LENGTH, stationLabel, tourPosition } from './stations'
import { OUTLINE } from './roomLayout'
import { headX, yearOfX } from './timelineLayout'

const coarsePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const goTo = goToStation

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

// Floor plan bounds in room units (x, z): the room's outline plus every stop, the hero
// one in front of the open wall included. One room unit is 10 plan units.
const PLAN = {
  x0: Math.min(...OUTLINE.map((p) => p[0]), ...STATIONS.map((s) => s.map[0])) - 0.4,
  x1: Math.max(...OUTLINE.map((p) => p[0]), ...STATIONS.map((s) => s.map[0])) + 0.4,
  z0: Math.min(...OUTLINE.map((p) => p[1]), ...STATIONS.map((s) => s.map[1])) - 0.4,
  z1: Math.max(...OUTLINE.map((p) => p[1]), ...STATIONS.map((s) => s.map[1])) + 0.4,
}
const PLAN_W = (PLAN.x1 - PLAN.x0) * 10
const PLAN_H = (PLAN.z1 - PLAN.z0) * 10
const planX = (x: number) => (x - PLAN.x0) * 10
const planY = (z: number) => (z - PLAN.z0) * 10

/** The camera's spot on the floor while roaming free, or null on the tour. */
function useRoamPose(free: boolean) {
  const [pose, setPose] = useState<[number, number] | null>(null)
  useEffect(() => {
    if (!free) return
    const onPose = (e: Event) => setPose((e as CustomEvent<[number, number]>).detail)
    window.addEventListener(POSE_EVENT, onPose)
    return () => {
      window.removeEventListener(POSE_EVENT, onPose)
      setPose(null)
    }
  }, [free])
  return pose
}

/** Top-down map of the room, like a headset's guardian view: stations as dots, you as the marker. */
function FloorPlan({ position, current, roam }: { position: number; current: number; roam: [number, number] | null }) {
  const { t } = useTranslation()
  const i = Math.min(STATIONS.length - 2, Math.floor(position))
  const f = position - i
  const [ax, az] = STATIONS[i].map
  const [bx, bz] = STATIONS[i + 1].map
  const me = roam ?? [ax + (bx - ax) * f, az + (bz - az) * f]

  return (
    <svg viewBox={`0 0 ${PLAN_W} ${PLAN_H}`} className="h-auto w-full select-none" style={{ aspectRatio: `${PLAN_W} / ${PLAN_H}` }} aria-hidden>
      <polygon
        points={OUTLINE.map(([x, z]) => `${planX(x)},${planY(z)}`).join(' ')}
        className="fill-white/[0.04] stroke-white/25"
        strokeWidth={0.8}
      />
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

/** Switches between the scroll-driven tour and roaming the room freely. */
function ModeToggle({ free, compact }: { free: boolean; compact?: boolean }) {
  const { t } = useTranslation()
  const label = free ? t('labels.tourMode') : t('labels.freeMode')
  const Icon = free ? Route : Footprints
  return (
    <button
      type="button"
      onClick={() => setFree(!free)}
      aria-label={label}
      title={label}
      className={cn(
        'flex items-center gap-1 rounded-full border border-white/10 bg-white/5 text-muted-foreground transition hover:border-primary/60 hover:text-primary',
        compact ? 'size-7 justify-center' : 'px-2 py-0.5 text-[11px]',
      )}
    >
      <Icon className="size-3.5" />
      {!compact && label}
    </button>
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
  // Walks (several stops in one section) keep their title up the whole way;
  // the Experience walk has the year ticking under it.
  const sec = SECTIONS[section]
  const walking = !!sec && sec.last > sec.first && position > sec.first - 0.5 && position < sec.last + 0.5
  const timeline = walking && sec.id === 'experience'
  const arrived = Math.abs(position - current) < 0.08 || walking
  const year = Math.floor(yearOfX(headX(position - EXPERIENCE.first)))
  const [reading, setReading] = useState(false)
  const [collapsed, setCollapsed] = useState(() => coarsePointer)
  const [idleAtStation, setIdleAtStation] = useState(false)
  const isIdle = arrived && idleAtStation
  const hudVisible = visible && screens > 0.5 && !reading
  const free = useFreeMode()
  const roam = useRoamPose(free)

  // Dim the title when resting at a station to keep the 3D scene unobstructed.
  useEffect(() => {
    if (!arrived) {
      setIdleAtStation(false)
      return
    }
    const timer = setTimeout(() => setIdleAtStation(true), 2500)
    const onActivity = () => setIdleAtStation(false)
    window.addEventListener('scroll', onActivity, { passive: true })
    window.addEventListener('pointerdown', onActivity, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onActivity)
      window.removeEventListener('pointerdown', onActivity)
    }
  }, [arrived, section])

  useEffect(() => {
    const onReader = (e: Event) => setReading((e as CustomEvent<boolean>).detail)
    window.addEventListener(READER_EVENT, onReader)
    return () => window.removeEventListener(READER_EVENT, onReader)
  }, [])

  useEffect(() => {
    if (!visible || reading) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // While roaming the arrow keys walk (see FreeRig).
      if (e.key === 'ArrowRight' && !free) goTo(current + 1)
      else if (e.key === 'ArrowLeft' && !free) goTo(current - 1)
      else if (/^[1-9]$/.test(e.key) && Number(e.key) <= SECTIONS.length) goTo(SECTIONS[Number(e.key) - 1].first)
      else if (e.key === 'm' || e.key === 'M') setCollapsed((c) => !c)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, reading, current, free])

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.6, delay: visible ? 0.9 : 0 }}
        // Transparent to the pointer so the books and frames in the canvas below can be hovered.
        className="pointer-events-none relative z-10 overflow-x-clip"
      >
        {/* First screen belongs to the particles; only a caption and the intro's first line sit at the bottom. The full intro hangs on the About frame. */}
        <section className="pointer-events-none flex h-svh flex-col items-center justify-end px-4 pb-8 text-center sm:pb-10">
          <p className="max-w-xl text-sm text-foreground/80 sm:text-base">{r.intro.lines[0]}</p>
          <SocialLinks className={cn('mt-3 text-muted-foreground', visible && 'pointer-events-auto')} iconClassName="size-4" />
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
            className="pointer-events-none fixed top-20 left-4 z-20 hidden landscape:block sm:top-24 sm:left-8"
          >
            {/* Desktop / landscape full editorial title; hidden in portrait to avoid duplicate HUD pills */}
            <div
              className={cn(
                'transition-opacity duration-700 ease-out',
                isIdle ? 'opacity-80' : 'opacity-100',
              )}
            >
              <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground">
                {String(section).padStart(2, '0')} / {String(SECTIONS.length - 1).padStart(2, '0')}
              </p>
              <h2 className="mt-1 bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-3xl font-semibold tracking-wide text-transparent sm:text-5xl">
                {stationLabel(STATIONS[current].id, t)}
              </h2>
              {timeline && (
                <p className="mt-2 font-mono text-5xl font-light tracking-tight text-foreground/90 tabular-nums sm:text-7xl" aria-live="off">
                  {year}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav
        layout
        aria-label={t('labels.tour')}
        initial={false}
        animate={{ opacity: hudVisible ? 1 : 0, y: hudVisible ? 0 : 16 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'fixed bottom-4 left-4 z-20 rounded-2xl border border-white/10 bg-black/40 shadow-lg backdrop-blur-md transition-colors sm:bottom-8 sm:left-8',
          collapsed ? 'p-1.5' : 'w-[276px] p-3 sm:w-[288px]',
          !hudVisible && 'pointer-events-none',
        )}
      >
        {collapsed ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={current === 0}
              onClick={() => goTo(current - 1)}
              aria-label={current === 0 ? undefined : stationLabel(STATIONS[current - 1]?.id, t)}
              className="grid size-7 place-items-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition hover:border-primary/60 hover:text-primary disabled:opacity-25"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label={t('labels.expandMap')}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-foreground/90 transition hover:bg-white/10"
            >
              <span className="font-mono text-[11px] font-semibold text-primary">
                {String(section).padStart(2, '0')}
              </span>
              <span className="max-w-[100px] truncate text-xs font-medium text-foreground/90 sm:max-w-[120px]">
                {stationLabel(STATIONS[current].id, t)}
              </span>
              {timeline && (
                <span className="font-mono text-[11px] font-medium text-primary tabular-nums" aria-live="off">
                  {year}
                </span>
              )}
              <Map className="ml-1 size-3.5 text-muted-foreground transition hover:text-foreground" />
            </button>
            <ModeToggle free={free} compact />
            <button
              type="button"
              disabled={current === STATIONS.length - 1}
              onClick={() => goTo(current + 1)}
              aria-label={current === STATIONS.length - 1 ? undefined : stationLabel(STATIONS[current + 1]?.id, t)}
              className="grid size-7 place-items-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition hover:border-primary/60 hover:text-primary disabled:opacity-25"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-0.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Map className="size-3.5 text-primary" />
                <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t('labels.map')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <ModeToggle free={free} />
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  aria-label={t('labels.collapseMap')}
                  className="grid size-5 place-items-center rounded text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
            </div>
            {free && <p className="px-0.5 text-[11px] leading-snug text-muted-foreground">{t('labels.freeHint')}</p>}

            <div className="grid grid-cols-[104px_1fr] items-center gap-2.5">
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-1">
                <FloorPlan position={position} current={current} roam={roam} />
              </div>
              <div className="flex h-full flex-col justify-between py-0.5">
                <ol className="flex flex-col gap-0.5 text-[11px]">
                  {SECTIONS.map((s, k) => (
                    <li key={s.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => goTo(s.first)}
                        className={cn(
                          'flex w-full items-center truncate rounded px-1.5 py-0.5 text-left transition-colors',
                          k === section
                            ? 'bg-primary/10 font-medium text-primary'
                            : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                        )}
                      >
                        <span className="mr-1.5 font-mono text-[10px] tabular-nums opacity-60">{k + 1}</span>
                        <span className="truncate">{stationLabel(s.id, t)}</span>
                      </button>
                    </li>
                  ))}
                </ol>
                <div className="flex items-center justify-end gap-1.5 border-t border-white/5 pt-1.5">
                  {[
                    { to: current - 1, Icon: ChevronLeft, disabled: current === 0 },
                    { to: current + 1, Icon: ChevronRight, disabled: current === STATIONS.length - 1 },
                  ].map(({ to, Icon, disabled }) => (
                    <button
                      key={to}
                      type="button"
                      disabled={disabled}
                      onClick={() => goTo(to)}
                      aria-label={disabled ? undefined : stationLabel(STATIONS[to]?.id, t)}
                      className="grid size-6 place-items-center rounded-full border border-white/15 bg-white/5 transition hover:border-primary/60 hover:text-primary disabled:opacity-30"
                    >
                      <Icon className="size-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.nav>
    </>
  )
}
