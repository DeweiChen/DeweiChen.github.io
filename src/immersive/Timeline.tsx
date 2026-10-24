import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useTranslation } from 'react-i18next'
import { MathUtils, Quaternion, Vector3, type Group, type PerspectiveCamera } from 'three'
import homeeLogo from '@/assets/print/homee.png'
import htcLogo from '@/assets/print/htc.png'
import viveLogo from '@/assets/print/vive.png'
import xrspaceLogo from '@/assets/print/xrspace.png'
import { useResume, type Resume } from '@/i18n/useResume'
import { FLOOR_Y } from './roomLayout'
import { EXPERIENCE, tourPosition } from './stations'
import { TextPlane } from './TextPlane'
import { BOARD_H, BOARD_W, BOARD_Y, BOARD_Z, COMPANIES, headX, LINE_X, LINE_Z, xOfYear, YEAR0, YEAR1 } from './timelineLayout'
import { drawLines, SANS, useCanvasTexture, wrapRuns, type Run } from './textCanvas'
import type { ScrollProgress } from './useScrollProgress'

type Company = Resume['experience'][number]

/** Window event with `detail: boolean`, fired when a detail panel opens or closes. */
export const READER_EVENT = 'tour:reader'
/** Share of the viewport height the detail panel fills when held up. */
const READER_FILL = 0.8
const LOGOS: Record<string, string> = { homee: homeeLogo, htc: htcLogo, vive: viveLogo, xrspace: xrspaceLogo }

// Floor decal covering the line, its year ticks and the connectors up to the boards.
const DECAL = { x0: -3.1, x1: 3.1, z0: -0.2, z1: 0.9, px: 4096 }
const DECAL_PY = Math.round((DECAL.px * (DECAL.z1 - DECAL.z0)) / (DECAL.x1 - DECAL.x0))
const decalX = (x: number) => ((x - DECAL.x0) / (DECAL.x1 - DECAL.x0)) * DECAL.px
const decalY = (z: number) => ((z - DECAL.z0) / (DECAL.z1 - DECAL.z0)) * DECAL_PY

const CYAN = '#7fd8f5'
const TEXT = '#d9dcea'
const MUTED = '#8d93ab'

function useImage(src: string | undefined) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!src) return
    const el = new Image()
    el.onload = () => setImg(el)
    el.src = src
  }, [src])
  return src ? img : null
}

/** Logo on a rounded white tile, so every brand colour reads on the dark panels. */
function drawLogo(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, size: number) {
  ctx.fillStyle = img ? '#ffffff' : 'rgba(127, 216, 245, 0.15)'
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, size * 0.18)
  ctx.fill()
  if (!img) return
  const pad = size * 0.1
  const s = Math.min((size - pad * 2) / img.width, (size - pad * 2) / img.height)
  ctx.drawImage(img, x + (size - img.width * s) / 2, y + (size - img.height * s) / 2, img.width * s, img.height * s)
}

function panelBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, 'rgba(16, 24, 44, 1)')
  g.addColorStop(1, 'rgba(26, 18, 50, 1)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(0, 0, w, h, Math.min(w, h) * 0.05)
  ctx.fill()
  ctx.strokeStyle = 'rgba(150, 190, 255, 0.35)'
  ctx.lineWidth = 4
  ctx.stroke()
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

function TimelineFloor({ boards, walk }: { boards: BoardSpec[]; walk: () => number }) {
  const map = useCanvasTexture(
    DECAL.px,
    DECAL_PY,
    (ctx) => {
      const lineY = decalY(LINE_Z)
      const grad = ctx.createLinearGradient(decalX(-LINE_X), 0, decalX(LINE_X), 0)
      grad.addColorStop(0, '#2eb8f2')
      grad.addColorStop(1, '#944cfa')
      ctx.fillStyle = grad
      ctx.fillRect(decalX(-LINE_X), lineY - 4, decalX(LINE_X) - decalX(-LINE_X), 8)

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
      reveal={() => smoothstep(-1.2, -0.6, walk())}
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
}: {
  spec: BoardSpec
  selected: boolean
  onSelect: () => void
  groupRef: (g: Group | null) => void
  /** This board's stop, counted from the first company. */
  k: number
  walk: () => number
}) {
  const { t } = useTranslation()
  const logo = useImage(LOGOS[spec.company.id])
  const [hovered, setHovered] = useState(false)
  const lift = useRef(0)
  const inner = useRef<Group>(null)
  // Rises out of the floor as the walk approaches; only the board at the current stop is lit.
  const arrive = () => smoothstep(k - 0.9, k - 0.25, walk())
  const focus = () => Math.max(0, 1 - Math.abs(walk() - k))

  const map = useCanvasTexture(
    1024,
    Math.round((1024 * BOARD_H) / BOARD_W),
    (ctx) => {
      const w = 1024
      const h = Math.round((1024 * BOARD_H) / BOARD_W)
      panelBackground(ctx, w, h)
      drawLogo(ctx, logo, 56, 56, 168)
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

  useFrame((_, dt) => {
    lift.current += ((hovered && !selected ? 1 : 0) - lift.current) * (1 - Math.exp(-dt * 10))
    inner.current!.position.y = lift.current * 0.08 - (1 - arrive()) * 0.25
  })

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(true)
  }
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onSelect()
  }

  const standH = BOARD_Y - BOARD_H / 2 - FLOOR_Y
  return (
    <group position={[spec.x, 0, BOARD_Z]}>
      <mesh position={[0, FLOOR_Y + standH / 2, -0.02]}>
        <boxGeometry args={[0.025, standH, 0.025]} />
        <meshStandardMaterial color="#2a2b45" />
      </mesh>
      <mesh position={[0, FLOOR_Y + 0.03, -0.02]}>
        <boxGeometry args={[0.3, 0.02, 0.2]} />
        <meshStandardMaterial color="#2a2b45" />
      </mesh>
      <group ref={inner}>
        <group ref={groupRef} position={[0, BOARD_Y, 0]}>
          <TextPlane
            map={map}
            width={BOARD_W}
            height={BOARD_H}
            reveal={arrive}
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

/** Full role history of one company, painted for a panel of the given aspect (w / h). */
function useDetailTexture(company: Company | null, aspect: number, viewportHeight: number) {
  const { t } = useTranslation()
  const logo = useImage(company ? LOGOS[company.id] : undefined)
  const px = aspect >= 1 ? 2048 : 1280
  const py = Math.round(px / aspect)

  return useCanvasTexture(
    px,
    py,
    (ctx) => {
      if (!company) return
      panelBackground(ctx, px, py)
      // Canvas pixels per CSS pixel once the panel is held up (it fills READER_FILL of the
      // viewport height). Everything is sized in on-screen pixels so wide and portrait
      // panels read the same, however differently their canvases are scaled.
      const css = py / (READER_FILL * viewportHeight)
      const wide = aspect >= 1
      const pad = (wide ? 32 : 18) * css
      const logoSize = (wide ? 48 : 40) * css
      drawLogo(ctx, logo, pad, pad, logoSize)
      ctx.textBaseline = 'middle'
      ctx.fillStyle = TEXT
      ctx.font = `700 ${logoSize * 0.5}px ${SANS}`
      ctx.fillText(company.name, pad + logoSize * 1.3, pad + logoSize / 2)

      const top = pad + logoSize + pad * 0.6
      const hintSize = 13 * css
      const bottom = py - pad - hintSize * 1.5
      const maxWidth = px - pad * 2
      // Largest font size at which every role fits, capped so short histories don't blow up to fill the panel.
      for (let size = Math.round((wide ? 20 : 16) * css); size >= 16; size -= 2) {
        const lineHeight = size * 1.8
        const blocks = company.roles.map((role) => ({
          role,
          bullets: role.bullets.map((b) => wrapRuns(ctx, [{ text: `•  ${b}`, font: `400 ${size}px ${SANS}`, color: TEXT }], maxWidth)),
          groups: (role.groups ?? []).map((g) =>
            wrapRuns(
              ctx,
              [
                { text: `${g.title}  `, font: `600 ${size * 0.9}px ${SANS}`, color: CYAN },
                { text: g.items.map((i) => i.name).join('  ·  '), font: `400 ${size * 0.9}px ${SANS}`, color: MUTED },
              ] satisfies Run[],
              maxWidth,
            ),
          ),
        }))
        const roleGap = size * 1.1
        // Narrow panels put the period under the title instead of beside it.
        const stacked = !wide
        const header = stacked ? size * 3.1 : size * 1.9
        const height = blocks.reduce(
          (h, b) => h + header + [...b.bullets, ...b.groups].reduce((n, l) => n + l.length, 0) * lineHeight + roleGap,
          -roleGap,
        )
        if (height > bottom - top && size > 16) continue

        let y = top
        for (const b of blocks) {
          ctx.textBaseline = 'top'
          ctx.font = `500 ${size * 0.95}px ${SANS}`
          const periodWidth = stacked ? 0 : ctx.measureText(b.role.period).width + size
          ctx.font = `650 ${size * 1.15}px ${SANS}`
          ctx.fillStyle = CYAN
          // Long titles are narrowed rather than run off the panel or into the period.
          ctx.fillText(b.role.title, pad, y, maxWidth - periodWidth)
          ctx.font = `500 ${size * 0.95}px ${SANS}`
          ctx.fillStyle = MUTED
          if (stacked) ctx.fillText(b.role.period, pad, y + size * 1.55)
          else {
            ctx.textAlign = 'right'
            ctx.fillText(b.role.period, px - pad, y + size * 0.15)
            ctx.textAlign = 'left'
          }
          y += header
          for (const lines of [...b.bullets, ...b.groups]) y = drawLines(ctx, lines, pad, y, lineHeight)
          y += roleGap
        }
        break
      }

      ctx.textBaseline = 'alphabetic'
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(141, 147, 171, 0.8)'
      ctx.font = `400 ${hintSize}px ${SANS}`
      ctx.fillText(t('labels.closeDetails'), px - pad, py - pad * 0.6)
      ctx.textAlign = 'left'
    },
    [company, logo, aspect, viewportHeight, t],
  )
}

const tmp = { from: new Vector3(), to: new Vector3(), fromQ: new Quaternion(), toQ: new Quaternion(), fwd: new Vector3() }

/**
 * The selected board's detail panel, pulled up in front of the camera like a
 * window grabbed in a headset. It flies out of the board and back into it.
 */
function Reader({
  company,
  source,
  onClose,
}: {
  company: Company | null
  source: () => Group | null
  onClose: () => void
}) {
  const { camera, size } = useThree()
  const aspect = size.width / size.height
  const panelAspect = aspect >= 1 ? Math.min(1.6, aspect * 0.9) : aspect * 0.9
  // Keep painting the last company while the panel flies back into its board.
  const [shown, setShown] = useState(company)
  if (company && company !== shown) setShown(company)
  const map = useDetailTexture(shown, panelAspect, size.height)
  const mesh = useRef<Group>(null)
  const open = useRef(0)

  useFrame((_, dt) => {
    const g = mesh.current!
    open.current = MathUtils.damp(open.current, company ? 1 : 0, 8, dt)
    const src = source()
    g.visible = open.current > 0.01 && !!src
    if (!g.visible || !src) return

    const cam = camera as PerspectiveCamera
    const tanHalf = Math.tan((cam.fov * Math.PI) / 360)
    const dist = 0.5 / (tanHalf * READER_FILL)
    tmp.fwd.set(0, 0, -1).applyQuaternion(cam.quaternion)
    tmp.to.copy(cam.position).addScaledVector(tmp.fwd, dist)
    tmp.toQ.copy(cam.quaternion)
    src.getWorldPosition(tmp.from)
    src.getWorldQuaternion(tmp.fromQ)

    const e = open.current * open.current * (3 - 2 * open.current)
    g.position.lerpVectors(tmp.from, tmp.to, e)
    g.quaternion.slerpQuaternions(tmp.fromQ, tmp.toQ, e)
    const fromScale = BOARD_H
    g.scale.setScalar(fromScale + (1 - fromScale) * e)
  })

  // The DOM HUD steps aside while a panel is held up.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(READER_EVENT, { detail: !!company }))
  }, [company])
  useEffect(() => () => void window.dispatchEvent(new CustomEvent(READER_EVENT, { detail: false })), [])

  useEffect(() => {
    if (!company) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [company, onClose])

  return (
    <group ref={mesh} visible={false}>
      <TextPlane
        map={map}
        width={panelAspect}
        height={1}
        depthTest={false}
        renderOrder={10}
        reveal={() => open.current}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        onPointerMissed={() => company && onClose()}
      />
    </group>
  )
}

/**
 * Experience: a timeline on the floor that lights up as you walk along it, with a
 * board per company rising as you reach it. Click a board to read it.
 */
export function Timeline({ progress }: { progress: RefObject<ScrollProgress> }) {
  const boards = useBoardSpecs()
  const [selected, setSelected] = useState<number | null>(null)
  const groups = useRef<(Group | null)[]>([])
  // The board the reader flies back into after it is closed.
  const [last, setLast] = useState<number | null>(null)
  if (selected !== null && selected !== last) setLast(selected)

  // Position along the walk: 0 at the first company's stop, n - 1 at the last.
  const walk = () => tourPosition(progress.current.screens) - EXPERIENCE.first

  // Walking on to another stop puts the panel back.
  useFrame(() => {
    if (selected !== null && Math.abs(walk() - selected) > 0.6) setSelected(null)
  })

  return (
    <>
      <TimelineFloor boards={boards} walk={walk} />
      {boards.map((b, i) => (
        <Board
          key={b.company.id}
          spec={b}
          selected={selected === i}
          onSelect={() => setSelected(i)}
          groupRef={(g) => {
            groups.current[i] = g
          }}
          k={i}
          walk={walk}
        />
      ))}
      <Reader
        company={selected === null ? null : boards[selected].company}
        source={() => (last === null ? null : groups.current[last])}
        onClose={() => setSelected(null)}
      />
    </>
  )
}
