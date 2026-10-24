import { useEffect, useMemo, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { ShaderMaterial, Vector2 } from 'three'
import vertexShader from './room.vert?raw'
import fragmentShader from './room.frag?raw'
import wireFragmentShader from './roomWire.frag?raw'
import { buildRoomEdges, buildRoomGeometry, FLOOR_Y, scanHeight } from './roomLayout'
import type { ScrollProgress } from './useScrollProgress'

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * The scroll story after the name: the point cloud settles into a wireframe
 * room, then a scan plane sweeps floor to ceiling and leaves solid surfaces behind.
 */
export function Room({ progress, lowEnd }: { progress: RefObject<ScrollProgress>; lowEnd: boolean }) {
  const mesh = useMemo(() => buildRoomGeometry(lowEnd), [lowEnd])
  const edges = useMemo(() => buildRoomEdges(lowEnd), [lowEnd])

  const [solid, wire] = useMemo(() => {
    const width = new Vector2(-3.2, 3.2)
    return [
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        // Push faces back so the edge lines lying on them never z-fight.
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        uniforms: { uScan: { value: FLOOR_Y - 1 }, uTime: { value: 0 }, uWidth: { value: width } },
      }),
      new ShaderMaterial({
        vertexShader,
        fragmentShader: wireFragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: { uScan: { value: FLOOR_Y - 1 }, uWire: { value: 0 }, uWidth: { value: width } },
      }),
    ]
  }, [])

  useEffect(() => () => {
    mesh.dispose()
    edges.dispose()
  }, [mesh, edges])
  useEffect(() => () => {
    solid.dispose()
    wire.dispose()
  }, [solid, wire])

  useFrame((state) => {
    const { screens } = progress.current
    const scan = scanHeight(screens)
    solid.uniforms.uScan.value = scan
    solid.uniforms.uTime.value = state.clock.elapsedTime
    wire.uniforms.uScan.value = scan
    wire.uniforms.uWire.value = smoothstep(0.4, 0.8, screens)
    // Only animate uTime while the glowing scan band is sweeping across the room's geometry.
    if (screens > 0.7 && screens < 1.5) state.invalidate()
  })

  return (
    <>
      <mesh geometry={mesh} material={solid} frustumCulled={false} />
      {/* Drawn before other transparent things so panels in front cover the edges behind them. */}
      <lineSegments geometry={edges} material={wire} frustumCulled={false} renderOrder={-1} />
    </>
  )
}
