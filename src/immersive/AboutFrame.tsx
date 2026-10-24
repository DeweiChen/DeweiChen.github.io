import type { RefObject } from 'react'
import { useResume } from '@/i18n/useResume'
import { Fixture, GlowPool, glowStops } from './GlowPool'
import { FRAME } from './roomLayout'
import { STATIONS, stationPresence } from './stations'
import { TextPlane } from './TextPlane'
import { drawLines, SANS, useCanvasTexture, wrapRuns } from './textCanvas'
import type { ScrollProgress } from './useScrollProgress'

const INDEX = STATIONS.findIndex((s) => s.id === 'about')
const MARGIN = 0.08
const W = FRAME.size[0] - MARGIN * 2
const H = FRAME.size[1] - MARGIN * 2
const PX = 2048
const PY = Math.round((PX * H) / W)
// Cool, slightly icy picture light.
const ICE: [number, number, number] = [207, 228, 255]
const LAMP_Y = FRAME.center[1] + FRAME.size[1] / 2 + 0.09

/** The About lines, painted on the picture frame above the sofa. They scan in, and the picture light comes on, as the camera arrives. */
export function AboutFrame({ progress }: { progress: RefObject<ScrollProgress> }) {
  const { about } = useResume()
  const presence = () => stationPresence(progress.current.screens, INDEX)

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
        const paragraphs = about.map((line) =>
          wrapRuns(
            ctx,
            [
              { text: line.lead, font: `650 ${size}px ${SANS}`, color: '#7fd8f5' },
              { text: line.text, font: `400 ${size}px ${SANS}`, color: '#d9dcea' },
            ],
            PX - pad * 2,
          ),
        )
        const lineHeight = size * 1.55
        const gap = size * 0.9
        const total = paragraphs.reduce((h, p) => h + p.length * lineHeight, 0) + gap * (paragraphs.length - 1)
        if (total > PY - pad * 2 && size > 30) continue
        let y = (PY - total) / 2
        for (const p of paragraphs) y = drawLines(ctx, p, pad, y, lineHeight) + gap
        break
      }
    },
    [about],
  )

  return (
    <>
      {/* Picture light above the frame, washing down over the wall and the canvas. */}
      <Fixture color="#eaf3ff" strength={() => presence() * 0.9} position={[FRAME.center[0], LAMP_Y, FRAME.center[2] + 0.06]}>
        <boxGeometry args={[FRAME.size[0] * 0.55, 0.03, 0.08]} />
      </Fixture>
      <GlowPool
        stops={glowStops(ICE, 0.2)}
        strength={presence}
        center={[0.5, 0.2]}
        stretch={1.5}
        radius={0.75}
        size={[FRAME.size[0] + 1.4, FRAME.size[1] + 1.2]}
        position={[FRAME.center[0], FRAME.center[1] + 0.1, FRAME.center[2] - 0.018]}
      />
      <TextPlane
        map={map}
        width={W}
        height={H}
        position={[FRAME.center[0], FRAME.center[1], FRAME.center[2] + 0.025]}
        reveal={() => {
          const p = Math.min(1, presence() * 1.4)
          return p * p * (3 - 2 * p)
        }}
        glow={() => presence() * 0.12}
      />
      {/* The light falling across the canvas, brightest under the lamp. */}
      <GlowPool
        stops={glowStops(ICE, 0.12)}
        strength={presence}
        center={[0.5, -0.05]}
        stretch={1.8}
        radius={0.9}
        size={FRAME.size}
        position={[FRAME.center[0], FRAME.center[1], FRAME.center[2] + 0.03]}
      />
    </>
  )
}
