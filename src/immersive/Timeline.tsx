import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useTranslation } from 'react-i18next'
import { MeshStandardMaterial, type Group, type Plane } from 'three'
import homeeLogo from '@/assets/print/homee.png'
import htcLogo from '@/assets/print/htc.png'
import xrspaceLogo from '@/assets/print/xrspace.png'
import { useResume, type Resume } from '@/i18n/useResume'
import { shownWhenFree } from './freeMode'
import { GlowPool } from './GlowPool'
import { FLOOR_Y } from './roomLayout'
import { EXPERIENCE, goToStation, tourPosition } from './stations'
import { play } from './sound'
import { CYAN, MUTED, panelBackground, TEXT, type PanelLayout } from './panel'
import { Reader } from './Reader'
import { TextPlane } from './TextPlane'
import { BOARD_H, BOARD_W, BOARD_Y, BOARD_Z, COMPANIES, headX, LINE_X0, LINE_X1, LINE_Z, xOfYear, YEAR0, YEAR1 } from './timelineLayout'
import { drawLines, SANS, useCanvasTexture, useImage, wrapRuns } from './textCanvas'
import { useOpenRequest } from './useOpenRequest'
import { useScanClip } from './useScanClip'
import type { ScrollProgress } from './useScrollProgress'

type Company = Resume['experience'][number]

const LOGOS: Record<string, string> = {
  homee: homeeLogo,
  htc: htcLogo,
  xrspace: xrspaceLogo,
  // Freelance work goes under the site's own mark.
  freelance: `${import.meta.env.BASE_URL}favicon.svg`,
}
/** Logos that are already a tile of their own, drawn edge to edge instead of on white. */
const TILE_LOGOS = new Set(['freelance'])

// Floor decal covering the line, its year ticks and the connectors up to the boards.
const DECAL = { x0: LINE_X0 - 0.1, x1: LINE_X1 + 0.1, z0: -0.2, z1: 0.9, px: 4096 }
const DECAL_PY = Math.round((DECAL.px * (DECAL.z1 - DECAL.z0)) / (DECAL.x1 - DECAL.x0))
const decalX = (x: number) => ((x - DECAL.x0) / (DECAL.x1 - DECAL.x0)) * DECAL.px
const decalY = (z: number) => ((z - DECAL.z0) / (DECAL.z1 - DECAL.z0)) * DECAL_PY

/** Every company logo, loaded once; missing ones are null until they arrive. */
function useLogos() {
  const [logos, setLogos] = useState<Record<string, HTMLImageElement>>({})
  useEffect(() => {
    for (const [id, src] of Object.entries(LOGOS)) {
      const el = new Image()
      el.onload = () => setLogos((l) => ({ ...l, [id]: el }))
      el.src = src
    }
  }, [])
  return logos
}

/** Logo on a rounded white tile, so every brand colour reads on the dark panels. */
function drawLogo(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, size: number, tile = false) {
  if (img && tile) {
    ctx.drawImage(img, x, y, size, size)
    return
  }
  ctx.fillStyle = img ? '#ffffff' : 'rgba(127, 216, 245, 0.15)'
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, size * 0.18)
  ctx.fill()
  if (!img) return
  const pad = size * 0.1
  const s = Math.min((size - pad * 2) / img.width, (size - pad * 2) / img.height)
  ctx.drawImage(img, x + (size - img.width * s) / 2, y + (size - img.height * s) / 2, img.width * s, img.height * s)
}

interface BoardSpec {
  company: Company
  start: number
  end: number
  x: number
}

