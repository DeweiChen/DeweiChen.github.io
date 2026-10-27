import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useTranslation } from 'react-i18next'
import { Color, MeshStandardMaterial, type Group, type Plane } from 'three'
import { useResume } from '@/i18n/useResume'
import { CYAN, MUTED, OPEN_EVENT, TEXT, type OpenDetail, type PanelLayout } from './panel'
import { Reader } from './Reader'
import { SHELF } from './roomLayout'
import { goToStation, STATIONS, stationPresence } from './stations'
import { play } from './sound'
import { TextPlane } from './TextPlane'
import { drawLines, SANS, useCanvasTexture, wrapRuns } from './textCanvas'
import { useScanClip } from './useScanClip'
import type { ScrollProgress } from './useScrollProgress'

const INDEX = STATIONS.findIndex((s) => s.id === 'bookshelf')
const ZC = (SHELF.z0 + SHELF.z1) / 2
/** Bay centres: left bay (lower z, screen-left from the room) and right bay. */
const BAY_Z = [(SHELF.z0 + ZC) / 2, (ZC + SHELF.z1) / 2]
/** Keepsakes fill the hobby row bay by bay, then the row below from the other side, staggered like a checkerboard. */
const keepsakeSlot = (i: number) => {
  const row = Math.floor(i / 2)
  return { row: 2 - row, z: BAY_Z[(i + row) % 2] }
}
const floorOf = (row: number) => SHELF.boards[row] + SHELF.board / 2
const ceilingOf = (row: number) => SHELF.boards[row + 1] - SHELF.board / 2
// Turns a prop built facing +z to face into the room (-x).
const FACE_ROOM: [number, number, number] = [0, -Math.PI / 2, 0]

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

function usePointerCursor(active: boolean) {
  useEffect(() => {
    if (!active) return
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = ''
    }
  }, [active])
}

/** Moves `value` towards `target`; true while it is still moving. */
function ease(value: { current: number }, target: number, dt: number, rate: number) {
  if (value.current === target) return false
  if (Math.abs(target - value.current) > 1e-4) value.current += (target - value.current) * (1 - Math.exp(-Math.min(dt, 0.05) * rate))
  else value.current = target
  return true
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
  usePointerCursor(hovered)

  useFrame(({ invalidate }, dt) => {
    if (ease(pull, hovered ? 1 : 0, dt, 12)) invalidate()
    const g = group.current!
    g.position.x = spec.pos[0] - pull.current * PULL
    g.rotation.z = pull.current * 0.06
  })

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    play('hover')
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

/** The book on the go, face out in its own bay. Its cover opens the Now note. */
function Cover({
  title,
  clip,
  visible,
  onSelect,
  groupRef,
}: {
  title: string
  clip: Plane
  visible: () => boolean
  onSelect: () => void
  groupRef: (g: Group | null) => void
}) {
  const [hovered, setHovered] = useState(false)
  const lift = useRef(0)
  const group = useRef<Group>(null)
  usePointerCursor(hovered)
  const w = 0.36
  const h = 0.5
  const color = '#c8643c'
  const map = useCanvasTexture(
    512,
    Math.round((512 * h) / w),
    (ctx) => {
      const px = 512
      const py = Math.round((512 * h) / w)
      ctx.fillStyle = color
      ctx.fillRect(0, 0, px, py)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
      ctx.fillRect(36, 36, px - 72, 4)
      ctx.fillRect(36, py - 40, px - 72, 4)
      let size = 76
      let lines = wrapRuns(ctx, [{ text: title, font: `700 ${size}px ${SANS}`, color: '#fff6ea' }], px - 112)
      for (; size > 36 && lines.length > 3; size -= 4) {
        lines = wrapRuns(ctx, [{ text: title, font: `700 ${size}px ${SANS}`, color: '#fff6ea' }], px - 112)
      }
      drawLines(ctx, lines, 56, py * 0.3, size * 1.25)
    },
    [title],
  )
  const material = useMemo(
    () => new MeshStandardMaterial({ color: new Color(color).multiplyScalar(0.6), roughness: 0.8, clippingPlanes: [clip] }),
    [clip],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame(({ invalidate }, dt) => {
    if (ease(lift, hovered ? 1 : 0, dt, 12)) invalidate()
    group.current!.position.x = -lift.current * 0.08
  })

  const floor = floorOf(3)
  return (
    <group position={[SHELF.x + 0.08, floor + h / 2 + 0.01, BAY_Z[1]]} rotation={[0, 0, -0.1]}>
      <group ref={group}>
        <mesh material={material}>
          <boxGeometry args={[THICK * 0.7, h, w]} />
        </mesh>
        <group ref={groupRef} position={[-THICK * 0.35 - 0.002, 0, 0]} rotation={FACE_ROOM}>
          <TextPlane
            map={map}
            width={w}
            height={h}
            reveal={() => (visible() ? 1 : 0)}
            glow={() => lift.current * 0.3}
            onPointerOver={(e) => {
              e.stopPropagation()
              play('hover')
              setHovered(true)
            }}
            onPointerOut={() => setHovered(false)}
            onClick={(e) => {
              e.stopPropagation()
              play('click')
              onSelect()
            }}
          />
        </group>
      </group>
    </group>
  )
}

/** The Android robot, in its green, built from primitives. Faces +z; its feet are at y = 0. */
function Robot({ clip }: { clip: Plane }) {
  const green = <meshStandardMaterial color="#3ddc84" roughness={0.5} clippingPlanes={[clip]} />
  const white = <meshBasicMaterial color="#ffffff" clippingPlanes={[clip]} />
  const head = 0.248
  return (
    <>
      {[-0.045, 0.045].map((x) => (
        <mesh key={x} position={[x, 0.04, 0]}>
          <capsuleGeometry args={[0.026, 0.04, 4, 12]} />
          {green}
        </mesh>
      ))}
      <mesh position={[0, 0.155, 0]}>
        <cylinderGeometry args={[0.095, 0.095, 0.15, 32]} />
        {green}
      </mesh>
      <mesh position={[0, head, 0]}>
        <sphereGeometry args={[0.095, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {green}
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.125, 0.165, 0]}>
            <capsuleGeometry args={[0.024, 0.08, 4, 12]} />
            {green}
          </mesh>
          <mesh position={[side * 0.045, head + 0.1, 0]} rotation={[0, 0, -side * 0.45]}>
            <cylinderGeometry args={[0.006, 0.006, 0.05, 8]} />
            {green}
          </mesh>
          <mesh position={[side * 0.035, head + 0.045, 0.078]}>
            <sphereGeometry args={[0.011, 12, 8]} />
            {white}
          </mesh>
        </group>
      ))}
    </>
  )
}

