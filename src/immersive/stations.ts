import type { TFunction } from 'i18next'
import { isFree } from './freeMode'
import { CERTS, DOOR, FRONT_Z, GALLERY } from './roomLayout'
import { BOARD_Z, COMPANIES } from './timelineLayout'

type Vec3 = [number, number, number]

export interface Station {
  id: 'hero' | 'about' | 'bookshelf' | 'experience' | 'sideProjects' | 'education' | 'contact'
  /** Where the camera stands and what it looks at, in room coordinates (see roomLayout). */
  pos: Vec3
  target: Vec3
  /** Scroll distance to the next station, in viewport heights. */
  span: number
  /** Size (w, h) of what the station shows; the camera backs off until it fits the viewport. */
  fit: [number, number]
  /** Position on the HUD floor plan: x and z in room units. */
  map: [number, number]
  /** A point the camera passes through on the way to the next station, to keep it off the walls. */
  via?: { pos: Vec3; target: Vec3 }
}

/**
 * The camera's tour of the room: a stop per resume section, or several for a
 * section that is walked through (Experience has one per company). The hero stop
 * must stay at the canvas' default camera so the 2D <-> 3D morph lines up.
 */
export const STATIONS: Station[] = [
  // Longer first leg: the name dissolves, the room is scanned, then we walk in.
  { id: 'hero', pos: [0, 0, 6], target: [0, 0, -4], span: 2, fit: [0, 0], map: [0, FRONT_Z + 0.5] },
  // Picture frame above the sofa.
  { id: 'about', pos: [-1.25, 0.62, -1.5], target: [-1.4, 0.72, -4], span: 1.2, fit: [2.1, 1.45], map: [-1.4, -3.6] },
  // Bookshelf on the right wall.
  { id: 'bookshelf', pos: [-0.2, 0.25, -1.1], target: [2.7, 0.2, -1.6], span: 1.2, fit: [2.2, 2.5], map: [2.9, -1.6] },
  // Experience: a walk along the floor timeline, one stop in front of each company's board.
  ...COMPANIES.map(
    (c, k): Station => ({
      id: 'experience',
      // Stand a little behind in time (to the left) so the line runs off into the future.
      pos: [c.x - 0.65, -0.2, 2.4],
      target: [c.x + 0.05, -1.0, BOARD_Z + 0.2],
      span: k === COMPANIES.length - 1 ? 1.2 : 1,
      fit: [1.15, 1.7],
      map: [c.x, 0.3],
    }),
  ),
  // Side projects: a walk along the front of the right wall, one stop in front of each exhibit.
  ...GALLERY.zs.map(
    (z, k): Station => ({
      id: 'sideProjects',
      pos: [GALLERY.wallX - 3.1, -0.1, z],
      target: [GALLERY.wallX, -0.4, z],
      span: k === GALLERY.zs.length - 1 ? 1.2 : 1,
      fit: [1.45, 2.15],
      map: [GALLERY.wallX - 0.3, z],
    }),
  ),
  // Certificates on the right wall, lit by the lamp.
  { id: 'education', pos: [0.9, 0.3, -2.75], target: [CERTS.x, 0.29, CERTS.z], span: 1.2, fit: [0.95, 1.4], map: [2.9, CERTS.z] },
  // Left wall: the contact panel and the door out.
  { id: 'contact', pos: [0.3, -0.1, -1.3], target: [DOOR.x, -0.45, -1.47], span: 1, fit: [2.35, 2.2], map: [-3.0, -1.47] },
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

/** 1 while parked at station `index`, falling to 0 halfway to its neighbours. */
export function stationPresence(screens: number, index: number) {
  return Math.max(0, 1 - Math.abs(tourPosition(screens) - index) * 2)
}

/** Index of the station nearest to a scroll offset, for the HUD. */
export function nearestStation(screens: number) {
  return Math.round(tourPosition(screens))
}

export function stationLabel(id: Station['id'], t: TFunction) {
  return id === 'hero' ? t('profile.nickname') : t(`labels.${id}`)
}

/** Consecutive stations with the same id form one section of the HUD. */
export const SECTIONS = STATIONS.reduce<{ id: Station['id']; first: number; last: number }[]>((acc, s, i) => {
  const prev = acc[acc.length - 1]
  if (prev?.id === s.id) prev.last = i
  else acc.push({ id: s.id, first: i, last: i })
  return acc
}, [])

export function sectionOf(stationIndex: number) {
  return SECTIONS.findIndex((s) => stationIndex >= s.first && stationIndex <= s.last)
}

export const EXPERIENCE = SECTIONS.find((s) => s.id === 'experience')!
export const SIDE_PROJECTS = SECTIONS.find((s) => s.id === 'sideProjects')!

/**
 * Scrolls the page to station `i`: a neighbour is walked to, anything further is jumped
 * to at once and the camera flies straight there (see useScrollProgress and CameraRig).
 * While roaming free every station is jumped to, and FreeRig flies there.
 */
export function goToStation(i: number) {
  const index = Math.min(STATIONS.length - 1, Math.max(0, i))
  const far = isFree() || Math.abs(index - tourPosition(scrollY / innerHeight)) > 1.2
  window.scrollTo({ top: STATION_AT[index] * innerHeight, behavior: far ? 'instant' : 'smooth' })
}
