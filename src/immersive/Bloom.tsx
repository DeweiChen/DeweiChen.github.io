import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { HalfFloatType, NoToneMapping, Vector2 } from 'three'
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, RenderPass } from 'postprocessing'

const size = new Vector2()

/**
 * Mipmap bloom over the whole scene, straight on `postprocessing`. Mirrors what
 * @react-three/postprocessing's <EffectComposer><Bloom /></EffectComposer> did, without its
 * barrel import dragging every other effect (and n8ao) into the bundle.
 */
export function Bloom({ intensity }: { intensity: number }) {
  const { gl, scene, camera } = useThree()

  const { composer, bloom } = useMemo(() => {
    const composer = new EffectComposer(gl, { multisampling: 4, frameBufferType: HalfFloatType })
    const bloom = new BloomEffect({
      blendFunction: BlendFunction.ADD,
      luminanceThreshold: 0.35,
      luminanceSmoothing: 0.3,
      mipmapBlur: true,
    })
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new EffectPass(camera, bloom))
    return { composer, bloom }
  }, [gl, scene, camera])

  useEffect(() => () => composer.dispose(), [composer])

  // The composer clears its own buffers, and the scene renders linear into it.
  useEffect(() => {
    const { autoClear, toneMapping } = gl
    gl.autoClear = false
    gl.toneMapping = NoToneMapping
    return () => {
      gl.autoClear = autoClear
      gl.toneMapping = toneMapping
    }
  }, [gl])

  useEffect(() => {
    bloom.intensity = intensity
  }, [bloom, intensity])

  // Priority 1 takes over rendering from r3f.
  const applied = useRef({ composer, width: -1, height: -1, dpr: -1 })
  useFrame((_, delta) => {
    gl.getSize(size)
    const dpr = gl.getPixelRatio()
    const a = applied.current
    if (a.composer !== composer || size.width !== a.width || size.height !== a.height || dpr !== a.dpr) {
      composer.setSize(size.width, size.height)
      applied.current = { composer, width: size.width, height: size.height, dpr }
    }
    gl.autoClear = true
    composer.render(delta)
    gl.autoClear = false
  }, 1)

  return null
}
