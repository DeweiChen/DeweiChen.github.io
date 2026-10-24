import { useEffect, useRef, useState, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useTranslation } from 'react-i18next'
import { BoxGeometry, DoubleSide, EdgesGeometry, type Group } from 'three'
import { useResume, type Resume } from '@/i18n/useResume'
import { CYAN, MUTED, TEXT, type PanelLayout } from './panel'
import { Reader } from './Reader'
import { FLOOR_Y, SHOWCASE } from './roomLayout'
import { STATIONS, stationPresence, tourPosition } from './stations'
import { TextPlane } from './TextPlane'
import { drawLines, SANS, useCanvasTexture, wrapRuns } from './textCanvas'
import type { ScrollProgress } from './useScrollProgress'

type Project = Resume['sideProjects'][number]

const INDEX = STATIONS.findIndex((s) => s.id === 'sideProjects')
const PEDESTAL = { w: 0.5, h: 0.75 }
const GLASS = 0.5
const TOP = FLOOR_Y + PEDESTAL.h
const PLAQUE = { w: 0.48, h: 0.28, y: TOP - 0.2 }
const PX = 768
const PY = Math.round((PX * PLAQUE.h) / PLAQUE.w)
const GLASS_EDGES = new EdgesGeometry(new BoxGeometry(GLASS, GLASS, GLASS))

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** A small app-icon glyph per project, drawn in a w x w box. */
function drawGlyph(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, w: number) {
  const g = ctx.createLinearGradient(x, y, x + w, y + w)
  g.addColorStop(0, '#2eb8f2')
  g.addColorStop(1, '#944cfa')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(x, y, w, w, w * 0.24)
  ctx.fill()

  const cx = x + w / 2
  const cy = y + w / 2
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = w * 0.07
  ctx.beginPath()
  if (id === 'smartHome') {
    // Camera lens with a recording dot.
    ctx.arc(cx, cy, w * 0.26, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ff5a6a'
    ctx.beginPath()
    ctx.arc(x + w * 0.78, y + w * 0.22, w * 0.07, 0, Math.PI * 2)
    ctx.fill()
  } else if (id === 'toiletFinder') {
    // Map pin.
    ctx.arc(cx, cy - w * 0.08, w * 0.2, Math.PI, 0)
    ctx.lineTo(cx, cy + w * 0.3)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx, cy - w * 0.08, w * 0.08, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // Four-point sparkle.
    const r = w * 0.3
    ctx.moveTo(cx, cy - r)
    ctx.quadraticCurveTo(cx, cy, cx + r, cy)
    ctx.quadraticCurveTo(cx, cy, cx, cy + r)
    ctx.quadraticCurveTo(cx, cy, cx - r, cy)
    ctx.quadraticCurveTo(cx, cy, cx, cy - r)
    ctx.fill()
  }
}

/** Little street map for the ToiletFinder model to stand on. */
function useMapTexture() {
  return useCanvasTexture(
    256,
    180,
    (ctx) => {
      ctx.fillStyle = '#141a30'
      ctx.fillRect(0, 0, 256, 180)
      ctx.strokeStyle = 'rgba(160, 180, 230, 0.35)'
      ctx.lineWidth = 6
      for (const x of [40, 120, 200]) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + 20, 180)
        ctx.stroke()
      }
      for (const y of [50, 130]) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(256, y - 10)
        ctx.stroke()
      }
      // The route to the nearest restroom.
      ctx.strokeStyle = CYAN
      ctx.lineWidth = 5
      ctx.setLineDash([10, 8])
      ctx.beginPath()
      ctx.moveTo(30, 165)
      ctx.lineTo(48, 130)
      ctx.lineTo(125, 122)
      ctx.lineTo(128, 90)
      ctx.stroke()
    },
    [],
  )
}

