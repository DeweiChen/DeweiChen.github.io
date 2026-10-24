import { experience, type Period } from '@/data/resume'

// Where the Experience timeline sits in the room. Boards stand in a row behind
// a line on the floor; the camera walks along it, one stop per company.
export const LINE_Z = 0.55
export const BOARD_W = 1.0
export const BOARD_H = 0.68
export const BOARD_Y = -0.7
export const BOARD_Z = -0.05
const BOARD_SPACING = 1.2

function yearOf(date: string) {
  const [y, m] = date.split('-').map(Number)
  return y + ((m || 1) - 1) / 12
}

function spanOf(periods: Period[]) {
  const now = new Date()
  const nowYear = now.getFullYear() + now.getMonth() / 12
  return {
    start: Math.min(...periods.map((p) => yearOf(p.start))),
    end: Math.max(...periods.map((p) => (p.end ? yearOf(p.end) : p.end === null ? nowYear : yearOf(p.start)))),
  }
}

/** Companies oldest first. `index` points into resume `experience` (newest first). */
export const COMPANIES = experience
  .map((c, index) => ({ index, ...spanOf(c.roles.map((r) => r.period)) }))
  .reverse()
  .map((c, k, all) => ({ ...c, x: -((all.length - 1) * BOARD_SPACING) / 2 + k * BOARD_SPACING }))

/** Half the line's length: it runs a little past the outer boards, and grows with the number of companies. */
export const LINE_X = Math.max(3.0, ((COMPANIES.length - 1) * BOARD_SPACING) / 2 + 0.6)

export const YEAR0 = Math.floor(COMPANIES[0].start)
export const YEAR1 = Math.floor(Math.max(...COMPANIES.map((c) => c.end))) + 1

// The line is not to scale: each company's start year sits right under its board,
// so walking from board to board is walking from year to year.
const ANCHORS: [number, number][] = [[YEAR0, -LINE_X], ...COMPANIES.map((c): [number, number] => [c.start, c.x]), [YEAR1, LINE_X]]

function piecewise(v: number, from: 0 | 1) {
  const to = 1 - from
  if (v <= ANCHORS[0][from]) return ANCHORS[0][to]
  for (let i = 1; i < ANCHORS.length; i++) {
    const a = ANCHORS[i - 1]
    const b = ANCHORS[i]
    if (v <= b[from]) return a[to] + ((v - a[from]) / (b[from] - a[from] || 1)) * (b[to] - a[to])
  }
  return ANCHORS[ANCHORS.length - 1][to]
}

export const xOfYear = (year: number) => piecewise(year, 0)
export const yearOfX = (x: number) => piecewise(x, 1)

/**
 * Where the walk has reached along the line, given the position relative to
 * the first company stop (0 = first board, n - 1 = last; outside that range
 * the head runs in from the line's start or out to its end).
 */
export function headX(walk: number) {
  const n = COMPANIES.length
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  if (walk <= 0) return -LINE_X + (COMPANIES[0].x + LINE_X) * clamp(walk + 1)
  if (walk >= n - 1) return COMPANIES[n - 1].x + (LINE_X - COMPANIES[n - 1].x) * clamp(walk - (n - 1))
  const k = Math.floor(walk)
  return COMPANIES[k].x + (COMPANIES[k + 1].x - COMPANIES[k].x) * (walk - k)
}
