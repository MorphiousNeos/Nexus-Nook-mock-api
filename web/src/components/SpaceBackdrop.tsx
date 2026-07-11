import { useEffect, useRef } from 'react'

/**
 * Cinematic deep-space backdrop for the landing page.
 *
 * Layers (back to front):
 *  1. Canvas starfield — three parallax depths, twinkle, occasional shooting star.
 *  2. Nebula glows — CSS radial gradients that slowly breathe (see index.css).
 *  3. Ships — ORIGINAL stylized silhouettes (ours, not CIG art) flying across on
 *     randomized keyframe paths with engine glow, plus quantum "warp streaks".
 *
 * Honors prefers-reduced-motion: the canvas renders one static frame and the
 * ships/streaks are hidden via CSS.
 */

type Star = {
  x: number
  y: number
  z: number // 0..1 depth — far stars are small/slow
  tw: number // twinkle phase
}

type Meteor = {
  x: number
  y: number
  vx: number
  vy: number
  life: number // remaining frames
  max: number
}

function StarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let stars: Star[] = []
    let meteor: Meteor | null = null
    let nextMeteorAt = performance.now() + 4000 + Math.random() * 6000
    let width = 0
    let height = 0

    function resize() {
      if (!canvas || !ctx) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(160, Math.floor((width * height) / 9000))
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random(),
        tw: Math.random() * Math.PI * 2,
      }))
    }

    function drawFrame(t: number) {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)

      for (const s of stars) {
        // Parallax drift: nearer stars (higher z) move a touch faster.
        if (!reduced) {
          s.x -= (0.02 + s.z * 0.08)
          if (s.x < -2) {
            s.x = width + 2
            s.y = Math.random() * height
          }
        }
        const twinkle = reduced ? 0.75 : 0.55 + 0.45 * Math.sin(s.tw + t / (700 + s.z * 900))
        const r = 0.4 + s.z * 1.3
        ctx.beginPath()
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
        // A few stars carry the brand violet; most stay white.
        ctx.fillStyle =
          s.z > 0.92
            ? `rgba(196, 181, 253, ${0.5 * twinkle})`
            : `rgba(255, 255, 255, ${(0.25 + s.z * 0.55) * twinkle})`
        ctx.fill()
      }

      if (!reduced) {
        // Shooting star lifecycle.
        if (!meteor && t > nextMeteorAt) {
          const fromLeft = Math.random() < 0.5
          meteor = {
            x: fromLeft ? -20 : Math.random() * width * 0.7 + width * 0.3,
            y: Math.random() * height * 0.4,
            vx: (fromLeft ? 1 : 0.8) * (7 + Math.random() * 5),
            vy: 2.5 + Math.random() * 2,
            life: 70,
            max: 70,
          }
        }
        if (meteor) {
          const m = meteor
          const fade = m.life / m.max
          const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 8, m.y - m.vy * 8)
          grad.addColorStop(0, `rgba(224, 231, 255, ${0.85 * fade})`)
          grad.addColorStop(1, 'rgba(224, 231, 255, 0)')
          ctx.strokeStyle = grad
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.moveTo(m.x, m.y)
          ctx.lineTo(m.x - m.vx * 8, m.y - m.vy * 8)
          ctx.stroke()
          m.x += m.vx
          m.y += m.vy
          m.life -= 1
          if (m.life <= 0 || m.x > width + 60 || m.y > height + 60) {
            meteor = null
            nextMeteorAt = t + 5000 + Math.random() * 9000
          }
        }
      }
    }

    function loop(t: number) {
      if (!document.hidden) drawFrame(t)
      raf = requestAnimationFrame(loop)
    }

    resize()
    window.addEventListener('resize', resize)
    if (reduced) {
      drawFrame(0) // single static frame
    } else {
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden
    />
  )
}

