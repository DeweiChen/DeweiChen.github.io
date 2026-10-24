import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useTranslation } from 'react-i18next'
import { BoxGeometry, DoubleSide, EdgesGeometry, MeshStandardMaterial, type Group, type Plane } from 'three'
import { useResume, type Resume } from '@/i18n/useResume'
import { paintAppScreen, SCREEN_IMAGES } from './appScreens'
import { CYAN, MUTED, panelBackground, TEXT, type PanelLayout } from './panel'
import { Reader } from './Reader'
import { Beam, Fixture, GlowPool, type Rgb } from './GlowPool'
import { CEILING_Y, FLOOR_Y, GALLERY } from './roomLayout'
import { SIDE_PROJECTS, STATION_AT, tourPosition } from './stations'
import { TextPlane } from './TextPlane'
import { drawExternalArrow, drawLines, drawRightArrow, SANS, useCanvasTexture, useImage, wrapRuns } from './textCanvas'
import { useOpenRequest } from './useOpenRequest'
import { useScanClip } from './useScanClip'
import type { ScrollProgress } from './useScrollProgress'

type Project = Resume['sideProjects'][number]

const PEDESTAL = { w: 0.6, h: 0.7 }
const GLASS = { w: 0.6, h: 0.74 }
const TOP = FLOOR_Y + PEDESTAL.h
const PHONE = { w: 0.34, h: 0.6, d: 0.02 }
const SCREEN = { w: PHONE.w * 0.92, h: PHONE.h * 0.95 }
const SPX = 640
const SPY = Math.round((SPX * SCREEN.h) / SCREEN.w)
/** Museum-style wall text above each case. */
const LABEL = { w: 1.28, h: 0.76, y: 0.32 }
const LPX = 1536
const LPY = Math.round((LPX * LABEL.h) / LABEL.w)
const GLASS_EDGES = new EdgesGeometry(new BoxGeometry(GLASS.w, GLASS.h, GLASS.w))
const PEDESTAL_EDGES = new EdgesGeometry(new BoxGeometry(PEDESTAL.w, PEDESTAL.h, PEDESTAL.w))
/** Track spotlight over each case, in the blue of the exhibits. */
const SPOT = { y: CEILING_Y - 0.15, color: [46, 124, 246] as Rgb, beam: [90, 156, 255] as Rgb }

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Real app icons under public/, keyed by project id; a drawn glyph stands in until one loads. */
const APP_ICONS: Record<string, string> = {
  smartHome: `${import.meta.env.BASE_URL}screens/home-assistant-icon.png`,
  toiletFinder: `${import.meta.env.BASE_URL}screens/toilet-finder-icon.png`,
  ovoy: `${import.meta.env.BASE_URL}screens/ovoy-icon.png`,
}

/** Every app icon, loaded once; missing ones are absent until they arrive. */
function useAppIcons() {
  const [icons, setIcons] = useState<Record<string, HTMLImageElement>>({})
  useEffect(() => {
    for (const [id, src] of Object.entries(APP_ICONS)) {
      const el = new Image()
      el.onload = () => setIcons((m) => ({ ...m, [id]: el }))
      el.src = src
    }
  }, [])
  return icons
}

/** A small app icon per project, drawn in a w x w box: the real one once loaded, else a glyph. */
function drawGlyph(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, w: number, icon?: HTMLImageElement) {
  if (icon) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x, y, w, w, w * 0.24)
    ctx.clip()
    ctx.drawImage(icon, x, y, w, w)
    ctx.restore()
    return
  }
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

