import { useCallback, useRef, useState } from 'react'
import type { PixelRect } from '@/immersive/SplatPortrait'
import type { Mode } from '@/components/TopBar'

/**
 * 2D <-> 3D transition state machine.
 *
 *   classic --switch--> to3d --particles settle--> immersive
 *   immersive --switch--> to2d --particles land on card--> classic
 *
 * During to3d the classic page tilts back into the screen while the particles
 * start exactly on the hero card's rect and burst into the portrait. to2d plays
 * it in reverse: the particles collapse onto the card's rect, then the page
 * flattens back into place.
 */
export type Phase = 'classic' | 'to3d' | 'immersive' | 'to2d'

export function readModeFromUrl(): Mode {
  return new URLSearchParams(location.search).get('mode') === '3d' ? 'immersive' : 'classic'
}

function writeModeToUrl(mode: Mode) {
  const url = new URL(location.href)
  if (mode === 'immersive') url.searchParams.set('mode', '3d')
  else url.searchParams.delete('mode')
  history.replaceState(null, '', url)
}

/**
 * Layout rect of the card, ignoring CSS transforms (during to2d the page is
 * still tilted away, but the particles must land where the card will rest).
 * Assumes the page is scrolled to the top, which switchTo guarantees.
 */
function rectOf(el: HTMLElement | null): PixelRect | null {
  if (!el) return null
  let x = 0
  let y = 0
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft
    y += n.offsetTop
  }
  return { x, y, width: el.offsetWidth, height: el.offsetHeight }
}

export function useDimensionShift(initial: Mode, animate: boolean) {
  const [phase, setPhase] = useState<Phase>(initial)
  const [cardRect, setCardRect] = useState<PixelRect | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  const mode: Mode = phase === 'classic' || phase === 'to2d' ? 'classic' : 'immersive'

  const switchTo = useCallback(
    (next: Mode) => {
      writeModeToUrl(next)
      window.scrollTo({ top: 0, behavior: 'instant' })
      if (!animate) {
        setCardRect(null)
        setPhase(next)
        return
      }
      if (next === 'immersive') {
        setCardRect(rectOf(heroRef.current))
        setPhase('to3d')
      } else {
        setPhase('to2d')
      }
    },
    [animate],
  )

  /** Called by the classic page once its hero card has mounted during to2d. */
  const reportCard = useCallback(() => {
    setCardRect(rectOf(heroRef.current))
  }, [])

  const onMorphDone = useCallback((target: 0 | 1) => {
    setPhase((p) => (target === 1 && p === 'to3d' ? 'immersive' : target === 0 && p === 'to2d' ? 'classic' : p))
  }, [])

  return { phase, mode, cardRect, heroRef, switchTo, reportCard, onMorphDone }
}
