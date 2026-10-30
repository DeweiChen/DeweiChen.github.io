import { experience, type Period } from '@/data/resume'

// Where the Experience timeline sits in the room. Boards stand in a row behind
// a line on the floor; the camera walks along it, one stop per company.
export const LINE_Z = 0.55
export const BOARD_W = 1.0
export const BOARD_H = 0.68
export const BOARD_Y = -0.7
export const BOARD_Z = -0.1
const BOARD_SPACING = 1.45
/** The row sits left of the room's centre, clear of the side-project gallery along the right wall. */
const CENTER_X = -0.8

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
  .map((c, k, all) => ({ ...c, x: CENTER_X - ((all.length - 1) * BOARD_SPACING) / 2 + k * BOARD_SPACING }))

/** Ends of the line: it runs a little past the outer boards, and grows with the number of companies. */
export const LINE_X0 = COMPANIES[0].x - 0.65
export const LINE_X1 = COMPANIES[COMPANIES.length - 1].x + 0.65

export const YEAR0 = Math.floor(COMPANIES[0].start)
export const YEAR1 = Math.floor(Math.max(...COMPANIES.map((c) => c.end))) + 1

// The line is not to scale: each company's start year sits right under its board,
// so walking from board to board is walking from year to year.
const ANCHORS: [number, number][] = [[YEAR0, LINE_X0], ...COMPANIES.map((c): [number, number] => [c.start, c.x]), [YEAR1, LINE_X1]]

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
  if (walk <= 0) return LINE_X0 + (COMPANIES[0].x - LINE_X0) * clamp(walk + 1)
  if (walk >= n - 1) return COMPANIES[n - 1].x + (LINE_X1 - COMPANIES[n - 1].x) * clamp(walk - (n - 1))
  const k = Math.floor(walk)
  return COMPANIES[k].x + (COMPANIES[k + 1].x - COMPANIES[k].x) * (walk - k)
}
