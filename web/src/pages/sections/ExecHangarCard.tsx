import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card } from '../../components/ui'
import { getExecAnchor, reportExecOpen } from '../../services/community'

// Community-measured Executive Hangar cycle (stable since Alpha 4.0.1):
//   120 min "charging" (closed; 5 lights turn red -> green, one every 24 min)
//    60 min OPEN       (all green; one light powers off every 12 min)
//     5 min blackout   (reset), then repeat.
// The cycle is globally synchronized across all servers, but its anchor shifts
// after every patch/downtime — hence the one-tap calibration below.
const GREEN_MIN = 60
const BLACKOUT_MIN = 5
const RED_MIN = 120
const CYCLE_MS = (GREEN_MIN + BLACKOUT_MIN + RED_MIN) * 60_000

const ANCHOR_KEY = 'nexus-nook:exec-anchor'

type Phase = 'open' | 'blackout' | 'charging'

interface PhaseInfo {
  phase: Phase
  /** ms until the next phase transition */
  msToNext: number
  /** 0..5 lights currently lit green (charging) or still on (open) */
  lights: number
  /** 0..1 progress through the current phase */
  progress: number
}

function computePhase(anchorGreenStart: number, now: number): PhaseInfo {
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

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

const PHASE_STYLE: Record<Phase, { label: string; tone: 'green' | 'red' | 'slate'; text: string }> = {
  open: { label: 'OPEN', tone: 'green', text: 'Hangar is OPEN — closes in' },
  charging: { label: 'CHARGING', tone: 'red', text: 'Hangar is closed — opens in' },
  blackout: { label: 'BLACKOUT', tone: 'slate', text: 'Resetting — next cycle in' },
}

export default function ExecHangarCard() {
  const [localAnchor, setLocalAnchor] = useState<number | null>(() => {
    const raw = localStorage.getItem(ANCHOR_KEY)
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) ? n : null
  })
  const [communityAnchor, setCommunityAnchor] = useState<number | null>(null)
  const [communityReports, setCommunityReports] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [showGuide, setShowGuide] = useState(false)
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
  const source: 'local' | 'community' | null =
    localAnchor !== null ? 'local' : communityAnchor !== null ? 'community' : null

  const info = useMemo(
    () => (anchor !== null ? computePhase(anchor, now) : null),
    [anchor, now],
  )

  function calibrate(greenStartMsAgo: number) {
    const value = Date.now() - greenStartMsAgo
    localStorage.setItem(ANCHOR_KEY, String(value))
    setLocalAnchor(value)
    // Share the observation so every Nook user's timer syncs (sign-in only;
    // failures are silent — the local timer still works).
    reportExecOpen(Math.round(greenStartMsAgo / 60000))
      .then(() => setShared(true))
      .catch(() => {})
  }

  function nudge(deltaMs: number) {
    const base = anchor
    if (base === null) return
    const value = base + deltaMs
    localStorage.setItem(ANCHOR_KEY, String(value))
    setLocalAnchor(value)
  }

  function useCommunity() {
    localStorage.removeItem(ANCHOR_KEY)
    setLocalAnchor(null)
  }

  const style = info ? PHASE_STYLE[info.phase] : null

  return (
    <Card title="Executive Hangar Timer" icon="🔐">
      <p className="mb-4 text-xs text-slate-400">
        Pyro's Executive Hangar runs one global cycle on every server: 2h charging →{' '}
        <span className="text-emerald-400">1h open</span> → 5m blackout.
      </p>

      {info && style ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <Badge tone={style.tone} dot>
                {style.label}
              </Badge>
              {source === 'community' && (
                <span
                  title={`Blended from ${communityReports} player report${communityReports === 1 ? '' : 's'}`}
                  className="rounded bg-blue-950/60 px-1.5 py-0.5 text-[10px] font-medium text-blue-300"
                >
                  Community-calibrated · {communityReports}
                </span>
              )}
              {source === 'local' && shared && (
                <span className="rounded bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                  Shared with the Nook ✓
                </span>
              )}
            </span>
            {/* The five hangar status lights */}
            <div className="flex items-center gap-1.5" title="Hangar status lights">
              {[0, 1, 2, 3, 4].map((i) => {
                const lit =
                  info.phase === 'charging' ? i < info.lights : info.phase === 'open' ? i < info.lights : false
                return (
                  <span
                    key={i}
                    className={`h-3 w-3 rounded-full border ${
                      lit
                        ? 'border-emerald-400 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                        : info.phase === 'blackout'
                          ? 'border-slate-700 bg-slate-800'
                          : 'border-red-800 bg-red-950'
                    }`}
                  />
                )
              })}
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-400">{style.text}</p>
          <p className="font-display text-4xl font-bold tabular-nums text-slate-100">
            {fmt(info.msToNext)}
          </p>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all ${
                info.phase === 'open'
                  ? 'bg-emerald-500'
                  : info.phase === 'charging'
                    ? 'bg-red-500'
                    : 'bg-slate-500'
              }`}
              style={{ width: `${Math.min(100, info.progress * 100)}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span>Timer off?</span>
            <button
              type="button"
              onClick={() => nudge(-60_000)}
              className="rounded border border-slate-700 px-2 py-0.5 hover:bg-slate-800"
            >
              −1 min
            </button>
            <button
              type="button"
              onClick={() => nudge(60_000)}
              className="rounded border border-slate-700 px-2 py-0.5 hover:bg-slate-800"
            >
              +1 min
            </button>
            <button
              type="button"
              onClick={() => calibrate(0)}
              className="rounded border border-emerald-800 px-2 py-0.5 text-emerald-400 hover:bg-emerald-950/40"
            >
              It just opened — resync
            </button>
            {source === 'local' && communityAnchor !== null && (
              <button
                type="button"
                onClick={useCommunity}
                className="rounded border border-blue-800 px-2 py-0.5 text-blue-300 hover:bg-blue-950/40"
              >
                Use community calibration
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/10 p-4">
          <p className="text-sm font-medium text-amber-300">One-time calibration needed</p>
          <p className="mt-1 text-xs text-slate-400">
            The cycle is the same on every server, but its clock resets with each game
            patch. Tell the timer where the cycle is right now — from the in-game lights
            or a glance at a community tracker. If you're signed in, your report
            calibrates the timer for <em>every</em> Nook user automatically.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => calibrate(0)}>🟢 It just OPENED (all lights green)</Button>
            <Button variant="ghost" onClick={() => calibrate(GREEN_MIN * 60_000)}>
              ⚫ It just CLOSED (blackout started)
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Cross-check anytime at{' '}
            <a
              href="https://exectimer.com"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-slate-300"
            >
              exectimer.com
            </a>
            .
          </p>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className="text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-300"
        >
          Run guide &amp; keycards {showGuide ? '▾' : '▸'}
        </button>
        {showGuide && (
          <div className="mt-2 space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
            <p>
              <strong className="text-slate-200">Compboards:</strong> you need all 7 —
              boards <Badge tone="purple">1–3 Checkmate</Badge>{' '}
              <Badge tone="purple">4 &amp; 7 Orbituary</Badge>{' '}
              <Badge tone="purple">5 &amp; 6 Ruin Station</Badge>
            </p>
            <p>
              <strong className="text-slate-200">Keycard printers:</strong> Supervisor
              cards print on a ~30-minute cooldown — time your farming loop around it.
            </p>
            <p>
              <strong className="text-slate-200">During the open hour:</strong> insert
              all 7 boards; the Engineering door then stays open 30 minutes. Loot
              includes ship claims, mil-spec components, and rare FPS weapons.
            </p>
            <p className="flex flex-wrap gap-3 pt-1">
              <a
                href="https://starcitizen.tools/Guide:Executive_Hangars"
                target="_blank"
                rel="noreferrer"
                className="text-purple-300 underline hover:text-purple-200"
              >
                Full wiki guide ↗
              </a>
              <a
                href="https://survivortohero.com/pyro-contested-zones-executive-hangar-guide-sc-4-0/"
                target="_blank"
                rel="noreferrer"
                className="text-purple-300 underline hover:text-purple-200"
              >
                Contested Zones walkthrough ↗
              </a>
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Cycle timings are community-measured (185-minute rotation) and can shift after a
        game patch — recalibrate with one tap if it drifts. Not official CIG data.
      </p>
    </Card>
  )
}