/** A low-poly stand-in for each project, turning slowly inside its case. */
function Model({ id, spin }: { id: string; spin: () => number }) {
  const group = useRef<Group>(null)
  const led = useRef<Group>(null)
  const map = useMapTexture()

  useFrame(({ clock }, dt) => {
    const g = group.current!
    g.rotation.y += dt * (0.35 + spin() * 2)
    g.position.y = Math.sin(clock.elapsedTime * 1.4) * 0.012
    if (led.current) led.current.visible = Math.sin(clock.elapsedTime * 5) > -0.3
  })

  return (
    <group ref={group}>
      {id === 'smartHome' && (
        // An old phone on a mount, turned into a security camera.
        <group rotation={[0.25, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.13, 0.23, 0.016]} />
            <meshStandardMaterial color="#454870" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.07, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.026, 0.026, 0.012, 24]} />
            <meshStandardMaterial color="#0b0d18" emissive="#2eb8f2" emissiveIntensity={0.6} />
          </mesh>
          <group ref={led} position={[0.045, 0.098, 0.01]}>
            <mesh>
              <sphereGeometry args={[0.007, 12, 8]} />
              <meshBasicMaterial color="#ff4d5e" toneMapped={false} />
            </mesh>
          </group>
          <mesh position={[0, -0.15, -0.01]}>
            <boxGeometry args={[0.02, 0.08, 0.02]} />
            <meshStandardMaterial color="#3a3c5c" />
          </mesh>
          <mesh position={[0, -0.19, -0.01]}>
            <cylinderGeometry args={[0.05, 0.055, 0.014, 24]} />
            <meshStandardMaterial color="#3a3c5c" />
          </mesh>
        </group>
      )}
      {id === 'toiletFinder' && (
        // A map pin standing on a street map.
        <>
          <mesh position={[0, -0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.3, 0.21]} />
            <meshBasicMaterial map={map} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <sphereGeometry args={[0.055, 24, 16]} />
            <meshStandardMaterial color="#2eb8f2" emissive="#2eb8f2" emissiveIntensity={0.35} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.04, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.05, 0.12, 24]} />
            <meshStandardMaterial color="#2eb8f2" emissive="#2eb8f2" emissiveIntensity={0.35} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.06, 0.05]}>
            <sphereGeometry args={[0.018, 12, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </>
      )}
      {id === 'ovoy' && (
        // A sparkle with petals drifting round it, for the anime live wallpaper.
        <>
          <mesh scale={[0.7, 1.4, 0.7]}>
            <octahedronGeometry args={[0.09]} />
            <meshStandardMaterial color="#944cfa" emissive="#944cfa" emissiveIntensity={0.5} flatShading />
          </mesh>
          <mesh scale={[1.4, 0.7, 0.7]}>
            <octahedronGeometry args={[0.07]} />
            <meshStandardMaterial color="#c7a6ff" emissive="#944cfa" emissiveIntensity={0.4} flatShading />
          </mesh>
          {Array.from({ length: 7 }, (_, k) => {
            const a = (k / 7) * Math.PI * 2
            return (
              <mesh key={k} position={[Math.cos(a) * 0.17, Math.sin(a * 3) * 0.06, Math.sin(a) * 0.17]} rotation={[a, a * 2, 0]}>
                <circleGeometry args={[0.014, 5]} />
                <meshBasicMaterial color="#f7a8c8" side={DoubleSide} />
              </mesh>
            )
          })}
        </>
      )}
    </group>
  )
}

/** One project on show: a pedestal with a plaque, and a glass case with its model inside. */
function DisplayCase({
  project,
  x,
  rise,
  selected,
  onSelect,
  plaqueRef,
}: {
  project: Project
  x: number
  /** 0 sunk in the floor, 1 standing. */
  rise: () => number
  selected: boolean
  onSelect: () => void
  plaqueRef: (g: Group | null) => void
}) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(false)
  const focus = useRef(0)
  const group = useRef<Group>(null)

  const map = useCanvasTexture(
    PX,
    PY,
    (ctx) => {
      ctx.fillStyle = '#121528'
      ctx.beginPath()
      ctx.roundRect(0, 0, PX, PY, 28)
      ctx.fill()
      ctx.strokeStyle = 'rgba(127, 216, 245, 0.45)'
      ctx.lineWidth = 4
      ctx.stroke()
      drawGlyph(ctx, project.id, 44, 48, 116)
      ctx.textBaseline = 'top'
      ctx.fillStyle = TEXT
      let size = 60
      for (; size > 34; size -= 2) {
        ctx.font = `700 ${size}px ${SANS}`
        if (ctx.measureText(project.name).width <= PX - 240) break
      }
      ctx.fillText(project.name, 188, 56, PX - 220)
      ctx.fillStyle = MUTED
      ctx.font = `500 34px ${SANS}`
      ctx.fillText(project.period, 188, 64 + size)
      ctx.fillStyle = CYAN
      ctx.font = `600 32px ${SANS}`
      ctx.textAlign = 'right'
      ctx.fillText(`${t('labels.details')} →`, PX - 44, PY - 76)
      ctx.textAlign = 'left'
    },
    [project, t],
  )

  useEffect(() => {
    if (!hovered) return
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered])

  useFrame((_, dt) => {
    focus.current += ((hovered && !selected ? 1 : 0) - focus.current) * (1 - Math.exp(-dt * 10))
    const r = rise()
    const g = group.current!
    // Rises out of the floor like an exhibit on a lift.
    g.position.y = -(1 - r) * (PEDESTAL.h + GLASS + 0.05)
    g.visible = r > 0.001
  })

  const handlers = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      setHovered(true)
    },
    onPointerOut: () => setHovered(false),
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      onSelect()
    },
  }

  return (
    <group position={[x, 0, SHOWCASE.z]}>
      <group ref={group} visible={false} {...handlers}>
        <mesh position={[0, FLOOR_Y + PEDESTAL.h / 2, 0]}>
          <boxGeometry args={[PEDESTAL.w, PEDESTAL.h, PEDESTAL.w]} />
          <meshStandardMaterial color="#25263f" roughness={0.8} />
        </mesh>
        {/* Faint light from the base of the case. */}
        <mesh position={[0, TOP + 0.004, 0]}>
          <boxGeometry args={[GLASS - 0.02, 0.008, GLASS - 0.02]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.12} />
        </mesh>
        <group position={[0, TOP + GLASS / 2, 0]}>
          <Model id={project.id} spin={() => focus.current} />
          <mesh>
            <boxGeometry args={[GLASS, GLASS, GLASS]} />
            <meshStandardMaterial color="#a8dcff" transparent opacity={0.08} roughness={0.05} depthWrite={false} />
          </mesh>
          {/* Lines are hit-tested with a 1-unit slack, which would steal clicks meant for the neighbours. */}
          <lineSegments geometry={GLASS_EDGES} raycast={() => null}>
            <lineBasicMaterial color={CYAN} transparent opacity={0.5} />
          </lineSegments>
        </group>
        <group ref={plaqueRef} position={[0, PLAQUE.y, PEDESTAL.w / 2 + 0.003]}>
          <TextPlane map={map} width={PLAQUE.w} height={PLAQUE.h} reveal={rise} glow={() => focus.current * 0.35} />
        </group>
      </group>
    </group>
  )
}

