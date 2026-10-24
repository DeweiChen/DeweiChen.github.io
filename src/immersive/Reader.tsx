import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTranslation } from 'react-i18next'
import {
  CanvasTexture,
  LinearMipmapLinearFilter,
  MathUtils,
  Quaternion,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Object3D,
  type PerspectiveCamera,
  type Vector2,
} from 'three'
import { TextPlane } from './TextPlane'
import { panelBackground, READER_EVENT, type PanelLayout, type ReaderFill } from './panel'
import { SANS } from './textCanvas'

const tmp = { from: new Vector3(), to: new Vector3(), fromQ: new Quaternion(), toQ: new Quaternion(), fwd: new Vector3(), scale: new Vector3() }

/**
 * A detail panel pulled out of an object and held up in front of the camera,
 * like a window grabbed in a headset. It flies back into the object on close.
 */
export function Reader<T>({
  item,
  paint,
  deps,
  source,
  sourceHeight,
  fill = { wide: 0.8, tall: 0.8 },
  onClose,
  onPanelClick,
}: {
  item: T | null
  /** Paints `item`; returns total content height in canvas pixels. */
  paint: (ctx: CanvasRenderingContext2D, item: T, layout: PanelLayout) => number | void
  /** When the painted output changes, besides the item and the panel size. */
  deps: unknown[]
  source: () => Object3D | null
  /** Height of the source in its own units, so the panel leaves it at its size. */
  sourceHeight: number
  fill?: ReaderFill
  onClose: () => void
  /** Sees clicks on the panel first, with their uv; return true to keep it open. */
  onPanelClick?: (item: T, uv: Vector2) => boolean
}) {
  const { t } = useTranslation()
  const { camera, size, gl } = useThree()
  const invalidate = useThree((s) => s.invalidate)
  const aspect = size.width / size.height
  const wide = aspect >= 1
  const share = wide ? fill.wide : fill.tall
  // Panel width as a share of the viewport height, then relative to the panel's own height.
  const panelAspect = (wide ? Math.min(1.28, aspect * 0.72) : aspect * 0.72) / share
  // Keep painting the last item while the panel flies back.
  const [shown, setShown] = useState(item)
  if (item && item !== shown) setShown(item)
  const group = useRef<Group>(null)
  const open = useRef(0)

  const px = panelAspect >= 1 ? 2048 : 1280
  const py = Math.round(px / panelAspect)

  // Scroll and gesture tracking
  const scrollTarget = useRef(0)
  const scrollCurrent = useRef(0)
  const maxScroll = useRef(0)
  const pointerStart = useRef({ x: 0, y: 0 })
  const lastY = useRef(0)
  const isPointerDown = useRef(false)
  const hasScrolled = useRef(false)

  const [canvas, texture] = useMemo(() => {
    const cvs = document.createElement('canvas')
    cvs.width = px
    cvs.height = py
    const tex = new CanvasTexture(cvs)
    tex.colorSpace = SRGBColorSpace
    tex.minFilter = LinearMipmapLinearFilter
    tex.anisotropy = gl.capabilities.getMaxAnisotropy()
    return [cvs, tex]
  }, [px, py, gl])

  useEffect(() => () => texture.dispose(), [texture])

  const draw = useCallback(
    (scroll: number) => {
      if (!shown) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, px, py)
      panelBackground(ctx, px, py)

      // Everything is sized in on-screen pixels, so wide and portrait panels read the
      // same however differently their canvases are scaled.
      const css = py / (share * size.height)
      const pad = (wide ? 32 : 18) * css
      const hintSize = 13 * css
      const top = pad + (wide ? 56 : 48) * css
      const bottom = py - pad - hintSize * 1.5

      const contentH = paint(ctx, shown, { px, py, css, wide, pad, top, bottom, scrollY: scroll }) ?? 0
      const viewH = bottom - top
      maxScroll.current = Math.max(0, contentH - viewH)

      ctx.textBaseline = 'alphabetic'
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(141, 147, 171, 0.8)'
      ctx.font = `400 ${hintSize}px ${SANS}`
      ctx.fillText(t('labels.closeDetails'), px - pad, py - pad * 0.6)
      ctx.textAlign = 'left'

      // Sleek scrollbar indicator when content exceeds viewport
      if (maxScroll.current > 0) {
        const trackH = bottom - top
        const thumbRatio = trackH / (trackH + maxScroll.current)
        const thumbH = Math.max(28 * css, trackH * thumbRatio)
        const scrollRatio = maxScroll.current > 0 ? Math.min(1, Math.max(0, scroll / maxScroll.current)) : 0
        const thumbY = top + scrollRatio * (trackH - thumbH)
        const barW = (wide ? 5 : 4) * css
        const barX = px - pad + (wide ? 10 : 6) * css

        ctx.fillStyle = 'rgba(127, 216, 245, 0.45)'
        ctx.beginPath()
        ctx.roundRect(barX, thumbY, barW, thumbH, barW / 2)
        ctx.fill()
      }

      texture.needsUpdate = true
      invalidate()
    },
    [canvas, texture, shown, px, py, share, size.height, wide, paint, t, invalidate],
  )

  // Reset scroll and re-draw when target item or layout dependencies change
  useEffect(() => {
    scrollTarget.current = 0
    scrollCurrent.current = 0
    maxScroll.current = 0
    pointerStart.current = { x: 0, y: 0 }
    isPointerDown.current = false
    hasScrolled.current = false
    draw(0)
    void document.fonts.ready.then(() => draw(0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, draw, ...deps])

  useFrame(({ invalidate: inv }, dt) => {
    const d = Math.min(dt, 0.05)

    // Damped scroll interpolation
    if (Math.abs(scrollTarget.current - scrollCurrent.current) > 0.5) {
      scrollCurrent.current = MathUtils.damp(scrollCurrent.current, scrollTarget.current, 14, d)
      draw(scrollCurrent.current)
      inv()
    } else if (scrollCurrent.current !== scrollTarget.current) {
      scrollCurrent.current = scrollTarget.current
      draw(scrollCurrent.current)
      inv()
    }

    const g = group.current!
    const target = item ? 1 : 0
    if (open.current !== target) {
      if (Math.abs(target - open.current) > 1e-4) {
        open.current = MathUtils.damp(open.current, target, 8, d)
      } else {
        open.current = target
      }
      inv()
    }
    const src = source()
    g.visible = open.current > 0.01 && !!src
    if (!g.visible || !src) return

    const cam = camera as PerspectiveCamera
    const tanHalf = Math.tan((cam.fov * Math.PI) / 360)
    tmp.fwd.set(0, 0, -1).applyQuaternion(cam.quaternion)
    tmp.to.copy(cam.position).addScaledVector(tmp.fwd, 0.5 / (tanHalf * share))
    tmp.toQ.copy(cam.quaternion)
    src.getWorldPosition(tmp.from)
    src.getWorldQuaternion(tmp.fromQ)

    const e = open.current * open.current * (3 - 2 * open.current)
    g.position.lerpVectors(tmp.from, tmp.to, e)
    g.quaternion.slerpQuaternions(tmp.fromQ, tmp.toQ, e)
    const from = sourceHeight * src.getWorldScale(tmp.scale).y
    g.scale.setScalar(from + (1 - from) * e)
  })

  // Lock browser scroll and route wheel events while dialog is open
  useEffect(() => {
    if (!item) return

    const css = py / (share * size.height)
    const origOverflow = document.body.style.overflow
    const origTouchAction = gl.domElement.style.touchAction

    document.body.style.overflow = 'hidden'
    gl.domElement.style.touchAction = 'none'

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (maxScroll.current > 0) {
        scrollTarget.current = Math.max(0, Math.min(maxScroll.current, scrollTarget.current + e.deltaY * css))
        invalidate()
      }
    }

    const onWindowPointerUp = () => {
      isPointerDown.current = false
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('pointerup', onWindowPointerUp)
    window.addEventListener('pointercancel', onWindowPointerUp)

    return () => {
      document.body.style.overflow = origOverflow
      gl.domElement.style.touchAction = origTouchAction
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('pointerup', onWindowPointerUp)
      window.removeEventListener('pointercancel', onWindowPointerUp)
    }
  }, [item, py, share, size.height, gl, invalidate])

  // The DOM HUD steps aside while a panel is held up.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(READER_EVENT, { detail: !!item }))
  }, [item])
  useEffect(() => () => void window.dispatchEvent(new CustomEvent(READER_EVENT, { detail: false })), [])

  useEffect(() => {
    if (!item) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  const css = py / (share * size.height)

  return (
    <group ref={group} visible={false}>
      <TextPlane
        map={texture}
        width={panelAspect}
        height={1}
        depthTest={false}
        renderOrder={10}
        reveal={() => open.current}
        onPointerDown={(e) => {
          pointerStart.current = { x: e.clientX, y: e.clientY }
          lastY.current = e.clientY
          isPointerDown.current = true
          hasScrolled.current = false
        }}
        onPointerMove={(e) => {
          if (!isPointerDown.current) return
          const dy = e.clientY - lastY.current
          lastY.current = e.clientY
          const totalDist = Math.hypot(e.clientX - pointerStart.current.x, e.clientY - pointerStart.current.y)
          if (totalDist > 8) {
            hasScrolled.current = true
          }
          if (hasScrolled.current && maxScroll.current > 0) {
            scrollTarget.current = Math.max(0, Math.min(maxScroll.current, scrollTarget.current - dy * css))
            invalidate()
          }
        }}
        onPointerUp={() => {
          isPointerDown.current = false
        }}
        onClick={(e) => {
          e.stopPropagation()
          const totalDist = Math.hypot(e.clientX - pointerStart.current.x, e.clientY - pointerStart.current.y)
          // Treat movements >= 12px or confirmed scrolls as swipe gestures, suppressing tap-to-close
          if (totalDist >= 12 || hasScrolled.current) {
            hasScrolled.current = false
            return
          }
          if (item && e.uv && onPanelClick?.(item, e.uv)) return
          onClose()
        }}
        onPointerMissed={() => {
          if (hasScrolled.current) {
            hasScrolled.current = false
            return
          }
          if (item) onClose()
        }}
      />
    </group>
  )
}
