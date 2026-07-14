import { useEffect, useRef } from 'react'

/**
 * Cinematic deep-space backdrop for the landing page.
 *
 * Layers (back to front):
 *  1. Canvas starfield — three parallax depths, twinkle, occasional shooting star.
 *  2. A distant capital ship crossing very slowly (rows of lit windows).
 *  3. Nebula glows — CSS radial gradients that slowly breathe (see index.css).
 *  4. Ships — ORIGINAL detailed designs (ours, not CIG art): layered hull
 *     shading, panel lines, canopy glow, multi-nozzle engines, blinking nav
 *     strobes — flying varied keyframe paths, plus quantum "warp streaks".
 *
 * Honors prefers-reduced-motion: the canvas renders one static frame and all
 * moving craft are hidden via CSS.
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
  life: number
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
        if (!reduced) {
          s.x -= 0.02 + s.z * 0.08
          if (s.x < -2) {
            s.x = width + 2
            s.y = Math.random() * height
          }
        }
        const twinkle = reduced ? 0.75 : 0.55 + 0.45 * Math.sin(s.tw + t / (700 + s.z * 900))
        const r = 0.4 + s.z * 1.3
        ctx.beginPath()
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
        ctx.fillStyle =
          s.z > 0.92
            ? `rgba(196, 181, 253, ${0.5 * twinkle})`
            : `rgba(255, 255, 255, ${(0.25 + s.z * 0.55) * twinkle})`
        ctx.fill()
      }

      if (!reduced) {
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
      drawFrame(0)
    } else {
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
}

/* =============================================================================
   ORIGINAL SHIP DESIGNS — layered hull shading, panel lines, canopy glow,
   multi-nozzle engines, blinking nav strobes. Ours, not CIG assets.
   ========================================================================== */

/** Sleek military interceptor — chined nose, twin engines, canted fins. */
function InterceptorSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 80" className={className} aria-hidden>
      <defs>
        <linearGradient id="nn-hull-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#64748b" />
          <stop offset="0.45" stopColor="#475569" />
          <stop offset="1" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="nn-exh-a" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="rgba(125,211,252,0.95)" />
          <stop offset="0.35" stopColor="rgba(56,189,248,0.55)" />
          <stop offset="1" stopColor="rgba(56,189,248,0)" />
        </linearGradient>
        <radialGradient id="nn-nozzle-a" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#e0f2fe" />
          <stop offset="0.5" stopColor="#38bdf8" />
          <stop offset="1" stopColor="rgba(56,189,248,0)" />
        </radialGradient>
      </defs>

      {/* engine exhaust plumes */}
      <rect x="-52" y="30" width="78" height="7" rx="3.5" fill="url(#nn-exh-a)" />
      <rect x="-42" y="43" width="68" height="6" rx="3" fill="url(#nn-exh-a)" opacity="0.8" />

      {/* lower fin (canted) */}
      <path d="M62 46 L44 72 L58 70 L78 48 Z" fill="#1e293b" />
      {/* main hull — long chined wedge */}
      <path
        d="M24 34 L48 24 L118 18 L196 26 L234 38 L196 50 L118 54 L48 50 Z"
        fill="url(#nn-hull-a)"
      />
      {/* dorsal fin */}
      <path d="M78 24 L96 4 L108 6 L98 22 Z" fill="#334155" />
      {/* raised spine */}
      <path d="M60 27 L150 22 L196 28 L150 32 Z" fill="#475569" opacity="0.9" />
      {/* wing root shadowing */}
      <path d="M70 44 L150 46 L120 52 L80 50 Z" fill="#0f172a" opacity="0.55" />

      {/* panel lines */}
      <g stroke="#0f172a" strokeWidth="0.8" opacity="0.5" fill="none">
        <path d="M64 28 L64 48" />
        <path d="M96 24 L96 51" />
        <path d="M132 21 L132 52" />
        <path d="M168 24 L168 50" />
        <path d="M48 26 L196 30" />
      </g>
      {/* weathering streaks */}
      <path d="M100 36 L160 37 L158 40 L102 39 Z" fill="#0f172a" opacity="0.25" />

      {/* cockpit canopy */}
      <path d="M176 26 L206 30 L212 37 L200 42 L176 40 Z" fill="#0ea5e9" opacity="0.9" />
      <path d="M180 28 L202 31 L205 34 L182 32 Z" fill="#e0f2fe" opacity="0.7" />

      {/* engine nozzles */}
      <circle cx="27" cy="33.5" r="6.5" fill="url(#nn-nozzle-a)" />
      <circle cx="28" cy="46" r="5.5" fill="url(#nn-nozzle-a)" />
      {/* intake slit */}
      <path d="M54 38 L74 36 L74 42 L54 43 Z" fill="#020617" opacity="0.8" />

      {/* nav strobes: red port (top), white tail */}
      <circle className="nn-strobe" cx="102" cy="5" r="2" fill="#f87171" />
      <circle className="nn-strobe-slow" cx="46" cy="70" r="1.8" fill="#f8fafc" />
    </svg>
  )
}

