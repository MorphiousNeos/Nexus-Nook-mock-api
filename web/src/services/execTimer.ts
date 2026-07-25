// Executive Hangar cycle math + anchor resolution, shared by the Servers page
// card and the Overview live strip.
//
// Community-measured Executive Hangar cycle (stable since Alpha 4.0.1):
//   120 min "charging" (closed; 5 lights turn red -> green, one every 24 min)
//    60 min OPEN       (all green; one light powers off every 12 min)
//     5 min blackout   (reset), then repeat.
// The cycle is globally synchronized across all servers, but its anchor shifts
// after every patch/downtime — hence the one-tap calibration in the UI.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getExecAnchor, reportExecOpen } from './community'

export const GREEN_MIN = 60
export const BLACKOUT_MIN = 5
export const RED_MIN = 120
export const CYCLE_MS = (GREEN_MIN + BLACKOUT_MIN + RED_MIN) * 60_000

export const EXEC_ANCHOR_KEY = 'nexus-nook:exec-anchor'

export type ExecPhase = 'open' | 'blackout' | 'charging'

export interface ExecPhaseInfo {
  phase: ExecPhase
  /** ms until the next phase transition */
  msToNext: number
  /** 0..5 lights currently lit green (charging) or still on (open) */
  lights: number
  /** 0..1 progress through the current phase */
  progress: number
}

/** Which anchor the live timer is currently running on. */
export type ExecAnchorSource = 'local' | 'community' | null

export function computeExecPhase(anchorGreenStart: number, now: number): ExecPhaseInfo {
  // Position within the cycle, measured from a green-phase start.
  const into = ((now - anchorGreenStart) % CYCLE_MS + CYCLE_MS) % CYCLE_MS
  const min = into / 60_000

  if (min < GREEN_MIN) {
    return {
      phase: 'open',
      msToNext: (GREEN_MIN - min) * 60_000,
      lights: Math.max(0, 5 - Math.floor(min / 12)),
      progress: min / GREEN_MIN,
    }
  }
  if (min < GREEN_MIN + BLACKOUT_MIN) {
    const intoBlack = min - GREEN_MIN
    return {
      phase: 'blackout',
      msToNext: (BLACKOUT_MIN - intoBlack) * 60_000,
      lights: 0,
      progress: intoBlack / BLACKOUT_MIN,
    }
  }
  const intoRed = min - GREEN_MIN - BLACKOUT_MIN
  return {
    phase: 'charging',
    msToNext: (RED_MIN - intoRed) * 60_000,
    lights: Math.floor(intoRed / 24),
    progress: intoRed / RED_MIN,
  }
}

/** h:mm:ss, or mm:ss under an hour. Never negative. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Is hangar status light `index` (0-4) currently lit? */
export function isLightLit(info: ExecPhaseInfo, index: number): boolean {
  return info.phase !== 'blackout' && index < info.lights
}

export const EXEC_PHASE_STYLE: Record<
  ExecPhase,
  { label: string; tone: 'green' | 'red' | 'slate'; text: string; short: string }
> = {
  open: {
    label: 'OPEN',
    tone: 'green',
    text: 'Hangar is OPEN — closes in',
    short: 'closes in',
  },
  charging: {
    label: 'CHARGING',
    tone: 'red',
    text: 'Hangar is closed — opens in',
    short: 'opens in',
  },
  blackout: {
    label: 'BLACKOUT',
    tone: 'slate',
    text: 'Resetting — next cycle in',
    short: 'next cycle in',
  },
}

// --- Local anchor storage ---------------------------------------------------
// Storage can throw (private mode, disabled cookies); the timer still works
// from the community anchor in that case.

export function readStoredAnchor(): number | null {
  try {
    const raw = localStorage.getItem(EXEC_ANCHOR_KEY)
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function writeStoredAnchor(value: number): void {
  try {
    localStorage.setItem(EXEC_ANCHOR_KEY, String(value))
  } catch {
    /* storage unavailable */
  }
}

export function clearStoredAnchor(): void {
  try {
    localStorage.removeItem(EXEC_ANCHOR_KEY)
  } catch {
    /* storage unavailable */
  }
}

export interface ExecTimer {
  /** Null until an anchor (local or community) is known. */
  info: ExecPhaseInfo | null
  anchor: number | null
  source: ExecAnchorSource
  communityAnchor: number | null
  communityReports: number
  /** True once this session's calibration was shared with the community. */
  shared: boolean
  /** Calibrate from an OPEN-phase start `greenStartMsAgo` milliseconds ago. */
  calibrate: (greenStartMsAgo: number) => void
  /** Shift the current anchor (manual drift correction). */
  nudge: (deltaMs: number) => void
  /** Drop the local calibration and fall back to the community anchor. */
  preferCommunityAnchor: () => void
}

/**
 * Live Executive Hangar timer: ticks once a second, resolves the anchor
 * (a local calibration always wins over the shared community anchor) and
 * exposes the calibration actions. Cleans up its interval on unmount.
 */
export function useExecTimer(): ExecTimer {
  const [localAnchor, setLocalAnchor] = useState<number | null>(readStoredAnchor)
  const [communityAnchor, setCommunityAnchor] = useState<number | null>(null)
  const [communityReports, setCommunityReports] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [shared, setShared] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Pull the community-blended anchor (built from Nook users' own reports).
  useEffect(() => {
    let active = true
    getExecAnchor().then((res) => {
      if (!active || !res || res.anchor === null) return
      setCommunityAnchor(res.anchor)
      setCommunityReports(res.observations)
    })
    return () => {
      active = false
    }
  }, [])

  // A local calibration wins (the player is looking at the lights); otherwise
  // fall back to the shared community anchor.
  const anchor = localAnchor ?? communityAnchor
  const source: ExecAnchorSource =
    localAnchor !== null ? 'local' : communityAnchor !== null ? 'community' : null

  const info = useMemo(
    () => (anchor !== null ? computeExecPhase(anchor, now) : null),
    [anchor, now],
  )

  const calibrate = useCallback((greenStartMsAgo: number) => {
    const value = Date.now() - greenStartMsAgo
    writeStoredAnchor(value)
    setLocalAnchor(value)
    // Share the observation so every Nook user's timer syncs (sign-in only;
    // failures are silent — the local timer still works).
    reportExecOpen(Math.round(greenStartMsAgo / 60000))
      .then(() => setShared(true))
      .catch(() => {})
  }, [])

  const nudge = useCallback(
    (deltaMs: number) => {
      if (anchor === null) return
      const value = anchor + deltaMs
      writeStoredAnchor(value)
      setLocalAnchor(value)
    },
    [anchor],
  )

  const preferCommunityAnchor = useCallback(() => {
    clearStoredAnchor()
    setLocalAnchor(null)
  }, [])

  return {
    info,
    anchor,
    source,
    communityAnchor,
    communityReports,
    shared,
    calibrate,
    nudge,
    preferCommunityAnchor,
  }
}