/** A VR headset with its strap, the visor lit. Faces +z; it rests on y = 0. */
function Headset({ clip }: { clip: Plane }) {
  return (
    <group position={[0, 0.11, 0]} rotation={[0.12, 0, 0]} scale={1.6}>
      <mesh>
        <boxGeometry args={[0.24, 0.12, 0.1]} />
        <meshStandardMaterial color="#2a2b45" roughness={0.35} metalness={0.3} clippingPlanes={[clip]} />
      </mesh>
      <mesh position={[0, 0, 0.051]}>
        <planeGeometry args={[0.22, 0.1]} />
        <meshStandardMaterial color="#151628" roughness={0.15} metalness={0.6} clippingPlanes={[clip]} />
      </mesh>
      <mesh position={[0, -0.03, 0.052]}>
        <planeGeometry args={[0.16, 0.008]} />
        <meshBasicMaterial color={CYAN} toneMapped={false} clippingPlanes={[clip]} />
      </mesh>
      <mesh position={[0, 0, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.012, 8, 32, Math.PI]} />
        <meshStandardMaterial color="#3a3c5c" roughness={0.7} clippingPlanes={[clip]} />
      </mesh>
    </group>
  )
}

// Places I have been, as [lat, lon]. The favourite gets the big warm pin.
const VISITED: [number, number][] = [
  [39.9, 116.4], // China
  [1.35, 103.8], // Singapore
  [13.75, 100.5], // Thailand
  [39.0, -98.0], // United States
  [35.7, 139.7], // Japan
  [37.57, 126.98], // Korea
  [-33.9, 151.2], // Australia
]
const FAVOURITE: [number, number] = [-42.0, 172.5] // New Zealand
// Longitude turned to face the room, so the pins of Asia-Pacific are what you see.
const FACE_LON = 135
const DEG = Math.PI / 180

/** A point on a sphere of radius r, matching three's equirectangular sphere UVs. */
function onSphere([lat, lon]: [number, number], r: number): [number, number, number] {
  const phi = (lon + 180) * DEG
  const theta = (90 - lat) * DEG
  return [-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta)]
}