/** Heavy industrial freighter — long spine, cargo blocks, forward bridge. */
function FreighterSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 100" className={className} aria-hidden>
      <defs>
        <linearGradient id="nn-hull-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#57534e" />
          <stop offset="0.5" stopColor="#44403c" />
          <stop offset="1" stopColor="#1c1917" />
        </linearGradient>
        <linearGradient id="nn-exh-b" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="rgba(196,181,253,0.9)" />
          <stop offset="0.4" stopColor="rgba(167,139,250,0.5)" />
          <stop offset="1" stopColor="rgba(167,139,250,0)" />
        </linearGradient>
        <radialGradient id="nn-nozzle-b" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ede9fe" />
          <stop offset="0.5" stopColor="#a78bfa" />
          <stop offset="1" stopColor="rgba(167,139,250,0)" />
        </radialGradient>
      </defs>

      {/* exhaust plumes from engine cluster */}
      <rect x="-60" y="34" width="86" height="8" rx="4" fill="url(#nn-exh-b)" />
      <rect x="-52" y="48" width="78" height="8" rx="4" fill="url(#nn-exh-b)" opacity="0.85" />
      <rect x="-44" y="62" width="70" height="7" rx="3.5" fill="url(#nn-exh-b)" opacity="0.7" />

      {/* keel spine */}
      <path d="M30 40 L60 32 L300 34 L332 48 L300 64 L60 66 Z" fill="url(#nn-hull-b)" />

      {/* cargo containers — industrial blocks with seams */}
      <g>
        <rect x="82" y="24" width="34" height="24" rx="2" fill="#3f3f46" />
        <rect x="120" y="24" width="34" height="24" rx="2" fill="#52525b" />
        <rect x="158" y="24" width="34" height="24" rx="2" fill="#3f3f46" />
        <rect x="196" y="24" width="34" height="24" rx="2" fill="#52525b" />
        <rect x="82" y="52" width="34" height="22" rx="2" fill="#52525b" />
        <rect x="120" y="52" width="34" height="22" rx="2" fill="#3f3f46" />
        <rect x="158" y="52" width="34" height="22" rx="2" fill="#52525b" />
        <rect x="196" y="52" width="34" height="22" rx="2" fill="#3f3f46" />
        {/* container ribs */}
        <g stroke="#18181b" strokeWidth="1" opacity="0.7">
          <path d="M99 24 L99 48 M137 24 L137 48 M175 24 L175 48 M213 24 L213 48" />
          <path d="M99 52 L99 74 M137 52 L137 74 M175 52 L175 74 M213 52 L213 74" />
        </g>
      </g>

      {/* forward bridge / cab */}
      <path d="M238 26 L282 28 L300 40 L300 58 L282 68 L238 70 Z" fill="#57534e" />
      <path d="M262 34 L292 40 L292 46 L262 42 Z" fill="#0ea5e9" opacity="0.85" />
      <path d="M264 36 L286 40 L286 42 L264 39 Z" fill="#e0f2fe" opacity="0.6" />

      {/* engine block */}
      <path d="M30 36 L58 30 L58 70 L30 64 Z" fill="#292524" />
      <circle cx="33" cy="38" r="7" fill="url(#nn-nozzle-b)" />
      <circle cx="32" cy="52" r="7.5" fill="url(#nn-nozzle-b)" />
      <circle cx="33" cy="65" r="6" fill="url(#nn-nozzle-b)" />

      {/* panel lines + weathering */}
      <g stroke="#18181b" strokeWidth="0.9" opacity="0.5" fill="none">
        <path d="M64 40 L296 42" />
        <path d="M64 58 L296 60" />
      </g>
      <path d="M90 44 L200 46 L198 50 L92 48 Z" fill="#0c0a09" opacity="0.3" />

      {/* running lights along the spine */}
      <g fill="#fbbf24" opacity="0.8">
        <circle cx="90" cy="50" r="1.2" />
        <circle cx="130" cy="50" r="1.2" />
        <circle cx="170" cy="50" r="1.2" />
        <circle cx="210" cy="50" r="1.2" />
      </g>

      {/* nav strobes */}
      <circle className="nn-strobe" cx="332" cy="48" r="2.2" fill="#4ade80" />
      <circle className="nn-strobe-slow" cx="30" cy="40" r="2" fill="#f87171" />
    </svg>
  )
}

