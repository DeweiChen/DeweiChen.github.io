import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector2 } from 'three'

/**
 * Tracks the pointer on window (the DOM overlay sits above the canvas, so
 * R3F's own events never fire) and projects it onto the z = 0 plane.
 */
export function useMouseWorld() {
  const ndc = useRef(new Vector2(0, 0))
  const inside = useRef(false)
  const state = useRef({
    world: new Vector2(99, 99),
    velocity: new Vector2(),
    strength: 0,
  })
  const { viewport } = useThree()

  useEffect(() => {
    const move = (e: PointerEvent) => {
      ndc.current.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
      inside.current = true
    }
    const leave = () => {
      inside.current = false
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    window.addEventListener('blur', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      window.removeEventListener('blur', leave)
    }
  }, [])

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    const s = state.current
    const tx = (ndc.current.x * viewport.width) / 2
    const ty = (ndc.current.y * viewport.height) / 2
    const k = 1 - Math.exp(-d * 10)
    const nx = s.world.x + (tx - s.world.x) * k
    const ny = s.world.y + (ty - s.world.y) * k
    // First contact: jump instead of sweeping in from off-screen.
    if (s.strength === 0 && inside.current) s.world.set(tx, ty)
    else {
      s.velocity.set((nx - s.world.x) / Math.max(d, 1e-3), (ny - s.world.y) / Math.max(d, 1e-3))
      s.world.set(nx, ny)
    }
    s.strength += ((inside.current ? 1 : 0) - s.strength) * (1 - Math.exp(-d * 4))
    if (s.strength < 1e-3 && !inside.current) s.strength = 0
  })

  return state
}
