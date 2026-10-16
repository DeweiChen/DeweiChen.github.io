import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { FloatingPanels } from './FloatingPanels'
import { SplatPortrait, type PixelRect } from './SplatPortrait'

export interface ImmersiveSceneProps {
  cardRect: PixelRect | null
  /** 'in' while arriving or settled, 'out' while collapsing back to the 2D card. */
  direction: 'in' | 'out'
  lowEnd: boolean
  onMorphDone?: (target: 0 | 1) => void
}

export default function ImmersiveScene({ cardRect, direction, lowEnd, onMorphDone }: ImmersiveSceneProps) {
  const count = lowEnd ? 8000 : innerWidth < 640 ? 12000 : 24000

  return (
    <>
      <div className="fixed inset-0 z-0" aria-hidden>
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 6], fov: 45 }}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#0b0b14']} />
          <SplatPortrait
            count={count}
            cardRect={cardRect}
            morphTarget={direction === 'in' ? 1 : 0}
            onMorphDone={onMorphDone}
          />
          {!lowEnd && (
            <EffectComposer>
              <Bloom intensity={0.7} luminanceThreshold={0.35} luminanceSmoothing={0.3} mipmapBlur />
            </EffectComposer>
          )}
        </Canvas>
      </div>
      <FloatingPanels visible={direction === 'in'} />
    </>
  )
}
