import { CatmullRomCurve3, Vector3, type PerspectiveCamera } from 'three'
import { LIVING } from './roomLayout'
import { STATIONS } from './stations'

const toVec = ([x, y, z]: [number, number, number]) => new Vector3(x, y, z)
// The path runs through every station and any waypoints between them. POINT_AT maps a
// station to its point on the path, so (fractional) station indices map onto path params.
const POINTS = STATIONS.flatMap((s) => [s, ...(s.via ? [s.via] : [])])
const POINT_AT = STATIONS.reduce<number[]>((acc, _, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + (STATIONS[i - 1].via ? 2 : 1))
  return acc
}, [])
const POS_PATH = new CatmullRomCurve3(POINTS.map((s) => toVec(s.pos)))
const TARGET_PATH = new CatmullRomCurve3(POINTS.map((s) => toVec(s.target)))

function pathParam(at: number) {
  const i = Math.min(STATIONS.length - 2, Math.floor(at))
  const p = POINT_AT[i] + (POINT_AT[i + 1] - POINT_AT[i]) * (at - i)
  return p / (POINTS.length - 1)
}

const back = new Vector3()

/**
 * Where the camera stands and looks at `at` (a fractional station index) on the tour.
 * It backs off along the view direction until the station's subject fits the viewport
 * (mostly matters on portrait phones), but never through the room's walls.
 */
export function railPose(at: number, camera: PerspectiveCamera, aspect: number, pos: Vector3, target: Vector3) {
  const u = pathParam(at)
  POS_PATH.getPoint(u, pos)
  TARGET_PATH.getPoint(u, target)

  back.subVectors(pos, target)
  const dist = back.length()
  back.normalize()

  const i = Math.min(STATIONS.length - 2, Math.floor(at))
  const f = at - i
  const [w0, h0] = STATIONS[i].fit
  const [w1, h1] = STATIONS[i + 1].fit
  const tanHalf = Math.tan((camera.fov * Math.PI) / 360)
  const needed = 1.1 * Math.max((h0 + (h1 - h0) * f) / 2 / tanHalf, (w0 + (w1 - w0) * f) / 2 / (tanHalf * aspect))
  if (needed > dist) {
    pos.addScaledVector(back, needed - dist)
    pos.x = Math.min(LIVING.x1 - 0.2, Math.max(LIVING.x0 + 0.2, pos.x))
  }
}
