import { BoxGeometry, BufferAttribute, BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** Axis-aligned box in world units. `tone` 0 = shell (walls/floor), 1 = furniture. */
interface Box {
  pos: [number, number, number]
  size: [number, number, number]
  tone: 0 | 1
  /** Small props dropped on low-end devices. */
  detail?: boolean
}

export const FLOOR_Y = -1.6
export const CEILING_Y = 1.9

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

const W = 6.4
const D = 6
const ZC = -1 // room depth centre
const H = CEILING_Y - FLOOR_Y
const WALL_Y = (CEILING_Y + FLOOR_Y) / 2

/** Picture frame above the sofa, facing +z. */
export const FRAME = { center: [-1.4, 0.72, -3.96] as Box['pos'], size: [1.95, 1.3] as [number, number] }

/** Bookshelf against the right wall, open towards -x. `boards` are shelf heights, bottom to top. */
export const SHELF = { x: 2.95, depth: 0.45, z0: -2.6, z1: -0.6, boards: [-1.58, -1.0, -0.2, 0.6, 1.38], board: 0.04 }

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
  // Shell
  box([0, FLOOR_Y, ZC], [W, 0.04, D], 0),
  box([0, CEILING_Y, ZC], [W, 0.04, D], 0),
  box([0, WALL_Y, ZC - D / 2], [W, H, 0.04], 0),
  box([-W / 2, WALL_Y, ZC], [0.04, H, D], 0),
  box([W / 2, WALL_Y, ZC], [0.04, H, D], 0),

  // Window on the back wall
  box([1.5, 1.15, -3.95], [1.7, 0.06, 0.08]),
  box([1.5, -0.3, -3.95], [1.7, 0.06, 0.08]),
  box([0.65, 0.425, -3.95], [0.06, 1.5, 0.08]),
  box([2.35, 0.425, -3.95], [0.06, 1.5, 0.08]),
  box([1.5, 0.425, -3.95], [0.04, 1.5, 0.06], 1, true),

  // Sofa
  box([-1.4, -1.36, -3.4], [2.2, 0.44, 0.9]),
  box([-1.4, -0.86, -3.78], [2.2, 0.6, 0.18]),
  box([-2.55, -1.18, -3.4], [0.18, 0.5, 0.9]),
  box([-0.25, -1.18, -3.4], [0.18, 0.5, 0.9]),

  // Coffee table + rug
  box([-1.3, -1.22, -2.2], [1.3, 0.06, 0.65]),
  box([-1.88, -1.41, -2.45], [0.05, 0.34, 0.05], 1, true),
  box([-0.72, -1.41, -2.45], [0.05, 0.34, 0.05], 1, true),
  box([-1.88, -1.41, -1.95], [0.05, 0.34, 0.05], 1, true),
  box([-0.72, -1.41, -1.95], [0.05, 0.34, 0.05], 1, true),
  box([-1.3, -1.575, -2.5], [2.8, 0.01, 1.9], 1, true),

  // Bookshelf against the right wall: three two-bay compartments for the skill groups
  ...bookshelf(),

  // Floor lamp
  box([2.3, -1.56, -3.4], [0.36, 0.04, 0.36], 1, true),
  box([2.3, -0.6, -3.4], [0.04, 1.9, 0.04]),
  box([2.3, 0.5, -3.4], [0.46, 0.36, 0.46]),

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