/** A desk globe: a gridded sphere on a tilted axis, pinned where I have travelled. Faces +z; its base is at y = 0. */
function Globe({ clip }: { clip: Plane }) {
  const r = 0.14
  const map = useCanvasTexture(
    1024,
    512,
    (ctx) => {
      ctx.fillStyle = '#16305c'
      ctx.fillRect(0, 0, 1024, 512)
      ctx.strokeStyle = 'rgba(127, 216, 245, 0.45)'
      ctx.lineWidth = 2
      for (let lon = 0; lon < 360; lon += 30) {
        const x = (lon / 360) * 1024
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, 512)
        ctx.stroke()
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = ((90 - lat) / 180) * 512
        ctx.lineWidth = lat === 0 ? 4 : 2
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(1024, y)
        ctx.stroke()
      }
    },
    [],
  )
  const metal = <meshStandardMaterial color="#8a8fb0" roughness={0.35} metalness={0.7} clippingPlanes={[clip]} />
  const centre = r + 0.05
  return (
    <>
      <mesh position={[0, 0.008, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.016, 32]} />
        {metal}
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.04, 8]} />
        {metal}
      </mesh>
      <group position={[0, centre, 0]} rotation={[0, 0, -23.4 * DEG]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[r + 0.014, 0.005, 8, 48, Math.PI]} />
          {metal}
        </mesh>
        <group rotation={[0, -(FACE_LON + 90) * DEG, 0]}>
          <mesh>
            <sphereGeometry args={[r, 48, 24]} />
            <meshStandardMaterial map={map} roughness={0.45} metalness={0.1} clippingPlanes={[clip]} />
          </mesh>
          {VISITED.map((p) => (
            <mesh key={p.join()} position={onSphere(p, r)}>
              <sphereGeometry args={[0.006, 12, 8]} />
              <meshBasicMaterial color={CYAN} toneMapped={false} clippingPlanes={[clip]} />
            </mesh>
          ))}
          <mesh position={onSphere(FAVOURITE, r)}>
            <sphereGeometry args={[0.011, 16, 10]} />
            <meshBasicMaterial color="#ffb347" toneMapped={false} clippingPlanes={[clip]} />
          </mesh>
        </group>
      </group>
    </>
  )
}

const KEEPSAKES = { android: Robot, metaverse: Headset, travel: Globe }
/** Keepsakes are built at desk size; this scales them up to fill their bay. */
const KEEPSAKE_SCALE = 1.25
/** How close (floor distance) a roaming camera has to be for the keepsakes to start swaying; on the tour, being at the shelf's stop is enough. */
const SWAY_NEAR = 4.5