/** A small prop beside the phone that says what the app is about. */
function Prop({ id, active }: { id: string; active: () => boolean }) {
  const group = useRef<Group>(null)
  const led = useRef<Group>(null)
  useFrame(({ clock, invalidate }, dt) => {
    if (!active()) return
    const d = Math.min(dt, 0.05)
    if (group.current) group.current.rotation.y += d * 0.6
    if (led.current) led.current.visible = Math.sin(clock.elapsedTime * 5) > -0.3
    invalidate()
  })

  if (id === 'smartHome') {
    // The phone is the camera: a mount under it and a blinking recording light.
    return (
      <>
        <mesh position={[0, -PHONE.h / 2 - 0.05, -0.02]}>
          <boxGeometry args={[0.025, 0.08, 0.025]} />
          <meshStandardMaterial color="#3a3c5c" />
        </mesh>
        <mesh position={[0, -PHONE.h / 2 - 0.09, -0.02]}>
          <cylinderGeometry args={[0.07, 0.075, 0.016, 24]} />
          <meshStandardMaterial color="#3a3c5c" />
        </mesh>
        <group ref={led} position={[PHONE.w / 2 - 0.03, PHONE.h / 2 - 0.03, -PHONE.d / 2 - 0.004]}>
          <mesh>
            <sphereGeometry args={[0.008, 12, 8]} />
            <meshBasicMaterial color="#ff4d5e" toneMapped={false} />
          </mesh>
        </group>
      </>
    )
  }
  if (id === 'toiletFinder') return null
  // Petals drifting round the phone.
  return (
    <group ref={group}>
      {Array.from({ length: 9 }, (_, k) => {
        const a = (k / 9) * Math.PI * 2
        return (
          <mesh key={k} position={[Math.cos(a) * 0.22, Math.sin(a * 3) * 0.12, Math.sin(a) * 0.2]} rotation={[a, a * 2, 0]}>
            <circleGeometry args={[0.014, 5]} />
            <meshBasicMaterial color="#ffc3d8" side={DoubleSide} />
          </mesh>
        )
      })}
    </group>
  )
}

/** The app itself: a phone showing its screen, turning gently from side to side. */
function Phone({ id, reveal, glow, active }: { id: string; reveal: () => number; glow: () => number; active: () => boolean }) {
  const group = useRef<Group>(null)
  const img = useImage(SCREEN_IMAGES[id])
  const map = useCanvasTexture(SPX, SPY, (ctx) => paintAppScreen(ctx, id, SPX, SPY, img), [id, img])
  useFrame(({ clock, invalidate }) => {
    if (!active()) return
    group.current!.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.35
    invalidate()
  })
  return (
    <group ref={group} rotation={[-0.08, 0, 0]}>
      <mesh>
        <boxGeometry args={[PHONE.w, PHONE.h, PHONE.d]} />
        <meshStandardMaterial color="#1b1c2e" roughness={0.35} metalness={0.4} />
      </mesh>
      <TextPlane map={map} width={SCREEN.w} height={SCREEN.h} position={[0, 0, PHONE.d / 2 + 0.001]} reveal={reveal} glow={glow} />
    </group>
  )
}

/** Wall text: name, period and description, big enough to read from the stop. */
function useWallLabel(project: Project, index: number) {
  const { t } = useTranslation()
  const icon = useImage(APP_ICONS[project.id]) ?? undefined
  return useCanvasTexture(
    LPX,
    LPY,
    (ctx) => {
      panelBackground(ctx, LPX, LPY)
      const pad = 84
      ctx.textBaseline = 'top'
      ctx.fillStyle = CYAN
      ctx.font = `600 34px ${SANS}`
      ctx.fillText(`${t('labels.sideProjects').toUpperCase()}  ${String(index + 1).padStart(2, '0')}`, pad, pad - 10)
      ctx.fillStyle = MUTED
      ctx.textAlign = 'right'
      ctx.fillText(project.period, LPX - pad, pad - 10)
      ctx.textAlign = 'left'

      const glyph = 120
      drawGlyph(ctx, project.id, pad, pad + 56, glyph, icon)
      let size = 88
      for (; size > 48; size -= 4) {
        ctx.font = `700 ${size}px ${SANS}`
        if (ctx.measureText(project.name).width <= LPX - pad * 2 - glyph - 36) break
      }
      ctx.fillStyle = TEXT
      ctx.textBaseline = 'middle'
      ctx.fillText(project.name, pad + glyph + 36, pad + 56 + glyph / 2)
      ctx.textBaseline = 'top'

      const top = pad + 56 + glyph + 48
      const bottom = LPY - pad - 40
      for (let s = 50; s >= 34; s -= 2) {
        const lines = wrapRuns(ctx, [{ text: project.description, font: `400 ${s}px ${SANS}`, color: '#c9cde0' }], LPX - pad * 2)
        if (lines.length * s * 1.6 > bottom - top && s > 34) continue
        drawLines(ctx, lines, pad, top, s * 1.6)
        break
      }
      ctx.fillStyle = CYAN
      ctx.font = `600 32px ${SANS}`
      const actionText = t(project.link ? 'labels.link' : 'labels.details')
      const iconSize = 22
      const gap = 8
      const topY = LPY - pad - 8
      const iconX = LPX - pad - iconSize
      const iconY = topY + (32 - iconSize) / 2

      ctx.textAlign = 'right'
      ctx.fillText(actionText, iconX - gap, topY)
      if (project.link) {
        drawExternalArrow(ctx, iconX, iconY, iconSize, CYAN, 2.8)
      } else {
        drawRightArrow(ctx, iconX, iconY, iconSize, CYAN, 2.8)
      }
      ctx.textAlign = 'left'
    },
    [project, index, t, icon],
  )
}

