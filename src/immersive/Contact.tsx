import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useTranslation } from 'react-i18next'
import { MathUtils, MeshBasicMaterial, MeshStandardMaterial, type Group, type Plane } from 'three'
import { useResume } from '@/i18n/useResume'
import { CYAN, MUTED, panelBackground, TEXT } from './panel'
import { shownWhenFree } from './freeMode'
import { GlowPool } from './GlowPool'
import { DOOR, FLOOR_Y } from './roomLayout'
import { goToStation, STATIONS, stationPresence } from './stations'
import { TextPlane } from './TextPlane'
import { drawExternalArrow, drawReturnArrow, SANS, useCanvasTexture, wrapRuns } from './textCanvas'
import { useScanClip } from './useScanClip'
import type { ScrollProgress } from './useScrollProgress'

const INDEX = STATIONS.findIndex((s) => s.id === 'contact')
// Everything here hangs on the left wall and faces into the room (+x).
const WALL = DOOR.x + 0.03
const FACE_IN: [number, number, number] = [0, Math.PI / 2, 0]
// Beside the door, towards the front of the room.
const PANEL = { z: DOOR.z1 + 0.69, y: -0.2, w: 1.15, h: 0.4 }
const BUTTON = { w: 0.36, h: 0.13, d: 0.05, y: -0.62, gap: 0.035 }
// Portrait phones see the wall from far back (the door has to fit the width too), so the
// plate grows taller with larger type and the buttons stack into full-width rows below it.
const PANEL_TALL = { ...PANEL, y: 0.05, h: 0.5 }
const BUTTON_TALL = { ...BUTTON, w: PANEL.w, h: 0.17, y: -0.36, gap: 0.05 }

function usePortrait() {
  return useThree((s) => s.size.width < s.size.height)
}
const DOOR_W = DOOR.z1 - DOOR.z0
const DOOR_H = DOOR.top - FLOOR_Y

function usePointerCursor(active: boolean) {
  useEffect(() => {
    if (!active) return
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = ''
    }
  }, [active])
}

/** "Get in touch", what to write about and the email address, on a plate on the wall. */
function Plate({ presence }: { presence: () => number }) {
  const { t } = useTranslation()
  const r = useResume()
  const portrait = usePortrait()
  const panel = portrait ? PANEL_TALL : PANEL
  const px = 1536
  const py = Math.round((px * panel.h) / panel.w)
  const map = useCanvasTexture(
    px,
    py,
    (ctx) => {
      panelBackground(ctx, px, py)
      ctx.textBaseline = 'top'
      const k = portrait ? 2 : 1
      ctx.fillStyle = CYAN
      ctx.font = `600 ${40 * k}px ${SANS}`
      ctx.fillText(t('labels.contact').toUpperCase(), 80, 76)
      ctx.fillStyle = MUTED
      ctx.font = `400 ${38 * k}px ${SANS}`
      let y = 76 + 74 * k
      for (const line of wrapRuns(ctx, [{ text: t('contactPitch'), font: ctx.font, color: MUTED }], px - 160)) {
        ctx.fillText(line.map((p) => p.text).join(''), 80, y)
        y += 52 * k
      }
      ctx.fillStyle = TEXT
      let size = 96 * k
      for (; size > 48; size -= 4) {
        ctx.font = `700 ${size}px ${SANS}`
        if (ctx.measureText(r.email).width <= px - 160) break
      }
      ctx.fillText(r.email, 80, portrait ? y + 30 : Math.max(250, y + 48))
    },
    [r, t, portrait],
  )
  return (
    <TextPlane
      map={map}
      width={panel.w}
      height={panel.h}
      position={[WALL, panel.y, panel.z]}
      rotation={FACE_IN}
      reveal={() => shownWhenFree(Math.min(1, presence() * 1.4))}
    />
  )
}

