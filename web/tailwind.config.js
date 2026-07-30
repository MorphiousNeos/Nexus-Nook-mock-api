/** @type {import('tailwindcss').Config} */

// Design tokens.
//
// Semantic rather than literal — `hull-900` instead of `slate-900`, `brand-500`
// instead of `purple-500` — so a screen says what a colour is *for*, and
// retuning the palette is one edit here instead of a sweep through every
// component. Before this existed the app had drifted to 79 distinct hard-coded
// colour values, with "brand purple" appearing at eight different shades.
//
// Every value below is the exact colour the app already used, so introducing
// the tokens changed nothing on screen. The point is to stop the drift, not to
// restyle — a restyle can now happen deliberately, from one place.
//
// The intent is a flight-operations console: legible one-handed, mid-run, on a
// phone. `accent` means "live" or "act here", never decoration.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral scaffolding: panels, dividers, body copy. Low numbers are
        // light (text), high numbers are dark (backgrounds).
        hull: {
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          // The page canvas: one step above chrome, one below a card.
          925: '#070d1a',
          950: '#020617',
        },
        // Edges and dividers. Named separately from the neutral ramp because
        // an edge is a role, not a shade — and because leaving it undefined is
        // silent: Tailwind emits nothing and every border falls back to the
        // preflight default, which is light grey on a near-black console.
        line: {
          subtle: '#161f2e',
          DEFAULT: '#1e293b',
          strong: '#334155',
        },
        // Identity, primary actions, selected state.
        brand: {
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          900: '#581c87',
          950: '#3b0764',
        },
        // Instrument cyan: live readouts and HUD chrome.
        accent: {
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          700: '#0e7490',
          950: '#083344',
        },
        // Status. Distinct from brand so meaning never rides on hue alone.
        positive: {
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          700: '#047857',
          900: '#064e3b',
          950: '#022c22',
        },
        caution: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          900: '#78350f',
          950: '#451a03',
        },
        danger: {
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
      },
      borderColor: {
        DEFAULT: '#1e293b',
      },
      fontFamily: {
        display: ['"Orbitron"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Readouts that must not reflow as digits tick.
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Instrument caption sitting above a value.
        label: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
        readout: ['2rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        card: '0.75rem',
        control: '0.5rem',
      },
      transitionDuration: {
        // One motion vocabulary: instant feedback, ui transitions, scene moves.
        snap: '120ms',
        ui: '220ms',
        scene: '420ms',
      },
      transitionTimingFunction: {
        // Decelerating — things arrive settled rather than stopping dead.
        ui: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      boxShadow: {
        // Depth comes from a plane sitting above another plane. These stay
        // near-black and tight — a shadow should read as separation, never as
        // a glow.
        card: '0 1px 2px rgb(2 6 23 / 0.5), 0 6px 16px -10px rgb(2 6 23 / 0.7)',
        lift: '0 2px 6px rgb(2 6 23 / 0.5), 0 18px 40px -16px rgb(2 6 23 / 0.7)',
        'glow-brand': '0 0 24px -4px rgb(168 85 247 / 0.45)',
        'glow-accent': '0 0 20px -4px rgb(34 211 238 / 0.5)',
      },
    },
  },
  plugins: [],
}
