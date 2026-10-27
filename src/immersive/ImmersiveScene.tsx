import { lazy, Suspense, useEffect, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Quaternion, Vector2, Vector3, type PerspectiveCamera } from 'three'
import { Bloom } from './Bloom'
import { TourOutline } from './TourOutline'
import { TourOverlay } from './TourOverlay'
import { AboutFrame } from './AboutFrame'
import { Bookshelf } from './Bookshelf'
import { Contact } from './Contact'
import { Education } from './Education'
import { Room } from './Room'
import { SideProjects } from './SideProjects'
import { Timeline } from './Timeline'
import { SplatPortrait, type PixelRect } from './SplatPortrait'
import { Flight, setFree, useFreeMode } from './freeMode'
import { FreeRig } from './FreeRig'
import { railPose } from './rail'
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

// `?debug=1` shows the stats.js FPS / MS / MB panel.
const DEBUG = new URLSearchParams(location.search).get('debug') === '1'
// Its own chunk, so drei only downloads when debugging.
const Stats = lazy(() => import('@react-three/drei').then((m) => ({ default: m.Stats })))

// Scratch vectors for the rig; there is only ever one camera.
const tmp = { pos: new Vector3(), target: new Vector3(), back: new Vector3(), right: new Vector3() }

/**
 * Walks the camera from station to station as the page scrolls. At the top it
 * sits exactly at the hero station (the canvas default) so the card <-> particle
 * morph lines up with the DOM; head-sway fades in after.
 */
function CameraRig({ progress }: { progress: RefObject<ScrollProgress> }) {
  const invalidate = useThree((s) => s.invalidate)
  const camera = useThree((s) => s.camera)
  const pointer = useRef(new Vector2())
  const sway = useRef(new Vector2())
  const lastScreens = useRef<number | null>(null)
  const reading = useRef(false)
  const flight = useRef(new Flight())
  const last = useRef({ pos: new Vector3(), q: new Quaternion() })

  // Coming back from free roam mid-tour: fly from wherever the camera was onto the rail.
  useEffect(() => {
    if (progress.current.screens < 0.5) return
    flight.current.start(camera.position, camera.quaternion)
    invalidate()
  }, [camera, invalidate, progress])

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
    const { pos, target, back, right } = tmp
    railPose(tourPosition(screens), camera as PerspectiveCamera, size.width / size.height, pos, target)
    back.subVectors(pos, target).normalize()

    const away = Math.min(1, screens)
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
    // The camera already stands at the destination above; start from where it was last frame.
    if (lastScreens.current !== null && Math.abs(screens - lastScreens.current) > 1) {
      flight.current.start(last.current.pos, last.current.q)
    }
    lastScreens.current = screens
    if (flight.current.apply(camera, d)) invalidate()
    last.current.pos.copy(camera.position)
    last.current.q.copy(camera.quaternion)
  }, -1)
  return null
}

function Stage({ cardRect, direction, lowEnd, onMorphDone, onExit }: ImmersiveSceneProps) {
  const progress = useScrollProgress()
  const free = useFreeMode()
  const count = lowEnd ? 8000 : innerWidth < 640 ? 12000 : 24000

  return (
    <>
      {free ? <FreeRig /> : <CameraRig progress={progress} />}
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
  // Leaving for the classic page puts the camera back on the rail first, so the name can re-form.
  const leaving = props.direction === 'out'
  useEffect(() => {
    if (leaving) setFree(false)
  }, [leaving])
  useEffect(() => () => setFree(false), [])

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
          <Bloom intensity={props.lowEnd ? 0.45 : 0.7} />
          {DEBUG && (
            <Suspense fallback={null}>
              <Stats />
            </Suspense>
          )}
        </Canvas>
      </div>
      <TourOverlay visible={props.direction === 'in'} />
      {props.direction === 'in' && <TourOutline onExit={props.onExit} />}
    </>
  )
}