function useBoardSpecs(): BoardSpec[] {
  const { experience } = useResume()
  return useMemo(() => COMPANIES.map((c) => ({ ...c, company: experience[c.index] })), [experience])
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** A violet pool of light on the floor in front of the board you are standing at; it walks along with you. */
function FloorLight({ walk }: { walk: () => number }) {
  const group = useRef<Group>(null)
  useFrame(() => {
    group.current!.position.x = headX(walk())
  })
  return (
    <group ref={group}>
      <GlowPool
        color={[148, 76, 250]}
        peak={0.35}
        strength={() => smoothstep(-0.6, -0.1, walk()) * (1 - smoothstep(COMPANIES.length - 0.9, COMPANIES.length - 0.4, walk()))}
        stretch={1.4}
        size={[2.4, 1.8]}
        position={[0, FLOOR_Y + 0.022, LINE_Z - 0.1]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  )
}

function TimelineFloor({ boards, walk }: { boards: BoardSpec[]; walk: () => number }) {
  const map = useCanvasTexture(
    DECAL.px,
    DECAL_PY,
    (ctx) => {
      const lineY = decalY(LINE_Z)
      const grad = ctx.createLinearGradient(decalX(LINE_X0), 0, decalX(LINE_X1), 0)
      grad.addColorStop(0, '#2eb8f2')
      grad.addColorStop(1, '#944cfa')
      ctx.fillStyle = grad
      ctx.fillRect(decalX(LINE_X0), lineY - 4, decalX(LINE_X1) - decalX(LINE_X0), 8)

      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.font = `500 52px ${SANS}`
      for (let y = YEAR0; y <= YEAR1; y++) {
        const x = decalX(xOfYear(y))
        ctx.fillStyle = 'rgba(200, 210, 240, 0.5)'
        ctx.fillRect(x - 2, lineY - 24, 4, 48)
        ctx.fillStyle = MUTED
        ctx.fillText(String(y), x, lineY + 44)
      }

      // Each company's tenure as a bright bar on the line, with a lead to its board.
      for (const b of boards) {
        const x0 = decalX(xOfYear(b.start))
        const x1 = decalX(xOfYear(b.end))
        ctx.fillStyle = grad
        ctx.shadowColor = '#7fd8f5'
        ctx.shadowBlur = 24
        ctx.fillRect(x0, lineY - 14, Math.max(12, x1 - x0), 28)
        ctx.shadowBlur = 0
        ctx.strokeStyle = 'rgba(127, 216, 245, 0.45)'
        ctx.lineWidth = 5
        ctx.setLineDash([18, 14])
        ctx.beginPath()
        ctx.moveTo((x0 + x1) / 2, lineY - 18)
        ctx.lineTo(decalX(b.x), decalY(BOARD_Z) + 10)
        ctx.stroke()
        ctx.setLineDash([])
      }
    },
    [boards],
  )

  return (
    <TextPlane
      map={map}
      width={DECAL.x1 - DECAL.x0}
      height={DECAL.z1 - DECAL.z0}
      position={[(DECAL.x0 + DECAL.x1) / 2, FLOOR_Y + 0.025, (DECAL.z0 + DECAL.z1) / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      reveal={() => shownWhenFree(smoothstep(-1.2, -0.6, walk()) * (1 - smoothstep(COMPANIES.length - 0.6, COMPANIES.length - 0.1, walk())))}
      // Lit up to where the walk has reached, with a glowing head on the line.
      fill={() => [(headX(walk()) - DECAL.x0) / (DECAL.x1 - DECAL.x0), 1 - decalY(LINE_Z) / DECAL_PY]}
    />
  )
}

function Board({
  spec,
  selected,
  onSelect,
  groupRef,
  k,
  walk,
  clip,
}: {
  spec: BoardSpec
  selected: boolean
  onSelect: () => void
  groupRef: (g: Group | null) => void
  /** This board's stop, counted from the first company. */
  k: number
  walk: () => number
  clip: Plane
}) {
  const { t } = useTranslation()
  const logo = useImage(LOGOS[spec.company.id])
  const [hovered, setHovered] = useState(false)
  const lift = useRef(0)
  const inner = useRef<Group>(null)
  const standMaterial = useMemo(() => new MeshStandardMaterial({ color: '#2a2b45', clippingPlanes: [clip] }), [clip])
  useEffect(() => () => standMaterial.dispose(), [standMaterial])
  // Rises out of the floor as the walk approaches; only the board at the current stop is lit.
  const arrive = () => shownWhenFree(smoothstep(k - 0.9, k - 0.25, walk()))
  const focus = () => shownWhenFree(Math.max(0, 1 - Math.abs(walk() - k)))
  // Past the last stop the boards scan out again, clearing the view across the room.
  const shown = () => arrive() * (1 - smoothstep(COMPANIES.length - 0.6, COMPANIES.length - 0.1, walk()))
  const outer = useRef<Group>(null)

  const map = useCanvasTexture(
    1024,
    Math.round((1024 * BOARD_H) / BOARD_W),
    (ctx) => {
      const w = 1024
      const h = Math.round((1024 * BOARD_H) / BOARD_W)
      panelBackground(ctx, w, h)
      drawLogo(ctx, logo, 56, 56, 168, TILE_LOGOS.has(spec.company.id))
      ctx.textBaseline = 'top'
      ctx.fillStyle = TEXT
      ctx.font = `700 64px ${SANS}`
      ctx.fillText(spec.company.name, 260, 70, w - 300)
      ctx.fillStyle = MUTED
      ctx.font = `500 38px ${SANS}`
      const roles = spec.company.roles
      const period = `${roles[roles.length - 1].period.split(' – ')[0]} – ${roles[0].period.split(' – ').at(-1)}`
      ctx.fillText(period, 260, 160, w - 300)

      roles.slice(0, 3).forEach((r, i) => {
        const y = 270 + i * 104
        ctx.fillStyle = i === 0 ? CYAN : '#b9c6e8'
        ctx.font = `600 42px ${SANS}`
        ctx.fillText(r.title, 56, y, w - 112)
        // With a single role its period is the company's, already shown under the name.
        if (roles.length === 1) return
        ctx.fillStyle = MUTED
        ctx.font = `400 32px ${SANS}`
        ctx.fillText(r.period, 56, y + 52, w - 112)
      })

      ctx.fillStyle = 'rgba(127, 216, 245, 0.8)'
      ctx.font = `500 34px ${SANS}`
      ctx.textAlign = 'right'
      ctx.fillText(`${t('labels.details')} →`, w - 56, h - 64)
      ctx.textAlign = 'left'
    },
    [spec, logo, t],
  )

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
    inner.current!.position.y = lift.current * 0.08 - (1 - arrive()) * 0.25
    outer.current!.visible = shown() > 0.01
  })

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    play('hover')
    setHovered(true)
  }
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    play('click')
    onSelect()
  }

  const standH = BOARD_Y - BOARD_H / 2 - FLOOR_Y
  return (
    <group ref={outer} position={[spec.x, 0, BOARD_Z]} visible={false}>
      <mesh material={standMaterial} position={[0, FLOOR_Y + standH / 2, -0.02]}>
        <boxGeometry args={[0.025, standH, 0.025]} />
      </mesh>
      <mesh material={standMaterial} position={[0, FLOOR_Y + 0.03, -0.02]}>
        <boxGeometry args={[0.3, 0.02, 0.2]} />
      </mesh>
      <group ref={inner}>
        <group ref={groupRef} position={[0, BOARD_Y, 0]}>
          <TextPlane
            map={map}
            width={BOARD_W}
            height={BOARD_H}
            reveal={shown}
            glow={() => lift.current * 0.3 - (1 - focus()) * 0.5}
            onPointerOver={over}
            onPointerOut={() => setHovered(false)}
            onClick={click}
          />
        </group>
      </group>
    </group>
  )
}

