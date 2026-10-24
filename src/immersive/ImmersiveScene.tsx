import { useEffect, useRef, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, Vector2, Vector3, type PerspectiveCamera } from 'three'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { TourOverlay } from './TourOverlay'
import { AboutFrame } from './AboutFrame'
import { Bookshelf } from './Bookshelf'
import { Room } from './Room'
import { SplatPortrait, type PixelRect } from './SplatPortrait'
import { STATIONS, tourPosition } from './stations'
import { useScrollProgress, type ScrollProgress } from './useScrollProgress'

export interface ImmersiveSceneProps {
  cardRect: PixelRect | null
  /** 'in' while arriving or settled, 'out' while collapsing back to the 2D card. */
  direction: 'in' | 'out'
  lowEnd: boolean
  onMorphDone?: (target: 0 | 1) => void
}

const toVec = ([x, y, z]: [number, number, number]) => new Vector3(x, y, z)
const POS_PATH = new CatmullRomCurve3(STATIONS.map((s) => toVec(s.pos)))
const TARGET_PATH = new CatmullRomCurve3(STATIONS.map((s) => toVec(s.target)))
// Scratch vectors for the rig; there is only ever one camera.
const tmp = { pos: new Vector3(), target: new Vector3(), back: new Vector3(), right: new Vector3() }

/**
 * Walks the camera from station to station as the page scrolls. At the top it
 * sits exactly at the hero station (the canvas default) so the card <-> particle
 * morph lines up with the DOM; head-sway fades in after.
 */
function CameraRig({ progress }: { progress: RefObject<ScrollProgress> }) {
  const pointer = useRef(new Vector2())
  const sway = useRef(new Vector2())

  useEffect(() => {
    const move = (e: PointerEvent) => pointer.current.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  useFrame(({ camera, size }, dt) => {
    const { screens } = progress.current
    const u = tourPosition(screens) / (STATIONS.length - 1)
    const { pos, target, back, right } = tmp
    POS_PATH.getPoint(u, pos)
    TARGET_PATH.getPoint(u, target)

    const away = Math.min(1, screens)
    back.subVectors(pos, target)
    const dist = back.length()
    back.normalize()

    // Back off along the view direction until the station's subject fits the viewport
    // (mostly matters on portrait phones), but never through the room's walls.
    const at = tourPosition(screens)
    const i = Math.min(STATIONS.length - 2, Math.floor(at))
    const f = at - i
    const [w0, h0] = STATIONS[i].fit
    const [w1, h1] = STATIONS[i + 1].fit
    const tanHalf = Math.tan(((camera as PerspectiveCamera).fov * Math.PI) / 360)
    const needed = 1.1 * Math.max((h0 + (h1 - h0) * f) / 2 / tanHalf, (w0 + (w1 - w0) * f) / 2 / (tanHalf * (size.width / size.height)))
    if (needed > dist) {
      pos.addScaledVector(back, needed - dist)
      pos.x = Math.min(3, Math.max(-3, pos.x))
    }

    sway.current.lerp(pointer.current, 1 - Math.exp(-dt * 3))
    right.crossVectors(camera.up, back).normalize()
    pos.addScaledVector(right, sway.current.x * 0.15 * away)
    pos.y += sway.current.y * 0.1 * away

    camera.position.copy(pos)
    camera.lookAt(target)
  })
  return null
}

function Stage({ cardRect, direction, lowEnd, onMorphDone }: ImmersiveSceneProps) {
  const progress = useScrollProgress()
  const count = lowEnd ? 8000 : innerWidth < 640 ? 12000 : 24000

  return (
    <>
      <CameraRig progress={progress} />
      <Room progress={progress} lowEnd={lowEnd} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[-2, 3, 2]} intensity={1.2} />
      <AboutFrame progress={progress} />
      <Bookshelf progress={progress} />
      <SplatPortrait
        count={count}
        cardRect={cardRect}
        morphTarget={direction === 'in' ? 1 : 0}
        onMorphDone={onMorphDone}
        progress={progress}
        lowEnd={lowEnd}
      />
    </>
  )
}

export default function ImmersiveScene(props: ImmersiveSceneProps) {
  return (
    <>
      <div className="fixed inset-0 z-0" aria-hidden>
        <Canvas
          dpr={[1, 2]}
          camera={{ position: STATIONS[0].pos, fov: 45 }}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            // Furniture is clipped against the room's scan plane.
            gl.localClippingEnabled = true
          }}
        >
          <color attach="background" args={['#0b0b14']} />
          <Stage {...props} />
          {!props.lowEnd && (
            <EffectComposer>
              <Bloom intensity={0.7} luminanceThreshold={0.35} luminanceSmoothing={0.3} mipmapBlur />
            </EffectComposer>
          )}
        </Canvas>
      </div>
      <TourOverlay visible={props.direction === 'in'} />
    </>
  )
}
