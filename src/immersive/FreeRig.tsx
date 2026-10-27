import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Euler, Vector2, Vector3, type PerspectiveCamera } from 'three'
import { Flight, POSE_EVENT, WALK_EVENT } from './freeMode'
import { READER_EVENT } from './panel'
import { railPose } from './rail'
import { play } from './sound'
import { LIVING } from './roomLayout'
import { nearestStation, STATION_AT, STATIONS } from './stations'

/** Radians turned per pixel dragged. */
const LOOK = 0.0045
const PITCH_MAX = 1.05
/** Room units per second while a movement key is held. */
const SPEED = 1.8
/** A pointer that moves further than this between down and up was a drag, not a click. */
const DRAG_PX = 6
/** Room units walked between two footsteps. */
const STRIDE = 0.55
const KEYS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
}
// Inside the walls, but free to step back out of the open front of the cut-away room.
const BOUNDS = { x0: LIVING.x0 + 0.3, x1: LIVING.x1 - 0.3, z0: LIVING.z0 + 0.3, z1: LIVING.z1 + 1.5 }

const tmp = { target: new Vector3(), euler: new Euler(0, 0, 0, 'YXZ') }

/**
 * The station you are at while roaming: the one you stand near and face. It has to beat
 * the current one by a margin, so standing between two does not flicker between them.
 */
function pickStation(pos: Vector3, yaw: number, current: number) {
  const fx = -Math.sin(yaw)
  const fz = -Math.cos(yaw)
  const score = (i: number) => {
    const s = STATIONS[i]
    const dist = Math.hypot(pos.x - s.pos[0], pos.z - s.pos[2])
    const tx = s.target[0] - pos.x
    const tz = s.target[2] - pos.z
    const facing = (fx * tx + fz * tz) / (Math.hypot(tx, tz) || 1)
    return dist + (1 - facing) * 1.2
  }
  let best = current
  let bestScore = current > 0 ? score(current) - 0.2 : Infinity
  // The hero stop is the name in front of the room, not a place to stand.
  for (let i = 1; i < STATIONS.length; i++) {
    const v = score(i)
    if (v < bestScore) {
      best = i
      bestScore = v
    }
  }
  return best
}

/**
 * Free roam: drag to look around, click the floor to walk there, or use WASD / the
 * arrow keys and the mouse wheel. The station you are at is written back to the scroll
 * position, which the rest of the scene reads; a station chosen elsewhere (the map,
 * the keyboard outline, clicking a far object) is flown to.
 */
