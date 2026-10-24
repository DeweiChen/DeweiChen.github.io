import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Color, MeshStandardMaterial, type Group, type Plane } from 'three'
import { useResume } from '@/i18n/useResume'
import { SHELF } from './roomLayout'
import { TextPlane } from './TextPlane'
import { SANS, useCanvasTexture } from './textCanvas'
import { useScanClip } from './useScanClip'
import type { ScrollProgress } from './useScrollProgress'

const FRONT = SHELF.x - SHELF.depth / 2
const THICK = 0.1
const PULL = 0.2

// Cheap deterministic noise so the books keep their sizes across renders and languages.
const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

interface BookSpec {
  key: string
  label: string
  height: number
  depth: number
  pos: [number, number, number]
  color: string
}

/** Spine label, painted sideways so it reads top to bottom like a real book. */
function useSpine(label: string, height: number, color: string) {
  const w = 96
  const h = Math.round((w * height) / THICK)
  return useCanvasTexture(
    w,
    h,
    (ctx) => {
      ctx.fillStyle = color
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.fillRect(0, h * 0.06, w, 3)
      ctx.fillRect(0, h * 0.94 - 3, w, 3)

      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.rotate(Math.PI / 2)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#f2f4fb'
      let size = 52
      for (; size > 18; size -= 2) {
        ctx.font = `600 ${size}px ${SANS}`
        if (ctx.measureText(label).width <= h * 0.78) break
      }
      ctx.fillText(label, 0, 2)
      ctx.restore()
    },
    [label, color],
  )
}

function Book({ spec, clip, visible }: { spec: BookSpec; clip: Plane; visible: () => boolean }) {
  const group = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)
  const pull = useRef(0)
  const spine = useSpine(spec.label, spec.height, spec.color)
  const material = useMemo(
    () => new MeshStandardMaterial({ color: new Color(spec.color).multiplyScalar(0.7), roughness: 0.85, clippingPlanes: [clip] }),
    [spec.color, clip],
  )
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => {
    if (!hovered) return
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered])

  useFrame(({ invalidate }, dt) => {
    const target = hovered ? 1 : 0
    if (pull.current !== target) {
      if (Math.abs(target - pull.current) > 1e-4) {
        pull.current += (target - pull.current) * (1 - Math.exp(-Math.min(dt, 0.05) * 12))
      } else {
        pull.current = target
      }
      invalidate()
    }
    const g = group.current!
    g.position.x = spec.pos[0] - pull.current * PULL
    g.rotation.z = pull.current * 0.06
  })

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(true)
  }

  return (
    <group ref={group} position={spec.pos} onPointerOver={over} onPointerOut={() => setHovered(false)}>
      <mesh material={material}>
        <boxGeometry args={[spec.depth, spec.height, THICK]} />
      </mesh>
      <TextPlane
        map={spine}
        width={THICK * 0.96}
        height={spec.height * 0.98}
        position={[-spec.depth / 2 - 0.002, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        reveal={() => (visible() ? 1 : 0)}
        glow={() => pull.current * 0.35}
      />
    </group>
  )
}

/** Group name on a small plaque hanging off the front of the shelf board. */
function Plaque({ label, position, visible }: { label: string; position: [number, number, number]; visible: () => boolean }) {
  const map = useCanvasTexture(
    1024,
    144,
    (ctx) => {
      ctx.fillStyle = '#0c1020'
      ctx.fillRect(0, 0, 1024, 144)
      ctx.fillStyle = 'rgba(127, 216, 245, 0.5)'
      ctx.fillRect(0, 0, 1024, 4)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#7fd8f5'
      ctx.font = `600 64px ${SANS}`
      ctx.fillText(label.toUpperCase(), 512, 76)
    },
    [label],
  )
  return (
    <TextPlane
      map={map}
      width={0.6}
      height={0.084}
      position={position}
      rotation={[0, -Math.PI / 2, 0]}
      reveal={() => (visible() ? 1 : 0)}
    />
  )
}

/**
 * Skills as books: one shelf bay per group, one book per skill, spine out.
 * Hovering pulls a book towards you. Everything stays clipped above the room's scan line.
 */
export function Bookshelf({ progress }: { progress: RefObject<ScrollProgress> }) {
  const { skills } = useResume()
  const clip = useScanClip(progress)

  const { books, plaques } = useMemo(() => {
    const books: BookSpec[] = []
    const plaques: { label: string; position: [number, number, number] }[] = []
    const zc = (SHELF.z0 + SHELF.z1) / 2
    skills.forEach((group, k) => {
      // Top compartment first; left bay (lower z, which is screen-left from the room) before right.
      const row = 3 - Math.floor(k / 2)
      const floor = SHELF.boards[row] + SHELF.board / 2
      const ceiling = SHELF.boards[row + 1] - SHELF.board / 2
      const bayStart = k % 2 === 0 ? SHELF.z0 + 0.04 : zc + 0.035
      const hue = k / (skills.length - 1)
      let z = bayStart
      group.items.forEach((label, j) => {
        const n = k * 17 + j
        const height = Math.min(ceiling - floor - 0.06, 0.5 + rand(n) * 0.18)
        const depth = 0.3 + rand(n + 0.5) * 0.08
        const color = new Color()
          .setHSL(0.55 + hue * 0.2 + (rand(n + 0.25) - 0.5) * 0.06, 0.45, 0.22 + rand(n + 0.75) * 0.1)
          .getStyle()
        books.push({
          key: `${k}-${j}`,
          label,
          height,
          depth,
          pos: [FRONT + 0.03 + depth / 2, floor + height / 2, z + THICK / 2],
          color,
        })
        z += THICK + 0.012
      })
      plaques.push({ label: group.group, position: [FRONT - 0.004, floor - 0.022, k % 2 === 0 ? (SHELF.z0 + zc) / 2 : (zc + SHELF.z1) / 2] })
    })
    return { books, plaques }
  }, [skills])

  const visible = () => clip.constant > SHELF.boards[SHELF.boards.length - 1]

  return (
    <group>
      {books.map((b) => (
        <Book key={b.key} spec={b} clip={clip} visible={visible} />
      ))}
      {plaques.map((p) => (
        <Plaque key={p.label} label={p.label} position={p.position} visible={visible} />
      ))}
    </group>
  )
}