/** Original stylized ship silhouettes — our own art, no CIG assets. */
function FighterSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 40" className={className} aria-hidden>
      <defs>
        <linearGradient id="nn-engine-a" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(96,165,250,0)" />
          <stop offset="1" stopColor="rgba(96,165,250,0.9)" />
        </linearGradient>
      </defs>
      {/* engine trail */}
      <rect x="-30" y="17" width="44" height="6" rx="3" fill="url(#nn-engine-a)" />
      {/* hull */}
      <path
        d="M14 20 L48 12 L92 16 L114 20 L92 24 L48 28 Z"
        fill="rgba(148,163,184,0.85)"
      />
      {/* wings */}
      <path d="M50 14 L70 2 L82 6 L64 15 Z" fill="rgba(100,116,139,0.8)" />
      <path d="M50 26 L70 38 L82 34 L64 25 Z" fill="rgba(100,116,139,0.8)" />
      {/* cockpit glow */}
      <ellipse cx="96" cy="20" rx="7" ry="3" fill="rgba(165,180,252,0.9)" />
    </svg>
  )
}

function FreighterSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="nn-engine-b" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(167,139,250,0)" />
          <stop offset="1" stopColor="rgba(167,139,250,0.85)" />
        </linearGradient>
      </defs>
      <rect x="-36" y="20" width="50" height="8" rx="4" fill="url(#nn-engine-b)" />
      {/* long hull with cargo segments */}
      <path d="M16 24 L34 14 L128 14 L150 24 L128 34 L34 34 Z" fill="rgba(148,163,184,0.75)" />
      <rect x="44" y="18" width="16" height="12" rx="2" fill="rgba(71,85,105,0.9)" />
      <rect x="66" y="18" width="16" height="12" rx="2" fill="rgba(71,85,105,0.9)" />
      <rect x="88" y="18" width="16" height="12" rx="2" fill="rgba(71,85,105,0.9)" />
      {/* bridge */}
      <path d="M118 18 L136 18 L144 24 L136 30 L118 30 Z" fill="rgba(100,116,139,0.9)" />
      <ellipse cx="138" cy="24" rx="4" ry="2.4" fill="rgba(196,181,253,0.9)" />
    </svg>
  )
}

function ShuttleSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 34" className={className} aria-hidden>
      <defs>
        <linearGradient id="nn-engine-c" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(217,70,239,0)" />
          <stop offset="1" stopColor="rgba(217,70,239,0.8)" />
        </linearGradient>
      </defs>
      <rect x="-24" y="14" width="34" height="5" rx="2.5" fill="url(#nn-engine-c)" />
      <path d="M10 17 L30 8 L72 12 L84 17 L72 22 L30 26 Z" fill="rgba(148,163,184,0.8)" />
      <path d="M34 10 L44 4 L52 8 Z" fill="rgba(100,116,139,0.85)" />
      <path d="M34 24 L44 30 L52 26 Z" fill="rgba(100,116,139,0.85)" />
      <ellipse cx="70" cy="17" rx="5" ry="2.6" fill="rgba(165,180,252,0.85)" />
    </svg>
  )
}

export default function SpaceBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <StarCanvas />

      {/* Breathing nebula glows */}
      <div className="nn-nebula nn-nebula-1" />
      <div className="nn-nebula nn-nebula-2" />
      <div className="nn-nebula nn-nebula-3" />

      {/* Distant planet rim on the horizon */}
      <div className="nn-planet" />

      {/* Ships on randomized flight paths (CSS keyframes in index.css) */}
      <div className="nn-ship nn-ship-1">
        <FighterSvg className="h-8 w-24 opacity-70" />
      </div>
      <div className="nn-ship nn-ship-2">
        <FreighterSvg className="h-9 w-32 opacity-50" />
      </div>
      <div className="nn-ship nn-ship-3">
        <ShuttleSvg className="h-6 w-16 opacity-60" />
      </div>
      <div className="nn-ship nn-ship-4">
        <FighterSvg className="h-5 w-14 opacity-40" />
      </div>

      {/* Quantum travel streaks */}
      <div className="nn-warp nn-warp-1" />
      <div className="nn-warp nn-warp-2" />
    </div>
  )
}