export function FreeRig() {
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)
  const view = useRef({ pos: new Vector3(), yaw: 0, pitch: 0 })
  const synced = useRef(-1)
  const walkTo = useRef<Vector2 | null>(null)
  const push = useRef(0)
  const held = useRef(new Set<string>())
  const reading = useRef(false)
  const flight = useRef(new Flight())
  const lastPose = useRef<[number, number]>([NaN, NaN])
  const stride = useRef(0)

  useEffect(() => {
    const onReader = (e: Event) => {
      reading.current = (e as CustomEvent<boolean>).detail
    }
    window.addEventListener(READER_EVENT, onReader)
    return () => window.removeEventListener(READER_EVENT, onReader)
  }, [])

  // Dragging on the canvas turns the view. A drag that ends on an object must not click it.
  useEffect(() => {
    const el = gl.domElement
    el.style.touchAction = 'none'
    el.style.cursor = 'grab'
    let down: { x: number; y: number; lx: number; ly: number; moved: boolean } | null = null
    let dragged = false

    const onDown = (e: PointerEvent) => {
      dragged = false
      if (reading.current || flight.current.active) return
      down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false }
    }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > DRAG_PX) {
        down.moved = true
        el.style.cursor = 'grabbing'
      }
      if (down.moved) {
        const v = view.current
        v.yaw += (e.clientX - down.lx) * LOOK
        v.pitch = Math.min(PITCH_MAX, Math.max(-PITCH_MAX, v.pitch + (e.clientY - down.ly) * LOOK))
        invalidate()
      }
      down.lx = e.clientX
      down.ly = e.clientY
    }
    const onUp = () => {
      dragged = !!down?.moved
      down = null
      el.style.cursor = 'grab'
    }
    // Capture phase, ahead of the scene's own click handling on the canvas.
    const onClick = (e: MouseEvent) => {
      if (!dragged) return
      dragged = false
      e.stopPropagation()
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('click', onClick, true)
    return () => {
      el.style.touchAction = ''
      el.style.cursor = ''
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('click', onClick, true)
    }
  }, [gl, invalidate])

  // Keys and the wheel walk; a click on the floor (see Room) walks there.
  useEffect(() => {
    const all = Object.values(KEYS).flat()
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]')
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e) || reading.current || !all.includes(e.code)) return
      e.preventDefault()
      held.current.add(e.code)
      walkTo.current = null
      invalidate()
    }
    const onKeyUp = (e: KeyboardEvent) => held.current.delete(e.code)
    const onBlur = () => held.current.clear()
    const onWheel = (e: WheelEvent) => {
      if (reading.current) return
      e.preventDefault()
      push.current = Math.max(-2, Math.min(2, push.current - e.deltaY * 0.0025))
      walkTo.current = null
      invalidate()
    }
    const onWalk = (e: Event) => {
      if (reading.current || flight.current.active) return
      const [x, z] = (e as CustomEvent<[number, number]>).detail
      walkTo.current = new Vector2(x, z)
      invalidate()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener(WALK_EVENT, onWalk)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener(WALK_EVENT, onWalk)
    }
  }, [invalidate])

  // Priority -1, like CameraRig: after the scroll is read, before the scene objects.
  useFrame(({ camera, size }, dt) => {
    const d = Math.min(dt, 0.05)
    const v = view.current
    const { pos } = v
    // First frame: carry on from wherever the camera is, at the station the scroll is at.
    if (synced.current < 0) {
      const e = tmp.euler.setFromQuaternion(camera.quaternion, 'YXZ')
      v.yaw = e.y
      v.pitch = e.x
      pos.copy(camera.position)
      synced.current = nearestStation(scrollY / innerHeight)
    }
    // A note opened on arrival may beat the flight there; land first, then hold still.
    if (reading.current) {
      if (!flight.current.active) return
      camera.position.copy(pos)
      camera.rotation.set(v.pitch, v.yaw, 0, 'YXZ')
      flight.current.apply(camera, d)
      invalidate()
      return
    }

    // Somewhere else picked a station: fly to where the tour would stand there.
    const asked = nearestStation(scrollY / innerHeight)
    if (asked !== synced.current) {
      play('move', asked > synced.current ? 1 : 0)
      synced.current = asked
      flight.current.start(camera.position, camera.quaternion)
      railPose(asked, camera as PerspectiveCamera, size.width / size.height, pos, tmp.target)
      const dir = tmp.target.sub(pos)
      v.yaw = Math.atan2(-dir.x, -dir.z)
      v.pitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z))
      walkTo.current = null
      push.current = 0
    } else if (!flight.current.active) {
      let moving = false
      const wasX = pos.x
      const wasZ = pos.z
      const fx = -Math.sin(v.yaw)
      const fz = -Math.cos(v.yaw)
      const has = (codes: string[]) => codes.some((c) => held.current.has(c))
      const ahead = (has(KEYS.forward) ? 1 : 0) - (has(KEYS.back) ? 1 : 0)
      const side = (has(KEYS.right) ? 1 : 0) - (has(KEYS.left) ? 1 : 0)
      if (ahead || side) {
        pos.x += (fx * ahead - fz * side) * SPEED * d
        pos.z += (fz * ahead + fx * side) * SPEED * d
        moving = true
      }
      if (Math.abs(push.current) > 1e-3) {
        const step = push.current * (1 - Math.exp(-d * 8))
        pos.x += fx * step
        pos.z += fz * step
        push.current -= step
        moving = true
      } else push.current = 0
      const to = walkTo.current
      if (to) {
        const k = 1 - Math.exp(-d * 3)
        pos.x += (to.x - pos.x) * k
        pos.z += (to.y - pos.z) * k
        if (Math.hypot(to.x - pos.x, to.y - pos.z) < 0.01) walkTo.current = null
        moving = true
      }
      pos.x = Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, pos.x))
      pos.z = Math.min(BOUNDS.z1, Math.max(BOUNDS.z0, pos.z))
      if (moving) invalidate()

      stride.current += Math.hypot(pos.x - wasX, pos.z - wasZ)
      if (stride.current > STRIDE) {
        stride.current = 0
        play('step')
      }

      // Tell the rest of the scene which station this is.
      const at = pickStation(pos, v.yaw, synced.current)
      if (at !== synced.current) {
        synced.current = at
        window.scrollTo({ top: STATION_AT[at] * innerHeight, behavior: 'instant' })
      }
    }

    camera.position.copy(pos)
    camera.rotation.set(v.pitch, v.yaw, 0, 'YXZ')
    if (flight.current.apply(camera, d)) invalidate()

    const [lx, lz] = lastPose.current
    if (Math.abs(camera.position.x - lx) > 0.01 || Math.abs(camera.position.z - lz) > 0.01) {
      lastPose.current = [camera.position.x, camera.position.z]
      window.dispatchEvent(new CustomEvent<[number, number]>(POSE_EVENT, { detail: lastPose.current }))
    }
  }, -1)

  return null
}