/** A key on the wall that pops out on hover and presses in on click. */
function WallButton({
  label,
  href,
  external,
  y,
  z,
  clip,
  presence,
}: {
  label: string
  href: string
  external?: boolean
  y: number
  z: number
  clip: Plane
  presence: () => number
}) {
  const invalidate = useThree((s) => s.invalidate)
  const button = usePortrait() ? BUTTON_TALL : BUTTON
  const [hovered, setHovered] = useState(false)
  const press = useRef(0)
  const pop = useRef(0)
  const group = useRef<Group>(null)
  const material = useMemo(() => new MeshStandardMaterial({ color: '#1e2140', roughness: 0.5, clippingPlanes: [clip] }), [clip])
  useEffect(() => () => material.dispose(), [material])
  usePointerCursor(hovered)

  const py = 192
  const px = Math.round((py * button.w) / button.h)
  const map = useCanvasTexture(
    px,
    py,
    (ctx) => {
      ctx.fillStyle = '#141a33'
      ctx.beginPath()
      ctx.roundRect(0, 0, px, py, py * 0.3)
      ctx.fill()
      ctx.strokeStyle = 'rgba(127, 216, 245, 0.6)'
      ctx.lineWidth = 4
      ctx.stroke()

      const fontSize = py * 0.36
      ctx.font = `600 ${fontSize}px ${SANS}`
      ctx.textBaseline = 'middle'

      if (external) {
        const textW = ctx.measureText(label).width
        const iconSize = fontSize * 0.52
        const gap = fontSize * 0.22
        const totalW = textW + gap + iconSize
        const startX = (px - totalW) / 2

        ctx.textAlign = 'left'
        ctx.fillStyle = CYAN
        ctx.fillText(label, startX, py / 2 + 2)

        const iconX = startX + textW + gap
        const iconY = py / 2 - iconSize / 2 + 2
        drawExternalArrow(ctx, iconX, iconY, iconSize, CYAN, 4)
      } else {
        ctx.textAlign = 'center'
        ctx.fillStyle = CYAN
        ctx.fillText(label, px / 2, py / 2 + 2)
      }
    },
    [label, external, px],
  )

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    const popTarget = hovered ? 1 : 0
    if (pop.current !== popTarget || press.current !== 0) {
      pop.current = Math.abs(popTarget - pop.current) > 1e-4 ? MathUtils.damp(pop.current, popTarget, 12, d) : popTarget
      press.current = press.current > 1e-4 ? MathUtils.damp(press.current, 0, 10, d) : 0
      invalidate()
    }
    group.current!.position.x = WALL + BUTTON.d / 2 + pop.current * 0.03 - press.current * 0.04
  })

  return (
    <group ref={group} position={[WALL + BUTTON.d / 2, y, z]}>
      <mesh material={material}>
        <boxGeometry args={[BUTTON.d, button.h, button.w]} />
      </mesh>
      <TextPlane
        map={map}
        width={button.w}
        height={button.h}
        position={[BUTTON.d / 2 + 0.001, 0, 0]}
        rotation={FACE_IN}
        reveal={() => shownWhenFree(Math.min(1, presence() * 1.4))}
        glow={() => pop.current * 0.4}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation()
          // From across the room, the first click only goes to the wall.
          if (presence() < 0.9) return goToStation(INDEX)
          press.current = 1
          invalidate()
          window.open(href, href.startsWith('mailto:') ? '_self' : '_blank', 'noopener')
        }}
      />
    </group>
  )
}

/**
 * The way out: a door in the left wall. It opens a crack on hover with light
 * behind it; pushing it swings it open and goes back to the classic page.
 */