/** One project on show: wall text, and a pedestal with the app in a glass case in front of it. */
function Exhibit({
  project,
  index,
  z,
  walk,
  selected,
  reading,
  onSelect,
  labelRef,
  clip,
}: {
  project: Project
  index: number
  z: number
  walk: () => number
  selected: boolean
  reading: boolean
  onSelect: () => void
  labelRef: (g: Group | null) => void
  clip: Plane
}) {
  const [hovered, setHovered] = useState(false)
  const lift = useRef(0)
  const stand = useRef<Group>(null)
  const label = useWallLabel(project, index)
  const pedestalMaterial = useMemo(() => new MeshStandardMaterial({ color: '#3a3d63', roughness: 0.8, clippingPlanes: [clip] }), [clip])
  useEffect(() => () => pedestalMaterial.dispose(), [pedestalMaterial])
  // Rises out of the floor as the walk approaches, like the Experience boards; lit while it is the current stop.
  const arrive = () => smoothstep(index - 0.9, index - 0.25, walk())
  const focus = () => Math.max(0, 1 - Math.abs(walk() - index))
  // Past the last stop the exhibits sink back down, clearing the view across the room.
  const shown = () => arrive() * (1 - smoothstep(GALLERY.zs.length - 0.6, GALLERY.zs.length - 0.1, walk()))
  const glow = () => lift.current * 0.3 - (1 - focus()) * 0.45
  // The spotlight follows the walk: only the exhibit you are standing at is lit.
  const lit = () => {
    const f = focus()
    return shown() * f * f * (3 - 2 * f)
  }
  // Only animate the exhibit's prop and phone while this stop is in view and the detail reader is closed.
  const active = () => !reading && shown() > 0.001 && walk() < index + 0.75

  useEffect(() => {
    if (!hovered) return
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered])

  useFrame(({ invalidate }, dt) => {
    const target = hovered && !selected ? 1 : 0
    if (lift.current !== target) {
      if (Math.abs(target - lift.current) > 1e-4) {
        lift.current += (target - lift.current) * (1 - Math.exp(-Math.min(dt, 0.05) * 10))
      } else {
        lift.current = target
      }
      invalidate()
    }
    const a = shown()
    const g = stand.current!
    g.position.y = -(1 - a) * (PEDESTAL.h + GLASS.h + 0.1)
    g.visible = a > 0.001
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
    <group position={[0, 0, z]}>
      <Fixture color="#9cc6ff" strength={() => lit() * 0.9} position={[GALLERY.caseX, SPOT.y, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.02, 24]} />
      </Fixture>
      <Beam color={SPOT.beam} peak={0.16} strength={lit} top={SPOT.y} bottom={TOP} spread={0.42} position={[GALLERY.caseX, 0, 0]} />
      <GlowPool
        color={SPOT.color}
        peak={0.3}
        strength={lit}
        size={[1.5, 1.5]}
        position={[GALLERY.caseX, FLOOR_Y + 0.022, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      {/* Spill on the wall behind the label. */}
      <GlowPool
        color={SPOT.color}
        peak={0.18}
        strength={lit}
        center={[0.5, 0.3]}
        stretch={1.2}
        radius={0.7}
        size={[LABEL.w + 1.0, 2.6]}
        position={[GALLERY.wallX - 0.022, LABEL.y + 0.2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <group ref={labelRef} position={[GALLERY.wallX - 0.025, LABEL.y, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <TextPlane map={label} width={LABEL.w} height={LABEL.h} reveal={shown} glow={glow} {...handlers} />
      </group>
      <group ref={stand} position={[GALLERY.caseX, 0, 0]} rotation={[0, -Math.PI / 2, 0]} visible={false} {...handlers}>
        <mesh material={pedestalMaterial} position={[0, FLOOR_Y + PEDESTAL.h / 2, 0]}>
          <boxGeometry args={[PEDESTAL.w, PEDESTAL.h, PEDESTAL.w]} />
          <lineSegments geometry={PEDESTAL_EDGES} raycast={() => null}>
            <lineBasicMaterial color={CYAN} transparent opacity={0.22} />
          </lineSegments>
        </mesh>
        <mesh position={[0, TOP + 0.004, 0]}>
          <boxGeometry args={[GLASS.w - 0.02, 0.008, GLASS.w - 0.02]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.12} />
        </mesh>
        <group position={[0, TOP + GLASS.h / 2 + 0.03, 0]}>
          <Phone id={project.id} reveal={shown} glow={glow} active={active} />
          <Prop id={project.id} active={active} />
        </group>
        <group position={[0, TOP + GLASS.h / 2, 0]}>
          <mesh>
            <boxGeometry args={[GLASS.w, GLASS.h, GLASS.w]} />
            <meshStandardMaterial color="#a8dcff" transparent opacity={0.07} roughness={0.05} depthWrite={false} />
          </mesh>
          {/* Lines are hit-tested with a 1-unit slack, which would steal clicks meant for the neighbours. */}
          <lineSegments geometry={GLASS_EDGES} raycast={() => null}>
            <lineBasicMaterial color={CYAN} transparent opacity={0.5} />
          </lineSegments>
        </group>
      </group>
    </group>
  )
}

/** Name, period, description and link of one project, laid out in the reader. Returns content height and link UV rect. */
function paintProject(
  ctx: CanvasRenderingContext2D,
  project: Project,
  { px, py, css, wide, pad, bottom, scrollY = 0 }: PanelLayout,
  linkLabel: string,
  icon?: HTMLImageElement,
): { contentHeight: number; linkRect: { u0: number; u1: number; v0: number; v1: number } | null } {
  const glyph = 52 * css
  drawGlyph(ctx, project.id, pad, pad, glyph, icon)
  ctx.textBaseline = 'top'
  ctx.fillStyle = TEXT
  ctx.font = `700 ${26 * css}px ${SANS}`
  ctx.fillText(project.name, pad + glyph * 1.3, pad + glyph * 0.08, px - pad * 3 - glyph)
  ctx.fillStyle = MUTED
  ctx.font = `500 ${15 * css}px ${SANS}`
  ctx.fillText(project.period, pad + glyph * 1.3, pad + glyph * 0.68)

  const top = pad + glyph + pad
  const linkH = project.link ? 40 * css : 0
  let contentHeight = 0
  let linkRect: { u0: number; u1: number; v0: number; v1: number } | null = null

  const minSize = Math.max(14, Math.round((wide ? 16 : 14) * css))
  for (let size = Math.round((wide ? 19 : 16) * css); size >= minSize; size -= 2) {
    const lines = wrapRuns(ctx, [{ text: project.description, font: `400 ${size}px ${SANS}`, color: TEXT }], px - pad * 2)
    const totalH = lines.length * size * 1.8 + (project.link ? linkH + size : 0)
    if (totalH > bottom - top && size > minSize) continue

    contentHeight = totalH

    // Clip scrollable content area
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, top, px, bottom - top)
    ctx.clip()

    const y = drawLines(ctx, lines, pad, top - scrollY, size * 1.8)
    if (project.link) {
      const w = 150 * css
      const ly = y + size
      ctx.strokeStyle = CYAN
      ctx.lineWidth = 2 * css
      ctx.beginPath()
      ctx.roundRect(pad, ly, w, linkH, linkH / 2)
      ctx.stroke()
      ctx.fillStyle = CYAN
      const fontSize = 15 * css
      ctx.font = `600 ${fontSize}px ${SANS}`
      ctx.textBaseline = 'middle'
      const textW = ctx.measureText(linkLabel).width
      const iconSize = fontSize * 0.75
      const gap = fontSize * 0.35
      const totalW = textW + gap + iconSize
      const startX = pad + (w - totalW) / 2

      ctx.textAlign = 'left'
      ctx.fillText(linkLabel, startX, ly + linkH / 2)

      const iconX = startX + textW + gap
      const iconY = ly + linkH / 2 - iconSize / 2
      drawExternalArrow(ctx, iconX, iconY, iconSize, CYAN, 2 * css)

      // Only clickable if within visible content area
      if (ly + linkH >= top && ly <= bottom) {
        linkRect = { u0: pad / px, u1: (pad + w) / px, v0: 1 - (ly + linkH) / py, v1: 1 - ly / py }
      }
    }

    ctx.restore()
    break
  }

  return { contentHeight, linkRect }
}

/** Side projects: a gallery wing off the hall, walked one exhibit at a time. */
export function SideProjects({ progress }: { progress: RefObject<ScrollProgress> }) {
  const { t } = useTranslation()
  const { sideProjects } = useResume()
  const clip = useScanClip(progress)
  const icons = useAppIcons()
  const [selected, setSelected] = useState<number | null>(null)
  const [last, setLast] = useState<number | null>(null)
  if (selected !== null && selected !== last) setLast(selected)
  const labels = useRef<(Group | null)[]>([])
  const link = useRef<{ u0: number; u1: number; v0: number; v1: number } | null>(null)
  // Position along the walk: 0 at the first exhibit.
  const walk = () => tourPosition(progress.current.screens) - SIDE_PROJECTS.first

  // An exhibit clicked from another stop is walked to first and opened on arrival;
  // the request lapses if the walk is cut short.
  const heading = useRef<{ to: number; ttl: number } | null>(null)
  const select = (i: number) => {
    if (Math.abs(walk() - i) < 0.1) return setSelected(i)
    setSelected(null)
    heading.current = { to: i, ttl: 3 }
    window.scrollTo({ top: STATION_AT[SIDE_PROJECTS.first + i] * innerHeight, behavior: 'smooth' })
  }

  useOpenRequest('sideProjects', walk, setSelected)

  // Walking on puts the panel back.
  useFrame((_, dt) => {
    const w = walk()
    const h = heading.current
    if (h && Math.abs(w - h.to) < 0.02) {
      heading.current = null
      setSelected(h.to)
    } else if (h && (h.ttl -= Math.min(dt, 0.05)) < 0) heading.current = null
    if (selected !== null && Math.abs(w - selected) > 0.6) setSelected(null)
  })

  return (
    <>
      {sideProjects.map((p, i) => (
        <Exhibit
          key={p.id}
          project={p}
          index={i}
          z={GALLERY.zs[i]}
          walk={walk}
          selected={selected === i}
          reading={selected !== null}
          onSelect={() => select(i)}
          labelRef={(g) => {
            labels.current[i] = g
          }}
          clip={clip}
        />
      ))}
      <Reader
        item={selected === null ? null : sideProjects[selected]}
        paint={(ctx, project, layout) => {
          const { contentHeight, linkRect } = paintProject(ctx, project, layout, t('labels.link'), icons[project.id])
          link.current = linkRect
          return contentHeight
        }}
        deps={[icons]}
        source={() => (last === null ? null : labels.current[last])}
        sourceHeight={LABEL.h}
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
