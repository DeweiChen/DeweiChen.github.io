import type { RefObject } from 'react'
import { useResume } from '@/i18n/useResume'
import { shownWhenFree } from './freeMode'
import { FRAME } from './roomLayout'
import { goToStation, STATIONS, stationPresence } from './stations'
import { play } from './sound'
import { TextPlane } from './TextPlane'
import { drawLines, SANS, useCanvasTexture, wrapRuns } from './textCanvas'
import type { ScrollProgress } from './useScrollProgress'

const INDEX = STATIONS.findIndex((s) => s.id === 'about')
const MARGIN = 0.08
const W = FRAME.size[0] - MARGIN * 2
const H = FRAME.size[1] - MARGIN * 2
const PX = 2048
const PY = Math.round((PX * H) / W)

/** The greeting and intro, painted on the picture frame above the sofa. They scan in as the camera arrives. */
export function AboutFrame({ progress }: { progress: RefObject<ScrollProgress> }) {
  const { intro } = useResume()

  const map = useCanvasTexture(
    PX,
    PY,
    (ctx) => {
      const g = ctx.createLinearGradient(0, 0, PX, PY)
      g.addColorStop(0, '#0d1424')
      g.addColorStop(1, '#151028')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, PX, PY)
      ctx.strokeStyle = 'rgba(150, 190, 255, 0.18)'
      ctx.lineWidth = 3
      ctx.strokeRect(24, 24, PX - 48, PY - 48)

      // Largest size at which all paragraphs fit.
      const pad = 130
      for (let size = 68; size >= 30; size -= 2) {
        const paragraphs = [
          wrapRuns(ctx, [{ text: intro.greeting, font: `700 ${size * 1.3}px ${SANS}`, color: '#7fd8f5' }], PX - pad * 2),
          ...intro.lines.map((line) => wrapRuns(ctx, [{ text: line, font: `400 ${size}px ${SANS}`, color: '#d9dcea' }], PX - pad * 2)),
        ]
        const lineHeight = size * 1.55
        const gap = size * 0.9
        const total = paragraphs.reduce((h, p) => h + p.length * lineHeight, 0) + gap * (paragraphs.length - 1)
        if (total > PY - pad * 2 && size > 30) continue
        let y = (PY - total) / 2
        for (const p of paragraphs) y = drawLines(ctx, p, pad, y, lineHeight) + gap
        break
      }
    },
    [intro],
  )

  return (
    <TextPlane
      map={map}
      width={W}
      height={H}
      position={[FRAME.center[0], FRAME.center[1], FRAME.center[2] + 0.025]}
      onClick={(e) => {
        e.stopPropagation()
        play('click')
        goToStation(INDEX)
      }}
      reveal={() => {
        const p = Math.min(1, stationPresence(progress.current.screens, INDEX) * 1.4)
        return shownWhenFree(p * p * (3 - 2 * p))
      }}
    />
  )
}
