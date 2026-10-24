import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTranslation } from 'react-i18next'
import { MathUtils, Quaternion, Vector3, type Group, type Object3D, type PerspectiveCamera, type Vector2 } from 'three'
import { TextPlane } from './TextPlane'
import { panelBackground, READER_EVENT, type PanelLayout, type ReaderFill } from './panel'
import { SANS, useCanvasTexture } from './textCanvas'

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
  /** Paints `item`; the panel background and the close hint are drawn around it. */
  paint: (ctx: CanvasRenderingContext2D, item: T, layout: PanelLayout) => void
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
  const { camera, size } = useThree()
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
  const map = useCanvasTexture(
    px,
    py,
    (ctx) => {
      if (!shown) return
      panelBackground(ctx, px, py)
      // Everything is sized in on-screen pixels, so wide and portrait panels read the
      // same however differently their canvases are scaled.
      const css = py / (share * size.height)
      const pad = (wide ? 32 : 18) * css
      const hintSize = 13 * css
      paint(ctx, shown, { px, py, css, wide, pad, bottom: py - pad - hintSize * 1.5 })

      ctx.textBaseline = 'alphabetic'
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(141, 147, 171, 0.8)'
      ctx.font = `400 ${hintSize}px ${SANS}`
      ctx.fillText(t('labels.closeDetails'), px - pad, py - pad * 0.6)
      ctx.textAlign = 'left'
    },
    [shown, px, py, share, wide, size.height, t, ...deps],
  )

  useFrame(({ invalidate }, dt) => {
    const g = group.current!
    const target = item ? 1 : 0
    if (open.current !== target) {
      if (Math.abs(target - open.current) > 1e-4) {
        open.current = MathUtils.damp(open.current, target, 8, Math.min(dt, 0.05))
      } else {
        open.current = target
      }
      invalidate()
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

  return (
    <group ref={group} visible={false}>
      <TextPlane
        map={map}
        width={panelAspect}
        height={1}
        depthTest={false}
        renderOrder={10}
        reveal={() => open.current}
        onClick={(e) => {
          e.stopPropagation()
          if (item && e.uv && onPanelClick?.(item, e.uv)) return
          onClose()
        }}
        onPointerMissed={() => item && onClose()}
      />
    </group>
  )
}
