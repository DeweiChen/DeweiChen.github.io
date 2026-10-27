import { useEffect, useSyncExternalStore } from 'react'
import { FREE_EVENT, isFree, WALK_EVENT } from './freeMode'
import { READER_EVENT } from './panel'
import { tourPosition } from './stations'

// Sound effects for the 3D room, synthesized with Web Audio: no files to download, nothing to license.
// Every level lives in VOLUME so the mix can be tuned in one place.

/** Window event with `detail: boolean`, fired when sound is muted or unmuted. */
export const SOUND_EVENT = 'tour:sound'

const VOLUME = {
  master: 0.35,
  hover: 0.05,
  click: 0.16,
  open: 0.2,
  close: 0.13,
  move: 0.12,
  step: 0.22,
  target: 0.22,
  mode: 0.15,
  scan: 0.1,
}
export type SoundName = keyof Omit<typeof VOLUME, 'master'>

/** Shortest gap between two plays of the same sound, in seconds. */
const GAP: Partial<Record<SoundName, number>> = { hover: 0.08, step: 0.25, click: 0.06, move: 0.3 }

// C major triad from C5, rolled up when the tour moves on and down when it goes back.
const ARPEGGIO = [523.25, 659.25, 783.99]

const STORE_KEY = 'sound'

function readMuted() {
  try {
    return localStorage.getItem(STORE_KEY) === 'off'
  } catch {
    return false
  }
}

let muted = typeof window !== 'undefined' && readMuted()
let ctx: AudioContext | null = null
let out: GainNode | null = null
let noise: AudioBuffer | null = null
const last: Partial<Record<SoundName, number>> = {}

export const isMuted = () => muted

export function setMuted(on: boolean) {
  if (muted === on) return
  muted = on
  try {
    localStorage.setItem(STORE_KEY, on ? 'off' : 'on')
  } catch {
    // Private windows may refuse storage; the choice then lasts for this visit.
  }
  // Unmuting is a click, so the audio may start right away.
  if (!on) audio()
  window.dispatchEvent(new CustomEvent<boolean>(SOUND_EVENT, { detail: on }))
}

function subscribe(cb: () => void) {
  window.addEventListener(SOUND_EVENT, cb)
  return () => window.removeEventListener(SOUND_EVENT, cb)
}

export function useMuted() {
  return useSyncExternalStore(subscribe, isMuted, () => false)
}

