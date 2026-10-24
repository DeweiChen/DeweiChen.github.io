import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OPEN_EVENT, type OpenDetail } from './panel'

/**
 * Opens stop `index` of the `id` walk when asked through OPEN_EVENT (from the keyboard
 * outline), once the camera has got there: opened earlier, the walk would close it again.
 */
export function useOpenRequest(id: OpenDetail['id'], walk: () => number, open: (index: number) => void) {
  const pending = useRef<number | null>(null)

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<OpenDetail>).detail
      if (detail.id === id) pending.current = detail.index
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [id])

  useFrame(() => {
    if (pending.current !== null && Math.abs(walk() - pending.current) < 0.3) {
      open(pending.current)
      pending.current = null
    }
  })
}
