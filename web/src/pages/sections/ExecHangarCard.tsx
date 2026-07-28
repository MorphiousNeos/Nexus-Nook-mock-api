import { useState } from 'react'
import { Badge, Button, Card } from '../../components/ui'
import {
  EXEC_PHASE_STYLE,
  GREEN_MIN,
  formatCountdown,
  isLightLit,
  useExecTimer,
} from '../../services/execTimer'

export default function ExecHangarCard() {
  const {
    info,
    source,
    communityAnchor,
    communityReports,
    shared,
    calibrate,
    nudge,
    preferCommunityAnchor,
  } = useExecTimer()
  const [showGuide, setShowGuide] = useState(false)

  const style = info ? EXEC_PHASE_STYLE[info.phase] : null

  return (
    <Card title="Executive Hangar Timer" icon="🔐">
      <p className="mb-4 text-xs text-hull-400">
        Pyro's Executive Hangar runs one global cycle on every server: 2h charging →{' '}
        <span className="text-positive-400">1h open</span> → 5m blackout.
      </p>

      {info && style ? (
        <div className="rounded-xl border border-hull-800 bg-hull-950/50 p-4">
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
                <span className="rounded bg-positive-950/60 px-1.5 py-0.5 text-[10px] font-medium text-positive-300">
                  Shared with the Nook ✓
                </span>
              )}
            </span>
            {/* The five hangar status lights */}
            <div className="flex items-center gap-1.5" title="Hangar status lights">
              {[0, 1, 2, 3, 4].map((i) => {
                const lit = isLightLit(info, i)
                return (
                  <span
                    key={i}
                    className={`h-3 w-3 rounded-full border ${
                      lit
                        ? 'border-positive-400 bg-positive-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                        : info.phase === 'blackout'
                          ? 'border-hull-700 bg-hull-800'
                          : 'border-danger-800 bg-danger-950'
                    }`}
                  />
                )
              })}
            </div>
          </div>

          <p className="mt-3 text-sm text-hull-400">{style.text}</p>
          <p className="font-display text-4xl font-bold tabular-nums text-hull-100">
            {formatCountdown(info.msToNext)}
          </p>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-hull-800">
            <div
              className={`h-full rounded-full transition-all ${
                info.phase === 'open'
                  ? 'bg-positive-500'
                  : info.phase === 'charging'
                    ? 'bg-danger-500'
                    : 'bg-hull-500'
              }`}
              style={{ width: `${Math.min(100, info.progress * 100)}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-hull-500">
            <span>Timer off?</span>
            <button
              type="button"
              onClick={() => nudge(-60_000)}
              className="rounded border border-hull-700 px-2 py-0.5 hover:bg-hull-800"
            >
              −1 min
            </button>
            <button
              type="button"
              onClick={() => nudge(60_000)}
              className="rounded border border-hull-700 px-2 py-0.5 hover:bg-hull-800"
            >
              +1 min
            </button>
            <button
              type="button"
              onClick={() => calibrate(0)}
              className="rounded border border-positive-800 px-2 py-0.5 text-positive-400 hover:bg-positive-950/40"
            >
              It just opened — resync
            </button>
            {source === 'local' && communityAnchor !== null && (
              <button
                type="button"
                onClick={preferCommunityAnchor}
                className="rounded border border-blue-800 px-2 py-0.5 text-blue-300 hover:bg-blue-950/40"
              >
                Use community calibration
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-caution-900/50 bg-caution-950/10 p-4">
          <p className="text-sm font-medium text-caution-300">One-time calibration needed</p>
          <p className="mt-1 text-xs text-hull-400">
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
          <p className="mt-2 text-[11px] text-hull-500">
            Cross-check anytime at{' '}
            <a
              href="https://exectimer.com"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-hull-300"
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
          className="text-xs font-semibold uppercase tracking-widest text-hull-500 hover:text-hull-300"
        >
          Run guide &amp; keycards {showGuide ? '▾' : '▸'}
        </button>
        {showGuide && (
          <div className="mt-2 space-y-2 rounded-lg border border-hull-800 bg-hull-950/40 p-3 text-xs text-hull-400">
            <p>
              <strong className="text-hull-200">Compboards:</strong> you need all 7 —
              boards <Badge tone="purple">1–3 Checkmate</Badge>{' '}
              <Badge tone="purple">4 &amp; 7 Orbituary</Badge>{' '}
              <Badge tone="purple">5 &amp; 6 Ruin Station</Badge>
            </p>
            <p>
              <strong className="text-hull-200">Keycard printers:</strong> Supervisor
              cards print on a ~30-minute cooldown — time your farming loop around it.
            </p>
            <p>
              <strong className="text-hull-200">During the open hour:</strong> insert
              all 7 boards; the Engineering door then stays open 30 minutes. Loot
              includes ship claims, mil-spec components, and rare FPS weapons.
            </p>
            <p className="flex flex-wrap gap-3 pt-1">
              <a
                href="https://starcitizen.tools/Guide:Executive_Hangars"
                target="_blank"
                rel="noreferrer"
                className="text-brand-300 underline hover:text-brand-200"
              >
                Full wiki guide ↗
              </a>
              <a
                href="https://survivortohero.com/pyro-contested-zones-executive-hangar-guide-sc-4-0/"
                target="_blank"
                rel="noreferrer"
                className="text-brand-300 underline hover:text-brand-200"
              >
                Contested Zones walkthrough ↗
              </a>
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] text-hull-500">
        Cycle timings are community-measured (185-minute rotation) and can shift after a
        game patch — recalibrate with one tap if it drifts. Not official CIG data.
      </p>
    </Card>
  )
}
