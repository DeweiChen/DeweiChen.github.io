import { useSyncExternalStore } from 'react'
import { Quaternion, Vector3, type Camera } from 'three'

// Free roam: the camera walks wherever you take it instead of riding the scroll.
// The scroll position still says which station you are at, so the scene reveals
// and the HUD follow along unchanged.

/** Window event with `detail: boolean`, fired when free roam is switched on or off. */
export const FREE_EVENT = 'tour:free'
/** Window event with `detail: [x, z]`, the camera's spot on the floor while roaming. */
export const POSE_EVENT = 'tour:pose'
/** Window event with `detail: [x, z]`, asking the roaming camera to walk to a spot on the floor. */
export const WALK_EVENT = 'tour:walk'

let free = false

export const isFree = () => free

export function setFree(on: boolean) {
  if (free === on) return
  free = on
  document.documentElement.style.overflow = on ? 'hidden' : ''
  window.dispatchEvent(new CustomEvent<boolean>(FREE_EVENT, { detail: on }))
}

/**
 * How much of something to show: on the tour things scan in as you reach them; while
 * roaming free everything is on show at once, so you can see where to go.
 */
export const shownWhenFree = (shown: number) => (free ? 1 : shown)

function subscribe(cb: () => void) {
  window.addEventListener(FREE_EVENT, cb)
  return () => window.removeEventListener(FREE_EVENT, cb)
}

export function useFreeMode() {
  return useSyncExternalStore(subscribe, isFree, () => false)
}

const FLIGHT_SECONDS = 1.2
/** How far the camera rises mid-flight, so a jump reads as flying over rather than sliding. */
const FLIGHT_LIFT = 0.35

/**
 * Flies the camera from where it was to where a rig has just put it, in one arc.
 * Call `start` before moving the camera to its new pose, then `apply` after.
 */
export class Flight {
  active = false
  private t = 0
  private from = new Vector3()
  private fromQ = new Quaternion()
  private pos = new Vector3()
  private q = new Quaternion()

  start(from: Vector3, fromQ: Quaternion) {
    this.from.copy(from)
    this.fromQ.copy(fromQ)
    this.t = 0
    this.active = true
  }

  /** Overrides the camera's pose with the flight's; true while still flying. */
  apply(camera: Camera, dt: number) {
    if (!this.active) return false
    this.t = Math.min(1, this.t + dt / FLIGHT_SECONDS)
    const e = this.t * this.t * (3 - 2 * this.t)
    this.pos.lerpVectors(this.from, camera.position, e)
    this.pos.y += Math.sin(Math.PI * e) * FLIGHT_LIFT
    this.q.slerpQuaternions(this.fromQ, camera.quaternion, e)
    camera.position.copy(this.pos)
    camera.quaternion.copy(this.q)
    if (this.t >= 1) this.active = false
    return true
  }
}