/** Angular gunship — armored prow, side thruster pods, dorsal turret. */
function GunshipSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 70" className={className} aria-hidden>
      <defs>
        <linearGradient id="nn-hull-c" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4b5563" />
          <stop offset="0.5" stopColor="#374151" />
          <stop offset="1" stopColor="#111827" />
        </linearGradient>
        <linearGradient id="nn-exh-c" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="rgba(232,121,249,0.9)" />
          <stop offset="0.4" stopColor="rgba(217,70,239,0.5)" />
          <stop offset="1" stopColor="rgba(217,70,239,0)" />
        </linearGradient>
        <radialGradient id="nn-nozzle-c" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fdf4ff" />
          <stop offset="0.5" stopColor="#e879f9" />
          <stop offset="1" stopColor="rgba(232,121,249,0)" />
        </radialGradient>
      </defs>

      <rect x="-40" y="30" width="62" height="6" rx="3" fill="url(#nn-exh-c)" />
      <rect x="-34" y="41" width="56" height="5" rx="2.5" fill="url(#nn-exh-c)" opacity="0.8" />

      {/* dorsal turret */}
      <circle cx="96" cy="20" r="7" fill="#374151" />
      <rect x="96" y="16" width="22" height="3.5" rx="1.5" fill="#1f2937" />
      <rect x="96" y="21" width="22" height="3.5" rx="1.5" fill="#1f2937" />

      {/* armored hull */}
      <path
        d="M22 32 L44 22 L120 18 L168 26 L194 36 L168 48 L120 54 L44 50 Z"
        fill="url(#nn-hull-c)"
      />
      {/* prow armor chevrons */}
      <path d="M158 26 L186 35 L158 46 L150 44 L172 36 L150 28 Z" fill="#1f2937" />
      {/* side thruster pod */}
      <path d="M56 48 L84 50 L80 62 L60 60 Z" fill="#1f2937" />
      <circle cx="60" cy="56" r="3.5" fill="url(#nn-nozzle-c)" />

      {/* canopy strip */}
      <path d="M126 26 L156 30 L156 36 L126 34 Z" fill="#0ea5e9" opacity="0.85" />
      <path d="M128 27 L150 30 L150 32 L128 30 Z" fill="#e0f2fe" opacity="0.55" />

      {/* panel lines */}
      <g stroke="#0b1220" strokeWidth="0.8" opacity="0.5" fill="none">
        <path d="M72 22 L72 50" />
        <path d="M104 19 L104 53" />
        <path d="M140 22 L140 50" />
      </g>

      {/* engines */}
      <circle cx="25" cy="33" r="5.5" fill="url(#nn-nozzle-c)" />
      <circle cx="26" cy="43.5" r="4.5" fill="url(#nn-nozzle-c)" />

      {/* strobes */}
      <circle className="nn-strobe" cx="96" cy="12" r="1.8" fill="#f87171" />
      <circle className="nn-strobe-slow" cx="194" cy="36" r="1.8" fill="#4ade80" />
    </svg>
  )
}

