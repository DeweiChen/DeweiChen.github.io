import { lazy, Suspense, useLayoutEffect } from 'react'
import { motion } from 'motion/react'
import { ClassicResume } from '@/classic/ClassicResume'
import { TopBar } from '@/components/TopBar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useCapabilities } from '@/hooks/useCapabilities'
import { PrintResume } from '@/print/PrintResume'
import { readModeFromUrl, useDimensionShift, type Phase } from '@/transition/DimensionShift'

const loadImmersive = () => import('@/immersive/ImmersiveScene')
const ImmersiveScene = lazy(loadImmersive)

const prefetchImmersive = () => void loadImmersive()

// The 3D chunk is ~290 kB gzip. On a desktop with a decent connection, fetch it once the page is
// idle so the 2D -> 3D transition never waits on the network. Phones, Save-Data and slow links
// only fetch it on intent (hovering, focusing or pressing the 3D toggle).
function shouldPrefetchOnIdle() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (conn?.saveData || /(^|-)[23]g$/.test(conn?.effectiveType ?? '')) return false
  return window.matchMedia('(pointer: fine)').matches
}

if (typeof window !== 'undefined' && shouldPrefetchOnIdle()) {
  if ('requestIdleCallback' in window) requestIdleCallback(prefetchImmersive, { timeout: 3000 })
  else setTimeout(prefetchImmersive, 1500)
}

const EASE = [0.65, 0, 0.35, 1] as const

// Where the classic page sits in each phase: flat, or tipped back and pushed into the screen.
const classicPose = {
  flat: { opacity: 1, rotateX: 0, z: 0, y: 0, filter: 'blur(0px)' },
  away: { opacity: 0, rotateX: 58, z: -500, y: -80, filter: 'blur(6px)' },
}

function Classic({ phase, heroRef, onMounted }: { phase: Phase; heroRef: React.Ref<HTMLDivElement>; onMounted: () => void }) {
  // During to2d, measure the hero card before paint so particles can land on it.
  useLayoutEffect(() => {
    if (phase === 'to2d') onMounted()
    // Only on mount.
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pose = phase === 'to3d' || phase === 'to2d' ? 'away' : 'flat'
  return (
    <motion.div
      initial={phase === 'to2d' ? 'away' : false}
      animate={pose}
      variants={classicPose}
      transition={{ duration: phase === 'to3d' ? 0.9 : 0.7, ease: EASE, delay: pose === 'flat' ? 0.05 : 0 }}
      style={{ transformPerspective: 1400, transformOrigin: '50% 0%' }}
      className={phase === 'to3d' ? 'pointer-events-none relative z-20' : 'relative z-20'}
    >
      <ClassicResume ref={heroRef} />
    </motion.div>
  )
}

function Shell() {
  const { webgl, reducedMotion, lowEnd } = useCapabilities()
  const initial = webgl && !reducedMotion ? readModeFromUrl() : 'classic'
  const { phase, mode, cardRect, heroRef, switchTo, reportCard, onMorphDone } = useDimensionShift(initial, !reducedMotion)

  const showClassic = phase !== 'immersive'
  const showImmersive = phase !== 'classic'
  // During to2d the classic page waits (hidden, tilted) until the particles have collapsed onto its card.
  const classicPhase: Phase = phase === 'to2d' ? 'to2d' : phase

  return (
    <>
    <div className="min-h-svh bg-background print:hidden">
      <TopBar mode={mode} onModeChange={switchTo} immersiveAvailable={webgl} busy={phase === 'to3d' || phase === 'to2d'} onImmersiveIntent={prefetchImmersive} />
      {showImmersive && (
        <Suspense fallback={null}>
          <ImmersiveScene
            cardRect={cardRect}
            direction={phase === 'to2d' ? 'out' : 'in'}
            lowEnd={lowEnd}
            onMorphDone={onMorphDone}
            onExit={() => switchTo('classic')}
          />
        </Suspense>
      )}
      {showClassic && (
        <div className={phase === 'to2d' ? 'fixed inset-x-0 top-0' : undefined}>
          <Classic phase={classicPhase} heroRef={heroRef} onMounted={reportCard} />
        </div>
      )}
    </div>
    <PrintResume />
    </>
  )
}

export default function App() {
  return (
    <TooltipProvider>
      <Shell />
    </TooltipProvider>
  )
}