/** The audio graph, made on first use. Browsers only let it start after a click or key press. */
function audio() {
  if (!ctx) {
    ctx = new AudioContext()
    const comp = ctx.createDynamicsCompressor()
    comp.connect(ctx.destination)
    out = ctx.createGain()
    out.gain.value = VOLUME.master
    out.connect(comp)
    // A second of white noise, shared by every breathy sound.
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** A gain node shaped as an envelope: `attack` up to `peak`, then an exponential fade over `decay`. */
function envelope(ac: AudioContext, at: number, peak: number, attack: number, decay: number) {
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(peak, at + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  g.connect(out!)
  return g
}

function tone(ac: AudioContext, type: OscillatorType, freq: number, at: number, peak: number, attack: number, decay: number, slideTo?: number) {
  const osc = ac.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + attack + decay)
  osc.connect(envelope(ac, at, peak, attack, decay))
  osc.start(at)
  osc.stop(at + attack + decay + 0.05)
}

function hiss(ac: AudioContext, at: number, duration: number, filter: BiquadFilterType, freq: number, q: number, gain: GainNode) {
  const src = ac.createBufferSource()
  src.buffer = noise
  src.loop = duration > 1
  src.playbackRate.value = 0.9 + Math.random() * 0.2
  const f = ac.createBiquadFilter()
  f.type = filter
  f.frequency.setValueAtTime(freq, at)
  f.Q.value = q
  src.connect(f).connect(gain)
  src.start(at, Math.random() * 0.5)
  src.stop(at + duration + 0.05)
  return f
}

/**
 * Plays one of the room's sounds. `step` is the direction for `move` (1 onward, 0 back)
 * and for `mode` (1 into free roam, 0 back to the tour).
 */
export function play(name: SoundName, step = 0) {
  if (muted || document.hidden) return
  const ac = audio()
  if (ac.state !== 'running') return
  const now = ac.currentTime
  if (now - (last[name] ?? -1) < (GAP[name] ?? 0)) return
  last[name] = now
  const v = VOLUME[name]
  const jitter = () => 0.9 + Math.random() * 0.2

  switch (name) {
    case 'hover':
      tone(ac, 'sine', 1800, now, v, 0.005, 0.04, 2200)
      break
    case 'click':
      tone(ac, 'triangle', 660, now, v, 0.004, 0.12)
      tone(ac, 'sine', 990, now + 0.01, v * 0.6, 0.004, 0.1)
      break
    case 'open':
      tone(ac, 'sine', 523.25, now, v, 0.01, 0.25)
      tone(ac, 'sine', 783.99, now + 0.08, v, 0.01, 0.4)
      tone(ac, 'sine', 1567.98, now + 0.08, v * 0.15, 0.01, 0.3)
      break
    case 'close':
      tone(ac, 'sine', 783.99, now, v, 0.01, 0.2)
      tone(ac, 'sine', 523.25, now + 0.07, v, 0.01, 0.3)
      break
    case 'move': {
      const notes = step ? ARPEGGIO : [...ARPEGGIO].reverse()
      notes.forEach((f, i) => tone(ac, 'triangle', f, now + i * 0.07, v, 0.005, 0.3))
      break
    }
    case 'step': {
      const g = envelope(ac, now, v * jitter(), 0.004, 0.07)
      hiss(ac, now, 0.1, 'lowpass', 180 * jitter(), 1, g)
      tone(ac, 'sine', 90 * jitter(), now, v * 0.5, 0.004, 0.06)
      break
    }
    case 'target':
      tone(ac, 'sine', 220, now, v, 0.004, 0.18, 140)
      hiss(ac, now, 0.06, 'highpass', 3000, 0.7, envelope(ac, now, v * 0.15, 0.002, 0.04))
      break
    case 'mode': {
      const [a, b] = step ? [659.25, 987.77] : [987.77, 659.25]
      tone(ac, 'triangle', a, now, v, 0.01, 0.15)
      tone(ac, 'triangle', b, now + 0.1, v, 0.01, 0.25)
      break
    }
    case 'scan': {
      const g = envelope(ac, now, v, 0.9, 1.1)
      const f = hiss(ac, now, 2, 'bandpass', 200, 3, g)
      f.frequency.exponentialRampToValueAtTime(2400, now + 1.6)
      break
    }
  }
}

/**
 * The tour's sounds that follow from things already announced on the window: setting off
 * for another station, a panel held up or put down, free roam switched,
 * a spot on the floor picked. Objects play their own hover and click sounds.
 */
export function useTourSounds(active: boolean) {
  useEffect(() => {
    if (!active) return
    // The first click or key press lets the audio start; entering the room is usually one.
    const unlock = () => {
      if (!muted) audio()
    }
    // The station the tour is resting at, or null while it is on its way to the next.
    let rest: number | null = Math.round(tourPosition(scrollY / innerHeight))
    let scanned = scrollY / innerHeight > 0.7
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const screens = scrollY / innerHeight
        const pos = tourPosition(screens)
        if (!scanned && screens > 0.7) {
          scanned = true
          play('scan')
        }
        // Setting off from a station; leaving the name is the scan's moment. While roaming,
        // FreeRig plays it for the flights it makes.
        if (rest !== null && Math.abs(pos - rest) > 0.05) {
          if (!isFree() && rest > 0) play('move', pos > rest ? 1 : 0)
          rest = null
        }
        const at = Math.round(pos)
        if (Math.abs(pos - at) < 0.08) rest = at
      })
    }
    // Every Reader announces it is closed when it mounts; only a change is worth a sound.
    let reading = false
    const onReader = (e: Event) => {
      const open = (e as CustomEvent<boolean>).detail
      if (open !== reading) play(open ? 'open' : 'close')
      reading = open
    }
    const onFree = (e: Event) => play('mode', (e as CustomEvent<boolean>).detail ? 1 : 0)
    const onWalk = () => play('target')

    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener(READER_EVENT, onReader)
    window.addEventListener(FREE_EVENT, onFree)
    window.addEventListener(WALK_EVENT, onWalk)
    unlock()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener(READER_EVENT, onReader)
      window.removeEventListener(FREE_EVENT, onFree)
      window.removeEventListener(WALK_EVENT, onWalk)
      void ctx?.suspend()
    }
  }, [active])
}
