import { useEffect, useMemo, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, MeshBasicMaterial } from 'three'
import { useResume, type Resume } from '@/i18n/useResume'
import { CERTS, LAMP } from './roomLayout'
import { STATIONS, stationPresence } from './stations'
import { TextPlane } from './TextPlane'
import { SANS, useCanvasTexture, wrapRuns } from './textCanvas'
import type { ScrollProgress } from './useScrollProgress'

type Degree = Resume['education'][number]

const INDEX = STATIONS.findIndex((s) => s.id === 'education')
const SERIF = `Georgia, "Songti TC", "Noto Serif TC", ${SANS}`
const GOLD = '#d8b871'
const PX = 1024
const PY = Math.round((PX * CERTS.size[1]) / CERTS.size[0])
const WARM = '#c98d4a'

/** A diploma: dark paper with a gold border, degree in the middle, the note in small print. */
function Certificate({ degree, y, presence }: { degree: Degree; y: number; presence: () => number }) {
  const map = useCanvasTexture(
    PX,
    PY,
    (ctx) => {
      const g = ctx.createLinearGradient(0, 0, PX, PY)
      g.addColorStop(0, '#16182a')
      g.addColorStop(1, '#1d1a2c')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, PX, PY)
      ctx.strokeStyle = GOLD
      ctx.lineWidth = 6
      ctx.strokeRect(26, 26, PX - 52, PY - 52)
      ctx.lineWidth = 2
      ctx.strokeRect(44, 44, PX - 88, PY - 88)

      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = 'rgba(216, 184, 113, 0.85)'
      ctx.font = `500 34px ${SANS}`
      ctx.fillText(degree.school, PX / 2, 92, PX - 180)
      ctx.fillStyle = '#f1e7cf'
      ctx.font = `700 60px ${SERIF}`
      ctx.fillText(degree.degree, PX / 2, 160, PX - 160)
      ctx.fillStyle = 'rgba(216, 184, 113, 0.7)'
      ctx.fillRect(PX / 2 - 120, 252, 240, 2)
      ctx.fillStyle = '#b9b3a3'
      ctx.font = `500 32px ${SANS}`
      ctx.fillText(degree.period, PX / 2, 276)

      // The note, centred line by line.
      const lines = wrapRuns(ctx, [{ text: degree.note, font: `400 36px ${SANS}`, color: '#cfc9b8' }], PX - 240)
      ctx.textAlign = 'left'
      lines.forEach((line, i) => {
        const last = line[line.length - 1]
        ctx.font = last.font
        const width = last.x + ctx.measureText(last.text).width
        for (const p of line) {
          ctx.font = p.font
          ctx.fillStyle = p.color
          ctx.fillText(p.text, (PX - width) / 2 + p.x, 350 + i * 56)
        }
      })

      // Seal.
      ctx.fillStyle = 'rgba(216, 184, 113, 0.18)'
      ctx.strokeStyle = GOLD
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(PX - 130, PY - 120, 46, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(PX - 130, PY - 120, 34, 0, Math.PI * 2)
      ctx.stroke()
    },
    [degree],
  )

  return (
    <TextPlane
      map={map}
      width={CERTS.size[0]}
      height={CERTS.size[1]}
      position={[CERTS.x - 0.022, y, CERTS.z]}
      rotation={[0, -Math.PI / 2, 0]}
      reveal={() => Math.min(1, presence() * 1.4)}
      // Lit by the lamp once it is on.
      glow={() => presence() * 0.15}
    />
  )
}

/** Warm light spilling on the wall around the certificates. */
function LightPool({ presence }: { presence: () => number }) {
  const S = 256
  const map = useCanvasTexture(
    S,
    S,
    (ctx) => {
      const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
      g.addColorStop(0, 'rgba(255, 207, 138, 0.55)')
      g.addColorStop(0.5, 'rgba(255, 190, 120, 0.18)')
      g.addColorStop(1, 'rgba(255, 190, 120, 0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
    },
    [],
  )
  const material = useMemo(
    () => new MeshBasicMaterial({ map, transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: 0, toneMapped: false }),
    [map],
  )
  useEffect(() => () => material.dispose(), [material])
  useFrame(() => {
    material.opacity = presence()
  })

  return (
    <mesh material={material} position={[CERTS.x - 0.01, 0.35, (CERTS.z + LAMP.z) / 2]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[2.4, 2.4]} />
    </mesh>
  )
}

/** Education: two framed certificates beside the floor lamp, which switches on as you arrive. */
export function Education({ progress }: { progress: RefObject<ScrollProgress> }) {
  const { education } = useResume()
  const presence = () => stationPresence(progress.current.screens, INDEX)
  const bulb = useMemo(() => new MeshBasicMaterial({ color: WARM, transparent: true, opacity: 0, toneMapped: false }), [])
  useEffect(() => () => bulb.dispose(), [bulb])
  useFrame(() => {
    bulb.opacity = presence() * 0.85
  })

  return (
    <>
      <LightPool presence={presence} />
      {/* The shade glows from inside; bloom does the rest. */}
      <mesh material={bulb} position={[LAMP.x, LAMP.shadeY, LAMP.z]}>
        <boxGeometry args={[LAMP.shade + 0.004, 0.342, LAMP.shade + 0.004]} />
      </mesh>
      {education.slice(0, CERTS.ys.length).map((d, i) => (
        <Certificate key={d.id} degree={d} y={CERTS.ys[i]} presence={presence} />
      ))}
    </>
  )
}