/** Distant capital ship — long destroyer silhouette, rows of lit windows. */
function CapitalSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 90" className={className} aria-hidden>
      <defs>
        <linearGradient id="nn-hull-d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e293b" />
          <stop offset="1" stopColor="#0b1220" />
        </linearGradient>
        <radialGradient id="nn-nozzle-d" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#bae6fd" />
          <stop offset="0.6" stopColor="rgba(56,189,248,0.5)" />
          <stop offset="1" stopColor="rgba(56,189,248,0)" />
        </radialGradient>
      </defs>

      {/* main hull — long tapered wedge */}
      <path d="M14 46 L70 34 L360 28 L470 44 L360 62 L70 58 Z" fill="url(#nn-hull-d)" />
      {/* upper superstructure + bridge tower */}
      <path d="M150 30 L300 26 L330 34 L160 36 Z" fill="#16213a" />
      <path d="M250 14 L282 12 L290 28 L252 30 Z" fill="#1e293b" />
      {/* ventral spine */}
      <path d="M110 56 L330 54 L300 66 L140 64 Z" fill="#0a1020" />

      {/* engine cluster */}
      <circle cx="18" cy="42" r="6" fill="url(#nn-nozzle-d)" />
      <circle cx="16" cy="50" r="7" fill="url(#nn-nozzle-d)" />
      <circle cx="19" cy="57" r="5" fill="url(#nn-nozzle-d)" />

      {/* rows of lit windows */}
      <g fill="#93c5fd" opacity="0.75">
        {Array.from({ length: 22 }, (_, i) => (
          <rect key={`w1-${i}`} x={92 + i * 13} y={40} width={3.4} height={1.8} rx={0.5} />
        ))}
        {Array.from({ length: 17 }, (_, i) => (
          <rect key={`w2-${i}`} x={120 + i * 13} y={48} width={3.4} height={1.8} rx={0.5} />
        ))}
        {Array.from({ length: 3 }, (_, i) => (
          <rect key={`w3-${i}`} x={258 + i * 9} y={18} width={3} height={2} rx={0.5} />
        ))}
      </g>

      {/* strobes at bow and mast */}
      <circle className="nn-strobe-slow" cx="470" cy="44" r="2" fill="#f8fafc" />
      <circle className="nn-strobe" cx="268" cy="10" r="1.8" fill="#f87171" />
    </svg>
  )
}

export default function SpaceBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <StarCanvas />

      {/* Distant capital ship — behind the nebulas so it reads far away */}
      <div className="nn-ship nn-ship-cap">
        <CapitalSvg className="h-16 w-[26rem] opacity-30 blur-[0.6px] sm:h-20 sm:w-[32rem]" />
      </div>

      {/* Breathing nebula glows */}
      <div className="nn-nebula nn-nebula-1" />
      <div className="nn-nebula nn-nebula-2" />
      <div className="nn-nebula nn-nebula-3" />

      {/* Distant planet rim on the horizon */}
      <div className="nn-planet" />

      {/* Ships on randomized flight paths (CSS keyframes in index.css) */}
      <div className="nn-ship nn-ship-1">
        <InterceptorSvg className="h-11 w-36 opacity-80" />
      </div>
      <div className="nn-ship nn-ship-2">
        <FreighterSvg className="h-14 w-52 opacity-60" />
      </div>
      <div className="nn-ship nn-ship-3">
        <GunshipSvg className="h-9 w-28 opacity-70" />
      </div>
      <div className="nn-ship nn-ship-4">
        <InterceptorSvg className="h-7 w-24 opacity-45" />
      </div>

      {/* Quantum travel streaks */}
      <div className="nn-warp nn-warp-1" />
      <div className="nn-warp nn-warp-2" />
    </div>
  )
}