/** Name, period, description and link of one project, laid out in the reader. Returns the link button's uv rect. */
function paintProject(ctx: CanvasRenderingContext2D, project: Project, { px, py, css, wide, pad, bottom }: PanelLayout, linkLabel: string) {
  const glyph = 52 * css
  drawGlyph(ctx, project.id, pad, pad, glyph)
  ctx.textBaseline = 'top'
  ctx.fillStyle = TEXT
  ctx.font = `700 ${26 * css}px ${SANS}`
  ctx.fillText(project.name, pad + glyph * 1.3, pad + glyph * 0.08, px - pad * 3 - glyph)
  ctx.fillStyle = MUTED
  ctx.font = `500 ${15 * css}px ${SANS}`
  ctx.fillText(project.period, pad + glyph * 1.3, pad + glyph * 0.68)

  const top = pad + glyph + pad
  const linkH = project.link ? 40 * css : 0
  for (let size = Math.round((wide ? 19 : 16) * css); size >= 14; size -= 2) {
    const lines = wrapRuns(ctx, [{ text: project.description, font: `400 ${size}px ${SANS}`, color: TEXT }], px - pad * 2)
    if (lines.length * size * 1.8 > bottom - top - linkH * 1.5 && size > 14) continue
    const y = drawLines(ctx, lines, pad, top, size * 1.8)
    if (!project.link) return null

    const w = 150 * css
    const ly = Math.min(y + size, bottom - linkH)
    ctx.strokeStyle = CYAN
    ctx.lineWidth = 2 * css
    ctx.beginPath()
    ctx.roundRect(pad, ly, w, linkH, linkH / 2)
    ctx.stroke()
    ctx.fillStyle = CYAN
    ctx.font = `600 ${15 * css}px ${SANS}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${linkLabel} ↗`, pad + w / 2, ly + linkH / 2)
    ctx.textAlign = 'left'
    // uv runs bottom-up.
    return { u0: pad / px, u1: (pad + w) / px, v0: 1 - (ly + linkH) / py, v1: 1 - ly / py }
  }
  return null
}

/** Side projects as exhibits: glass cases on pedestals that rise out of the floor as you arrive. */
export function SideProjects({ progress }: { progress: RefObject<ScrollProgress> }) {
  const { t } = useTranslation()
  const { sideProjects } = useResume()
  const [selected, setSelected] = useState<number | null>(null)
  const [last, setLast] = useState<number | null>(null)
  if (selected !== null && selected !== last) setLast(selected)
  const plaques = useRef<(Group | null)[]>([])
  const link = useRef<{ u0: number; u1: number; v0: number; v1: number } | null>(null)
  const presence = () => stationPresence(progress.current.screens, INDEX)

  // Walking on puts the panel back.
  useFrame(() => {
    if (selected !== null && Math.abs(tourPosition(progress.current.screens) - INDEX) > 0.6) setSelected(null)
  })

  return (
    <>
      {sideProjects.map((p, i) => (
        <DisplayCase
          key={p.id}
          project={p}
          x={SHOWCASE.x + (i - (sideProjects.length - 1) / 2) * SHOWCASE.spacing}
          // One after another, left to right.
          rise={() => smoothstep(0.15 + i * 0.1, 0.65 + i * 0.1, presence())}
          selected={selected === i}
          onSelect={() => setSelected(i)}
          plaqueRef={(g) => {
            plaques.current[i] = g
          }}
        />
      ))}
      <Reader
        item={selected === null ? null : sideProjects[selected]}
        paint={(ctx, project, layout) => {
          link.current = paintProject(ctx, project, layout, t('labels.link'))
        }}
        deps={[]}
        source={() => (last === null ? null : plaques.current[last])}
        sourceHeight={PLAQUE.h}
        fill={{ wide: 0.5, tall: 0.55 }}
        onClose={() => setSelected(null)}
        onPanelClick={(project, uv) => {
          const r = link.current
          if (!project.link || !r || uv.x < r.u0 || uv.x > r.u1 || uv.y < r.v0 || uv.y > r.v1) return false
          window.open(project.link, '_blank', 'noopener')
          return true
        }}
      />
    </>
  )
}