function Door({ clip, presence, onExit }: { clip: Plane; presence: () => number; onExit?: () => void }) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(false)
  const [pushed, setPushed] = useState(false)
  const signW = usePortrait() ? 0.72 : 0.5
  const swing = useRef(0)
  const hinge = useRef<Group>(null)
  usePointerCursor(hovered && !pushed)
  const leaf = useMemo(() => new MeshStandardMaterial({ color: '#2c2e4a', roughness: 0.7, clippingPlanes: [clip] }), [clip])
  const light = useMemo(() => new MeshBasicMaterial({ color: '#e8f1ff', transparent: true, opacity: 0, toneMapped: false }), [])
  useEffect(
    () => () => {
      leaf.dispose()
      light.dispose()
    },
    [leaf, light],
  )

  const px = 512
  const py = 200
  const sign = useCanvasTexture(
    px,
    py,
    (ctx) => {
      ctx.fillStyle = '#121528'
      ctx.beginPath()
      ctx.roundRect(0, 0, px, py, 24)
      ctx.fill()
      ctx.strokeStyle = 'rgba(127, 216, 245, 0.5)'
      ctx.lineWidth = 3
      ctx.stroke()

      const text = t('labels.classic')
      ctx.font = `600 56px ${SANS}`
      ctx.textBaseline = 'middle'

      const textW = ctx.measureText(text).width
      const iconSize = 40
      const gap = 16
      const totalW = iconSize + gap + textW
      const startX = (px - totalW) / 2
      const iconY = 78 - iconSize / 2

      drawReturnArrow(ctx, startX, iconY, iconSize, CYAN, 4.5)

      ctx.textAlign = 'left'
      ctx.fillStyle = CYAN
      ctx.fillText(text, startX + iconSize + gap, 78)

      ctx.textAlign = 'center'
      ctx.fillStyle = MUTED
      ctx.font = `400 34px ${SANS}`
      ctx.fillText(t('labels.exitDoor'), px / 2, 146, px - 40)
    },
    [t],
  )

  useEffect(() => {
    if (!pushed) return
    const id = setTimeout(() => onExit?.(), 700)
    return () => clearTimeout(id)
  }, [pushed, onExit])

  useFrame(({ invalidate }, dt) => {
    const target = pushed ? 1 : hovered ? 0.2 : 0
    if (swing.current !== target) {
      if (Math.abs(target - swing.current) > 1e-4) {
        swing.current = MathUtils.damp(swing.current, target, pushed ? 4 : 8, Math.min(dt, 0.05))
      } else {
        swing.current = target
      }
      invalidate()
    }
    // Swings outwards, away from the room.
    hinge.current!.rotation.y = -swing.current * 1.35
    light.opacity = Math.min(1, swing.current * 3) * presence()
  })

  return (
    <>
      {/* What lies beyond: the bright 2D page. */}
      <mesh material={light} position={[DOOR.x - 0.3, FLOOR_Y + DOOR_H / 2, (DOOR.z0 + DOOR.z1) / 2]} rotation={FACE_IN}>
        <planeGeometry args={[DOOR_W * 1.6, DOOR_H * 1.2]} />
      </mesh>
      {/* Daylight from the open door falling across the floor. */}
      <GlowPool
        color={[232, 241, 255]}
        peak={0.35}
        strength={() => Math.min(1, swing.current * 3) * presence()}
        center={[0, 0.5]}
        stretch={2.2}
        radius={0.45}
        size={[2.2, 1.4]}
        position={[DOOR.x + 1.1, FLOOR_Y + 0.022, (DOOR.z0 + DOOR.z1) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <group ref={hinge} position={[DOOR.x, FLOOR_Y, DOOR.z0]}>
        <group position={[0, DOOR_H / 2, DOOR_W / 2]}>
          <mesh
            material={leaf}
            onPointerOver={(e) => {
              e.stopPropagation()
              setHovered(true)
            }}
            onPointerOut={() => setHovered(false)}
            onClick={(e) => {
              e.stopPropagation()
              if (presence() < 0.9) return goToStation(INDEX)
              setPushed(true)
            }}
          >
            <boxGeometry args={[0.04, DOOR_H - 0.01, DOOR_W - 0.01]} />
          </mesh>
          {/* Handle on the free edge. */}
          <mesh material={leaf} position={[0.05, -0.05, DOOR_W / 2 - 0.09]}>
            <boxGeometry args={[0.05, 0.03, 0.12]} />
          </mesh>
          <TextPlane
            map={sign}
            width={signW}
            height={signW * (py / px)}
            position={[0.022, 0.35, 0]}
            rotation={FACE_IN}
            reveal={() => shownWhenFree(Math.min(1, presence() * 1.4))}
            glow={() => swing.current}
          />
        </group>
      </group>
    </>
  )
}

/** Contact: the address on the left wall, buttons to reach out, and the door back to the classic page. */
export function Contact({ progress, onExit }: { progress: RefObject<ScrollProgress>; onExit?: () => void }) {
  const r = useResume()
  const portrait = usePortrait()
  const clip = useScanClip(progress)
  const presence = () => stationPresence(progress.current.screens, INDEX)
  const buttons = [
    { label: 'Email', href: `mailto:${r.email}` },
    { label: 'GitHub', href: r.links.github, external: true },
    { label: 'LinkedIn', href: r.links.linkedin, external: true },
  ]
  const span = buttons.length * BUTTON.w + (buttons.length - 1) * BUTTON.gap

  return (
    <>
      {/* A soft periwinkle wash on the wall around the plate and buttons, cool like the daylight behind the door. */}
      <GlowPool
        color={[140, 150, 255]}
        peak={0.2}
        strength={presence}
        stretch={1.4}
        size={[PANEL.w + 1.4, 1.9]}
        position={[DOOR.x + 0.022, -0.3, PANEL.z]}
        rotation={FACE_IN}
      />
      <Plate presence={presence} />
      {buttons.map((b, i) => (
        <WallButton
          key={b.label}
          {...b}
          // Looking towards -x, screen-left is +z: the first button sits there.
          y={portrait ? BUTTON_TALL.y - i * (BUTTON_TALL.h + BUTTON_TALL.gap) : BUTTON.y}
          z={portrait ? PANEL.z : PANEL.z + span / 2 - BUTTON.w / 2 - i * (BUTTON.w + BUTTON.gap)}
          clip={clip}
          presence={presence}
        />
      ))}
      <Door clip={clip} presence={presence} onExit={onExit} />
    </>
  )
}
