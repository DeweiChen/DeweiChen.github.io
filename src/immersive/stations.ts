import type { Resume } from '@/data/resume'

type Vec3 = [number, number, number]

export interface Station {
  id: 'hero' | 'about' | 'skills' | 'experience' | 'sideProjects' | 'education' | 'contact'
  /** Where the camera stands and what it looks at, in room coordinates (see roomLayout). */
  pos: Vec3
  target: Vec3
  /** Scroll distance to the next station, in viewport heights. */
  span: number
  /** Position on the HUD floor plan: x and z in room units. */
  map: [number, number]
}

/**
 * The camera's tour of the room, one stop per resume section. The hero stop
 * must stay at the canvas' default camera so the 2D <-> 3D morph lines up.
 */
export const STATIONS: Station[] = [
  // Longer first leg: the name dissolves, the room is scanned, then we walk in.
  { id: 'hero', pos: [0, 0, 6], target: [0, 0, -4], span: 2, map: [0, 2.6] },
  // Picture frame above the sofa.
  { id: 'about', pos: [-1.0, 0.45, -0.4], target: [-1.4, 0.7, -4], span: 1.2, map: [-1.4, -3.6] },
  // Bookshelf on the right wall.
  { id: 'skills', pos: [-1.2, 0.2, -0.6], target: [3, -0.1, -1.6], span: 1.2, map: [2.9, -1.5] },
  // Timeline running along the floor.
  { id: 'experience', pos: [0, 0.9, 1.6], target: [0, -1.4, -2.4], span: 1.2, map: [0, -0.5] },
  // Coffee table.
  { id: 'sideProjects', pos: [0.1, 0.3, 0.1], target: [-1.3, -1.25, -2.2], span: 1.2, map: [-1.3, -2.2] },
  // Floor lamp corner.
  { id: 'education', pos: [-0.2, 0.3, -0.5], target: [2.3, -0.1, -3.8], span: 1.2, map: [2.3, -3.4] },
  // Left wall, where the door will go.
  { id: 'contact', pos: [-0.6, 0.0, -0.6], target: [-3.2, -0.4, -1.0], span: 1, map: [-3.0, -1.0] },
]

/** Scroll offset (in viewport heights) at which each station is reached. */
export const STATION_AT = STATIONS.reduce<number[]>((acc, _, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + STATIONS[i - 1].span)
  return acc
}, [])

/** Total scrollable length in viewport heights; the last station sits at the very bottom. */
export const TOUR_LENGTH = STATION_AT[STATIONS.length - 1]

/**
 * Maps a scroll offset (viewport heights) to a fractional station index,
 * easing each leg so the camera lingers at every stop.
 */
export function tourPosition(screens: number) {
  const s = Math.min(Math.max(screens, 0), TOUR_LENGTH)
  let i = 0
  while (i < STATIONS.length - 2 && s >= STATION_AT[i + 1]) i++
  const f = (s - STATION_AT[i]) / STATIONS[i].span
  // Hold for the first and last 20% of each leg.
  const m = Math.min(1, Math.max(0, (f - 0.2) / 0.6))
  return i + m * m * (3 - 2 * m)
}

/** Index of the station nearest to a scroll offset, for the HUD. */
export function nearestStation(screens: number) {
  return Math.round(tourPosition(screens))
}

export function stationLabel(id: Station['id'], t: Resume) {
  return id === 'hero' ? t.name : t.labels[id]
}
