import { BoxGeometry, BufferAttribute, BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { sideProjects } from '@/data/resume'
import { LINE_X0, LINE_X1 } from './timelineLayout'

/** Axis-aligned box in world units. `tone` 0 = shell (walls/floor), 1 = furniture. */
interface Box {
  pos: [number, number, number]
  size: [number, number, number]
  tone: 0 | 1
  /** Small props dropped on low-end devices. */
  detail?: boolean
}

export const FLOOR_Y = -1.6
export const CEILING_Y = 2.35

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * World height of the scan plane: solid below, wireframe above. It sweeps on the
 * first leg of the tour, while the camera walks in from the hero stop.
 */
export function scanHeight(screens: number) {
  return FLOOR_Y - 0.05 + smoothstep(0.7, 1.5, screens) * (CEILING_Y - FLOOR_Y + 0.8)
}

// A single rectangular room: living area at the back, the Experience timeline across
// the middle, and the side-project gallery along the front half of the right wall.
const W = Math.max(8.4, (Math.max(-LINE_X0, LINE_X1) + 0.9) * 2)
export const BACK_Z = -5.2
const H = CEILING_Y - FLOOR_Y
const WALL_Y = (CEILING_Y + FLOOR_Y) / 2

/** Side-project gallery: one exhibit per project along the front of the right wall, facing -x. */
const GALLERY_SPACING = 1.8
const GALLERY_Z0 = 1.5
export const GALLERY = {
  /** Right wall of the room, which the wall labels hang on. */
  wallX: W / 2,
  caseX: W / 2 - 0.7,
  zs: sideProjects.map((_, i) => GALLERY_Z0 + i * GALLERY_SPACING),
}

export const FRONT_Z = Math.max(3.2, (GALLERY.zs[GALLERY.zs.length - 1] ?? GALLERY_Z0) + 1.2)
/** Default camera distance for the hero stop, always clear of the room's front edge as the gallery grows. */
export const HERO_Z = Math.max(7.5, FRONT_Z + 2.4)

export const LIVING = { x0: -W / 2, x1: W / 2, z0: BACK_Z, z1: FRONT_Z }

/** Outline of the floor (x, z), for the HUD's floor plan. */
export const OUTLINE: [number, number][] = [
  [-W / 2, BACK_Z],
  [W / 2, BACK_Z],
  [W / 2, FRONT_Z],
  [-W / 2, FRONT_Z],
]

/** Door in the left wall, between z0 and z1 and hinged at z0. It leads back to the classic page. */
export const DOOR = { x: -W / 2, z0: -3.3, z1: -2.4, top: FLOOR_Y + 2.05 }

/** Floor lamp in the back right corner. */
export const LAMP = { x: W / 2 - 0.52, z: BACK_Z + 0.36, shadeY: 0.55, shade: 0.4 }

/** Framed certificates on the right wall beside the lamp, facing -x; one per degree, top to bottom. */
export const CERTS = { x: W / 2 - 0.035, z: BACK_Z + 1.05, size: [0.8, 0.56] as [number, number], ys: [0.68, -0.02] }

/** Picture frame above the sofa, facing +z. */
export const FRAME = { center: [-1.75, 0.78, BACK_Z + 0.04] as Box['pos'], size: [2.05, 1.36] as [number, number] }

/** Bookshelf against the right wall, open towards -x. `boards` are shelf heights, bottom to top. */
export const SHELF = { x: W / 2 - 0.25, depth: 0.45, z0: -3.2, z1: -1.0, boards: [-1.58, -0.98, -0.15, 0.68, 1.5], board: 0.04 }

function bookshelf(): Box[] {
  const { x, depth, z0, z1, boards, board } = SHELF
  const w = z1 - z0
  const zc = (z0 + z1) / 2
  const bottom = boards[0] - board / 2
  const top = boards[boards.length - 1] + board / 2
  const h = top - bottom
  const parts: Box[] = [
    box([x, bottom + h / 2, z0], [depth, h, 0.04]),
    box([x, bottom + h / 2, z1], [depth, h, 0.04]),
    ...boards.map((y) => box([x, y, zc], [depth, board, w])),
  ]
  // Centre divider through the upper three compartments.
  const dividerBottom = boards[1] + board / 2
  const dividerTop = boards[4] - board / 2
  parts.push(box([x, (dividerBottom + dividerTop) / 2, zc], [depth, dividerTop - dividerBottom, 0.03], 1, true))
  return parts
}

function box(pos: Box['pos'], size: Box['size'], tone: Box['tone'] = 1, detail = false): Box {
  return { pos, size, tone, detail }
}

/** A living room built from boxes: open towards the camera so it reads like a cut-away scan. */
const ROOM: Box[] = [
  // Room shell
  box([0, FLOOR_Y, (BACK_Z + FRONT_Z) / 2], [W, 0.04, FRONT_Z - BACK_Z], 0),
  box([0, CEILING_Y, (BACK_Z + FRONT_Z) / 2], [W, 0.04, FRONT_Z - BACK_Z], 0),
  box([0, WALL_Y, BACK_Z], [W, H, 0.04], 0),
  box([W / 2, WALL_Y, (BACK_Z + FRONT_Z) / 2], [0.04, H, FRONT_Z - BACK_Z], 0),
  // Left wall, around the door opening
  box([-W / 2, WALL_Y, (BACK_Z + DOOR.z0) / 2], [0.04, H, DOOR.z0 - BACK_Z], 0),
  box([-W / 2, WALL_Y, (DOOR.z1 + FRONT_Z) / 2], [0.04, H, FRONT_Z - DOOR.z1], 0),
  box([-W / 2, (DOOR.top + CEILING_Y) / 2, (DOOR.z0 + DOOR.z1) / 2], [0.04, CEILING_Y - DOOR.top, DOOR.z1 - DOOR.z0], 0),

  // Window on the back wall
  box([1.85, 1.22, BACK_Z + 0.05], [1.8, 0.06, 0.08]),
  box([1.85, -0.28, BACK_Z + 0.05], [1.8, 0.06, 0.08]),
  box([0.95, 0.47, BACK_Z + 0.05], [0.06, 1.56, 0.08]),
  box([2.75, 0.47, BACK_Z + 0.05], [0.06, 1.56, 0.08]),
  box([1.85, 0.47, BACK_Z + 0.05], [0.04, 1.56, 0.06], 1, true),

  // Sofa
  box([-1.75, -1.36, BACK_Z + 0.6], [2.3, 0.44, 0.92]),
  box([-1.75, -0.86, BACK_Z + 0.22], [2.3, 0.6, 0.18]),
  box([-2.95, -1.18, BACK_Z + 0.6], [0.18, 0.5, 0.92]),
  box([-0.55, -1.18, BACK_Z + 0.6], [0.18, 0.5, 0.92]),

  // Coffee table + rug
  box([-1.65, -1.22, BACK_Z + 1.85], [1.35, 0.06, 0.68]),
  box([-2.25, -1.41, BACK_Z + 1.58], [0.05, 0.34, 0.05], 1, true),
  box([-1.05, -1.41, BACK_Z + 1.58], [0.05, 0.34, 0.05], 1, true),
  box([-2.25, -1.41, BACK_Z + 2.12], [0.05, 0.34, 0.05], 1, true),
  box([-1.05, -1.41, BACK_Z + 2.12], [0.05, 0.34, 0.05], 1, true),
  box([-1.65, -1.575, BACK_Z + 1.55], [3.0, 0.01, 2.05], 1, true),

  // Bookshelf against the right wall: three two-bay compartments for the skill groups
  ...bookshelf(),

  // Door casing
  box([DOOR.x + 0.03, (FLOOR_Y + DOOR.top) / 2, DOOR.z0 - 0.03], [0.06, DOOR.top - FLOOR_Y, 0.06]),
  box([DOOR.x + 0.03, (FLOOR_Y + DOOR.top) / 2, DOOR.z1 + 0.03], [0.06, DOOR.top - FLOOR_Y, 0.06]),
  box([DOOR.x + 0.03, DOOR.top + 0.03, (DOOR.z0 + DOOR.z1) / 2], [0.06, 0.06, DOOR.z1 - DOOR.z0 + 0.12]),

  // Floor lamp
  box([LAMP.x, -1.56, LAMP.z], [0.32, 0.04, 0.32], 1, true),
  box([LAMP.x, (FLOOR_Y + LAMP.shadeY) / 2, LAMP.z], [0.04, LAMP.shadeY - FLOOR_Y, 0.04]),
  box([LAMP.x, LAMP.shadeY, LAMP.z], [LAMP.shade, 0.34, LAMP.shade]),

  // Certificate frames beside the lamp
  ...CERTS.ys.map((y) => box([CERTS.x - 0.005, y, CERTS.z], [0.03, CERTS.size[1] + 0.07, CERTS.size[0] + 0.07])),

  // Picture frame above the sofa; the About text is painted on it
  box(FRAME.center, [FRAME.size[0], FRAME.size[1], 0.04]),
]

function layout(lowEnd: boolean) {
  return lowEnd ? ROOM.filter((b) => !b.detail) : ROOM
}

/** All boxes merged into one geometry with an `aTone` attribute, so the room is a single draw call. */
export function buildRoomGeometry(lowEnd: boolean) {
  const parts = layout(lowEnd).map((b) => {
    const g = new BoxGeometry(...b.size)
    g.translate(...b.pos)
    g.deleteAttribute('uv')
    g.setAttribute('aTone', new BufferAttribute(new Float32Array(g.attributes.position.count).fill(b.tone), 1))
    return g
  })
  const merged = mergeGeometries(parts)!
  parts.forEach((g) => g.dispose())
  return merged
}

/** The 12 edges of every box as [ax, ay, az, bx, by, bz] segments. */
function edgesOf(boxes: Box[]) {
  const segs: number[] = []
  for (const { pos, size } of boxes) {
    const h = size.map((s) => s / 2)
    const c = (sx: number, sy: number, sz: number) => [pos[0] + sx * h[0], pos[1] + sy * h[1], pos[2] + sz * h[2]]
    for (const a of [-1, 1]) {
      for (const b of [-1, 1]) {
        segs.push(...c(-1, a, b), ...c(1, a, b))
        segs.push(...c(a, -1, b), ...c(a, 1, b))
        segs.push(...c(a, b, -1), ...c(a, b, 1))
      }
    }
  }
  return new Float32Array(segs)
}

export function buildRoomEdges(lowEnd: boolean) {
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(edgesOf(layout(lowEnd)), 3))
  return geo
}

/** `count` points spread along the room's edges, weighted by edge length, so the point cloud traces the wireframe. */
export function sampleEdges(count: number, lowEnd: boolean) {
  const segs = edgesOf(layout(lowEnd))
  const n = segs.length / 6
  const cumulative = new Float32Array(n)
  let total = 0
  for (let i = 0; i < n; i++) {
    const o = i * 6
    total += Math.hypot(segs[o + 3] - segs[o], segs[o + 4] - segs[o + 1], segs[o + 5] - segs[o + 2])
    cumulative[i] = total
  }

  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const r = Math.random() * total
    let lo = 0
    let hi = n - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cumulative[mid] < r) lo = mid + 1
      else hi = mid
    }
    const o = lo * 6
    const t = Math.random()
    for (let c = 0; c < 3; c++) out[i * 3 + c] = segs[o + c] + (segs[o + 3 + c] - segs[o + c]) * t
  }
  return out
}