/** One company in the reader: what I did there, then its roles. Returns content height. */
function paintDetail(
  ctx: CanvasRenderingContext2D,
  company: Company,
  logo: HTMLImageElement | null,
  { px, css, wide, pad, bottom, scrollY = 0 }: PanelLayout,
): number {
  const logoSize = (wide ? 48 : 40) * css
  drawLogo(ctx, logo, pad, pad, logoSize, TILE_LOGOS.has(company.id))
  ctx.textBaseline = 'middle'
  ctx.fillStyle = TEXT
  ctx.font = `700 ${logoSize * 0.5}px ${SANS}`
  ctx.fillText(company.name, pad + logoSize * 1.3, pad + logoSize / 2)

  const top = pad + logoSize + pad * 0.6
  const maxWidth = px - pad * 2
  let totalHeight = 0

  // Largest font size at which every role fits down to minSize, allowing scrolling when content exceeds viewport.
  const minSize = Math.max(16, Math.round((wide ? 16 : 14) * css))
  for (let size = Math.round((wide ? 20 : 16) * css); size >= minSize; size -= 2) {
    const lineHeight = size * 1.8
    const summary = wrapRuns(ctx, [{ text: company.summary, font: `400 ${size * 1.1}px ${SANS}`, color: TEXT }], maxWidth)
    const summaryHeight = summary.length * lineHeight * 1.1 + size * 1.6
    const roleGap = size * 0.6
    // Narrow panels put the period under the title instead of beside it.
    const stacked = !wide
    const header = stacked ? size * 3.1 : size * 1.9
    const height = summaryHeight + company.roles.length * (header + roleGap) - roleGap

    if (height > bottom - top && size > minSize) continue

    totalHeight = height

    // Clip content area so it scrolls cleanly between top header and bottom footer
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, top, px, bottom - top)
    ctx.clip()

    let y = drawLines(ctx, summary, pad, top - scrollY, lineHeight * 1.1) + size * 1.6
    for (const role of company.roles) {
      ctx.textBaseline = 'top'
      ctx.font = `500 ${size * 0.95}px ${SANS}`
      const periodWidth = stacked ? 0 : ctx.measureText(role.period).width + size
      ctx.font = `650 ${size * 1.15}px ${SANS}`
      ctx.fillStyle = CYAN
      // Long titles are narrowed rather than run off the panel or into the period.
      ctx.fillText(role.title, pad, y, maxWidth - periodWidth)
      ctx.font = `500 ${size * 0.95}px ${SANS}`
      ctx.fillStyle = MUTED
      if (stacked) ctx.fillText(role.period, pad, y + size * 1.55)
      else {
        ctx.textAlign = 'right'
        ctx.fillText(role.period, px - pad, y + size * 0.15)
        ctx.textAlign = 'left'
      }
      y += header + roleGap
    }
    ctx.restore()
    break
  }

  return totalHeight
}

