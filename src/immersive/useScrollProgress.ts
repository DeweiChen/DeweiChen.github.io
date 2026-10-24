import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export interface ScrollProgress {
  /** scrollY in viewport heights (0 = top, 1 = one screen down). */
  screens: number
}

/** A scroll this far in one go is a jump: the scene skips to it and the camera flies over. */
export const JUMP_SCREENS = 1.5

/** Smoothed scroll position, read once per frame and shared by everything in the scene. */
export function useScrollProgress() {
  const progress = useRef<ScrollProgress>({ screens: 0 })

  useFrame((_, dt) => {
    const to = scrollY / innerHeight
    // Easing through every stop in between would replay the whole tour; skip straight there.
    if (Math.abs(to - progress.current.screens) > JUMP_SCREENS) progress.current.screens = to
    else progress.current.screens += (to - progress.current.screens) * (1 - Math.exp(-dt * 6))
  })

  return progress
}
