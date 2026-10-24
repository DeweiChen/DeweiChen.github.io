import { useEffect, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CatmullRomCurve3, Quaternion, Vector2, Vector3, type PerspectiveCamera } from 'three'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { TourOutline } from './TourOutline'
import { TourOverlay } from './TourOverlay'
import { AboutFrame } from './AboutFrame'
import { Bookshelf } from './Bookshelf'
import { Contact } from './Contact'
import { Education } from './Education'
import { Room } from './Room'
import { LIVING } from './roomLayout'
import { SideProjects } from './SideProjects'
import { Timeline } from './Timeline'
import { SplatPortrait, type PixelRect } from './SplatPortrait'
import { STATIONS, tourPosition } from './stations'
import { useScrollProgress, type ScrollProgress } from './useScrollProgress'
import { READER_EVENT } from './panel'

export interface ImmersiveSceneProps {
  cardRect: PixelRect | null
  /** 'in' while arriving or settled, 'out' while collapsing back to the 2D card. */
  direction: 'in' | 'out'
  lowEnd: boolean
  onMorphDone?: (target: 0 | 1) => void
  /** Leave through the door at the end of the tour, back to the classic page. */
  onExit?: () => void
}

const toVec = ([x, y, z]: [number, number, number]) => new Vector3(x, y, z)
// The path runs through every station and any waypoints between them. POINT_AT maps a
// station to its point on the path, so (fractional) station indices map onto path params.
const POINTS = STATIONS.flatMap((s) => [s, ...(s.via ? [s.via] : [])])
const POINT_AT = STATIONS.reduce<number[]>((acc, _, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + (STATIONS[i - 1].via ? 2 : 1))
  return acc
}, [])
const POS_PATH = new CatmullRomCurve3(POINTS.map((s) => toVec(s.pos)))
const TARGET_PATH = new CatmullRomCurve3(POINTS.map((s) => toVec(s.target)))

function pathParam(at: number) {
  const i = Math.min(STATIONS.length - 2, Math.floor(at))
  const p = POINT_AT[i] + (POINT_AT[i + 1] - POINT_AT[i]) * (at - i)
  return p / (POINTS.length - 1)
}
const FLIGHT_SECONDS = 1.2
/** How far the camera rises mid-flight, so a jump reads as flying over rather than sliding. */
const FLIGHT_LIFT = 0.35
// Scratch vectors for the rig; there is only ever one camera.
const tmp = { pos: new Vector3(), target: new Vector3(), back: new Vector3(), right: new Vector3() }

/**
 * Walks the camera from station to station as the page scrolls. At the top it
 * sits exactly at the hero station (the canvas default) so the card <-> particle
 * morph lines up with the DOM; head-sway fades in after.
 */
function CameraRig({ progress }: { progress: RefObject<ScrollProgress> }) {
  const invalidate = useThree((s) => s.invalidate)
  const pointer = useRef(new Vector2())
  const sway = useRef(new Vector2())
  const lastScreens = useRef<number | null>(null)
  const reading = useRef(false)
  const flight = useRef({
    active: false,
    t: 0,
    from: new Vector3(),
    fromQ: new Quaternion(),
    pos: new Vector3(),
    q: new Quaternion(),
    last: new Vector3(),
    lastQ: new Quaternion(),
  })

  useEffect(() => {
    const onReader = (e: Event) => {
      reading.current = (e as CustomEvent<boolean>).detail
    }
    window.addEventListener(READER_EVENT, onReader)
    return () => window.removeEventListener(READER_EVENT, onReader)
  }, [])

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (reading.current) return
      pointer.current.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
      if (progress.current.screens > 0) invalidate()
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [invalidate, progress])

  // Priority -1 runs after useScrollProgress (-2) and before scene objects (0) such as Reader.
  useFrame(({ camera, size }, dt) => {
    if (reading.current) return
    const d = Math.min(dt, 0.05)
    const { screens } = progress.current
    const u = pathParam(tourPosition(screens))
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
      pos.x = Math.min(LIVING.x1 - 0.2, Math.max(LIVING.x0 + 0.2, pos.x))
    }

    if (away > 0 && !sway.current.equals(pointer.current)) {
      if (sway.current.distanceToSquared(pointer.current) > 1e-6) {
        sway.current.lerp(pointer.current, 1 - Math.exp(-d * 3))
      } else {
        sway.current.copy(pointer.current)
      }
      invalidate()
    }
    right.crossVectors(camera.up, back).normalize()
    pos.addScaledVector(right, sway.current.x * 0.15 * away)
    pos.y += sway.current.y * 0.1 * away

    camera.position.copy(pos)
    camera.lookAt(target)

    // A jump along the tour (an index click) flies there in one arc rather than replaying every stop.
    const f0 = flight.current
    if (lastScreens.current !== null && Math.abs(screens - lastScreens.current) > 1) {
      // The camera already stands at the destination above; start from where it was last frame.
      f0.from.copy(f0.last)
      f0.fromQ.copy(f0.lastQ)
      f0.t = 0
      f0.active = true
    }
    lastScreens.current = screens
    if (f0.active) {
      f0.t = Math.min(1, f0.t + d / FLIGHT_SECONDS)
      const e = f0.t * f0.t * (3 - 2 * f0.t)
      f0.pos.lerpVectors(f0.from, camera.position, e)
      f0.pos.y += Math.sin(Math.PI * e) * FLIGHT_LIFT
      f0.q.slerpQuaternions(f0.fromQ, camera.quaternion, e)
      camera.position.copy(f0.pos)
      camera.quaternion.copy(f0.q)
      if (f0.t >= 1) f0.active = false
      invalidate()
    }
    f0.last.copy(camera.position)
    f0.lastQ.copy(camera.quaternion)
  }, -1)
  return null
}

function Stage({ cardRect, direction, lowEnd, onMorphDone, onExit }: ImmersiveSceneProps) {
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
      <Timeline progress={progress} />
      <SideProjects progress={progress} />
      <Education progress={progress} />
      <Contact progress={progress} onExit={onExit} />
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
          frameloop="demand"
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
          <EffectComposer>
            <Bloom
              intensity={props.lowEnd ? 0.45 : 0.7}
              luminanceThreshold={0.35}
              luminanceSmoothing={0.3}
              mipmapBlur
            />
          </EffectComposer>
        </Canvas>
      </div>
      <TourOverlay visible={props.direction === 'in'} />
      {props.direction === 'in' && <TourOutline onExit={props.onExit} />}
    </>
  )
}