/** One thing from outside work on a shelf: it turns towards you on hover, and opens its note on click. */
function Keepsake({
  z,
  row,
  height,
  atShelf,
  onSelect,
  groupRef,
  children,
}: {
  z: number
  row: number
  height: number
  atShelf: () => boolean
  onSelect: () => void
  groupRef: (g: Group | null) => void
  children: ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  const lift = useRef(0)
  const spin = useRef<Group>(null)
  usePointerCursor(hovered)

  useFrame(({ camera, clock, invalidate }, dt) => {
    const moving = ease(lift, hovered ? 1 : 0, dt, 10)
    // The camera backs off to fit the shelf, so at its stop it can stand beyond SWAY_NEAR.
    const near = atShelf() || Math.hypot(camera.position.x - SHELF.x, camera.position.z - z) < SWAY_NEAR
    const g = spin.current!
    g.position.y = lift.current * 0.04
    // A slow idle sway while you are near the shelf, a turn to face you when hovered.
    g.rotation.y = Math.sin(clock.elapsedTime * 0.6) * 0.35 * (1 - lift.current) + lift.current * 0.25
    if (moving || near) invalidate()
  })

  return (
    <group position={[SHELF.x - 0.02, floorOf(row), z]} rotation={FACE_ROOM}>
      <group
        ref={spin}
        onPointerOver={(e) => {
          e.stopPropagation()
          play('hover')
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation()
          play('click')
          onSelect()
        }}
      >
        <group scale={KEEPSAKE_SCALE}>{children}</group>
      </group>
      <group ref={groupRef} position={[0, (height * KEEPSAKE_SCALE) / 2, 0.1]} />
    </group>
  )
}

interface Note {
  kicker?: string
  title: string
  text: string
}

function paintNote(ctx: CanvasRenderingContext2D, note: Note, { px, css, pad, top }: PanelLayout) {
  const max = px - pad * 2
  ctx.textBaseline = 'top'
  if (note.kicker) {
    ctx.fillStyle = CYAN
    ctx.font = `600 ${13 * css}px ${SANS}`
    ctx.fillText(note.kicker.toUpperCase(), pad, pad)
  }
  ctx.fillStyle = TEXT
  ctx.font = `700 ${26 * css}px ${SANS}`
  ctx.fillText(note.title, pad, pad + 24 * css, max)
  const size = 18 * css
  const lines = wrapRuns(ctx, [{ text: note.text, font: `400 ${size}px ${SANS}`, color: MUTED }], max)
  return drawLines(ctx, lines, pad, top + 8 * css, size * 1.7) - top
}

/**
 * The bookshelf: books I have read spine out on the top shelf, the one I am reading
 * face out beside them, and below, the things that stand for most of my life outside work.
 * Hovering pulls a book or turns a keepsake; clicking the cover or a keepsake opens its note.
 */
export function Bookshelf({ progress }: { progress: RefObject<ScrollProgress> }) {
  const { t } = useTranslation()
  const { books, hobbies, now } = useResume()
  const clip = useScanClip(progress)
  const invalidate = useThree((s) => s.invalidate)
  const [selected, setSelected] = useState<number | null>(null)
  const [last, setLast] = useState<number | null>(null)
  if (selected !== null && selected !== last) setLast(selected)
  const sources = useRef<(Group | null)[]>([])
  const pending = useRef<number | null>(null)

  const reading = books.find((b) => b.reading)
  // Hobbies first, so their index matches the keyboard outline's open requests; the Now note last.
  const notes = useMemo<Note[]>(
    () => [
      ...hobbies.map((h) => ({ title: h.name, text: h.text })),
      ...(reading ? [{ kicker: `${t('labels.reading')} · ${now.updated}`, title: reading.title, text: now.text }] : []),
    ],
    [hobbies, reading, now, t],
  )

  const specs = useMemo(() => {
    const read = books.filter((b) => !b.reading)
    const floor = floorOf(3)
    const room = ceilingOf(3) - floor
    // Spines centred in the left bay.
    const z0 = BAY_Z[0] - (read.length * (THICK + 0.012)) / 2
    return read.map((b, j): BookSpec => {
      const height = Math.min(room - 0.06, 0.5 + rand(j) * 0.18)
      const depth = 0.3 + rand(j + 0.5) * 0.08
      const color = new Color()
        .setHSL(0.55 + (j / Math.max(1, read.length - 1)) * 0.2 + (rand(j + 0.25) - 0.5) * 0.06, 0.45, 0.22 + rand(j + 0.75) * 0.1)
        .getStyle()
      const z = z0 + j * (THICK + 0.012) + THICK / 2
      return { key: b.id, label: b.title, height, depth, pos: [FRONT + 0.03 + depth / 2, floor + height / 2, z], color }
    })
  }, [books])

  // Open requests from the keyboard outline wait until the camera has reached the shelf.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<OpenDetail>).detail
      if (detail.id !== 'hobbies') return
      pending.current = detail.index
      invalidate()
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [invalidate])

  const presence = () => stationPresence(progress.current.screens, INDEX)
  // Clicked from across the room: go to the shelf, and open once there.
  const open = (i: number) => {
    if (presence() > 0.9) return setSelected(i)
    pending.current = i
    goToStation(INDEX)
  }
  useFrame(() => {
    const p = presence()
    if (pending.current !== null && p > 0.9) {
      setSelected(pending.current)
      pending.current = null
    }
    // Walking on puts the note back.
    if (selected !== null && p < 0.4) setSelected(null)
  })

  const visible = () => clip.constant > SHELF.boards[SHELF.boards.length - 1]
  const plaques = [
    { label: t('labels.booksRead'), position: [FRONT - 0.004, floorOf(3) - 0.022, BAY_Z[0]] },
    { label: t('labels.reading'), position: [FRONT - 0.004, floorOf(3) - 0.022, BAY_Z[1]] },
    ...hobbies.map((h, i) => {
      const { row, z } = keepsakeSlot(i)
      return { label: h.name, position: [FRONT - 0.004, floorOf(row) - 0.022, z] }
    }),
  ] as { label: string; position: [number, number, number] }[]
  const source = (i: number) => (g: Group | null) => {
    sources.current[i] = g
  }

  return (
    <group>
      {specs.map((b) => (
        <Book key={b.key} spec={b} clip={clip} visible={visible} />
      ))}
      {reading && (
        <Cover title={reading.title} clip={clip} visible={visible} onSelect={() => open(hobbies.length)} groupRef={source(hobbies.length)} />
      )}
      {hobbies.map((h, i) => {
        const Prop = KEEPSAKES[h.id]
        return (
          <Keepsake
            key={h.id}
            {...keepsakeSlot(i)}
            height={0.36}
            atShelf={() => presence() > 0}
            onSelect={() => open(i)}
            groupRef={source(i)}
          >
            <Prop clip={clip} />
          </Keepsake>
        )
      })}
      {plaques.map((p) => (
        <Plaque key={p.label} label={p.label} position={p.position} visible={visible} />
      ))}
      <Reader
        item={selected === null ? null : notes[selected]}
        paint={paintNote}
        deps={[]}
        source={() => (last === null ? null : sources.current[last])}
        sourceHeight={0.36 * KEEPSAKE_SCALE}
        fill={{ wide: 0.3, tall: 0.36 }}
        onClose={() => setSelected(null)}
      />
    </group>
  )
}
