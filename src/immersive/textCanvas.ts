import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'

/**
 * 3D text is painted onto canvases with the page's own fonts (Geist plus the
 * system CJK face), so Chinese needs no extra font download and matches the DOM.
 */
export const SANS = '"Geist Variable", "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", "Heiti TC", sans-serif'

export interface Run {
  text: string
  font: string
  color: string
}

interface Piece extends Run {
  x: number
}

// CJK characters can break anywhere; Latin words break on spaces.
const TOKEN = /[　-〿㐀-鿿＀-￯]|[^\s　-〿㐀-鿿＀-￯]+\s*|\s+/g
// Closing punctuation that must not start a line.
const NO_LINE_START = /^[，。、；：！？）」』,.;:!?)]/

/** Greedy line wrapping over runs of mixed styles. Returns pieces positioned per line. */
export function wrapRuns(ctx: CanvasRenderingContext2D, runs: Run[], maxWidth: number) {
  const lines: Piece[][] = [[]]
  let x = 0
  for (const run of runs) {
    ctx.font = run.font
    for (const token of run.text.match(TOKEN) ?? []) {
      const w = ctx.measureText(token).width
      const line = lines[lines.length - 1]
      if (x + w > maxWidth && x > 0 && !NO_LINE_START.test(token)) {
        if (/^\s+$/.test(token)) continue
        lines.push([{ ...run, text: token, x: 0 }])
        x = w
        continue
      }
      const last = line[line.length - 1]
      if (last && last.font === run.font && last.color === run.color) last.text += token
      else line.push({ ...run, text: token, x })
      x += w
    }
  }
  return lines
}

export function drawLines(ctx: CanvasRenderingContext2D, lines: Piece[][], left: number, top: number, lineHeight: number) {
  ctx.textBaseline = 'top'
  lines.forEach((line, i) => {
    for (const p of line) {
      ctx.font = p.font
      ctx.fillStyle = p.color
      ctx.fillText(p.text, left + p.x, top + i * lineHeight)
    }
  })
  return top + lines.length * lineHeight
}

/**
 * A canvas texture redrawn whenever `deps` change and once more after web fonts
 * finish loading (the first paint may fall back to a system face).
 */
export function useCanvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, deps: unknown[]) {
  const gl = useThree((s) => s.gl)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const t = new CanvasTexture(canvas)
    t.colorSpace = SRGBColorSpace
    t.minFilter = LinearMipmapLinearFilter
    t.anisotropy = gl.capabilities.getMaxAnisotropy()
    return t
  }, [width, height, gl])

  useEffect(() => {
    let alive = true
    const paint = () => {
      if (!alive) return
      const canvas = texture.image as HTMLCanvasElement
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      draw(ctx)
      texture.needsUpdate = true
    }
    paint()
    void document.fonts.ready.then(paint)
    return () => {
      alive = false
    }
    // `draw` is rebuilt every render; `deps` says when its output actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texture, ...deps])

  useEffect(() => () => texture.dispose(), [texture])

  return texture
}