/**
 * Experience: a timeline on the floor that lights up as you walk along it, with a
 * board per company rising as you reach it. Click a board to read it.
 */
export function Timeline({ progress }: { progress: RefObject<ScrollProgress> }) {
  const boards = useBoardSpecs()
  const logos = useLogos()
  const clip = useScanClip(progress)
  const [selected, setSelected] = useState<number | null>(null)
  const groups = useRef<(Group | null)[]>([])
  // The board the reader flies back into after it is closed.
  const [last, setLast] = useState<number | null>(null)
  if (selected !== null && selected !== last) setLast(selected)

  // Position along the walk: 0 at the first company's stop, n - 1 at the last.
  const walk = () => tourPosition(progress.current.screens) - EXPERIENCE.first

  // A board clicked from another stop is walked to first and opened on arrival;
  // the request lapses if the walk is cut short.
  const heading = useRef<{ to: number; ttl: number } | null>(null)
  const select = (i: number) => {
    if (Math.abs(walk() - i) < 0.1) return setSelected(i)
    setSelected(null)
    heading.current = { to: i, ttl: 3 }
    goToStation(EXPERIENCE.first + i)
  }

  useOpenRequest('experience', walk, setSelected)

  // Walking on to another stop puts the panel back.
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
      <FloorLight walk={walk} />
      <TimelineFloor boards={boards} walk={walk} />
      {boards.map((b, i) => (
        <Board
          key={b.company.id}
          spec={b}
          selected={selected === i}
          onSelect={() => select(i)}
          groupRef={(g) => {
            groups.current[i] = g
          }}
          k={i}
          walk={walk}
          clip={clip}
        />
      ))}
      <Reader
        item={selected === null ? null : boards[selected].company}
        paint={(ctx, company, layout) => paintDetail(ctx, company, logos[company.id] ?? null, layout)}
        deps={[logos]}
        source={() => (last === null ? null : groups.current[last])}
        sourceHeight={BOARD_H}
        onClose={() => setSelected(null)}
      />
    </>
  )
}
