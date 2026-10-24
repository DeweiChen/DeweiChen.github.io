// Shared look of the panels held up by the Reader and painted on the room's objects.

/** Window event with `detail: boolean`, fired when a detail panel opens or closes. */
export const READER_EVENT = 'tour:reader'

/** Window event asking a walk to open the detail panel of one of its stops, e.g. from the keyboard. */
export const OPEN_EVENT = 'tour:open'
export interface OpenDetail {
  id: 'experience' | 'sideProjects'
  /** Stop within the walk, counted from its first station. */
  index: number
}

export const CYAN = '#7fd8f5'
export const TEXT = '#d9dcea'
export const MUTED = '#8d93ab'

export function panelBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, 'rgba(16, 24, 44, 1)')
  g.addColorStop(1, 'rgba(26, 18, 50, 1)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(0, 0, w, h, Math.min(w, h) * 0.05)
  ctx.fill()
  ctx.strokeStyle = 'rgba(150, 190, 255, 0.35)'
  ctx.lineWidth = 4
  ctx.stroke()
}

/** What a reader's `paint` gets to lay out its content with. */
export interface PanelLayout {
  px: number
  py: number
  /** Canvas pixels per CSS pixel once the panel is held up. */
  css: number
  wide: boolean
  pad: number
  /** Lowest y the content may reach; the close hint sits below it. */
  bottom: number
}

/** Share of the viewport height the panel fills when held up, on wide and on portrait screens. */
export interface ReaderFill {
  wide: number
  tall: number
}
