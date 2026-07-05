import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../SessionContext'
import { Button, Field } from '../components/ui'
import DiscordButton from '../components/DiscordButton'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')

export default function Landing() {
  const { enter, state, isDemo } = useSession()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rsiHandle, setRsiHandle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (state) navigate('/overview', { replace: true })
  }, [state, navigate])

  // Surface a Discord sign-in failure stashed by main.tsx during boot.
  useEffect(() => {
    const stashed = sessionStorage.getItem('nexus-nook:oauth-error')
    if (stashed) {
      sessionStorage.removeItem('nexus-nook:oauth-error')
      setError(stashed)
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!displayName.trim() || !email.trim()) {
      setError('A display name and email are required.')
      return
    }
    if (!isDemo && password.length < 8) {
      setError('Please use a password of at least 8 characters.')
      return
    }
    setBusy(true)
    try {
      await enter({ displayName, email, rsiHandle, password })
      navigate('/overview', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enter. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const features = [
    { icon: '🚀', label: 'Fleet' },
    { icon: '📦', label: 'Inventory' },
    { icon: '💱', label: 'Trade routes' },
    { icon: '🛰️', label: 'Server status' },
  ]

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 md:items-center md:py-20">
      <section className="text-center md:text-left">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-purple-700/50 bg-purple-950/40 px-3 py-1 text-xs uppercase tracking-widest text-purple-200">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-300" aria-hidden />
          Unofficial fan companion
        </div>
        <div className="mb-6 flex items-center justify-center gap-4 md:justify-start">
          <img
            src="./icon.svg"
            alt="Nexus Nook"
            width={64}
            height={64}
            className="h-16 w-16 drop-shadow-[0_0_18px_rgba(124,58,237,0.45)]"
          />
          <h1 className="font-display text-5xl font-bold leading-tight md:text-6xl">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Nexus Nook
            </span>
          </h1>
        </div>
        <p className="mt-4 text-lg text-slate-300">
          A cozy nook in the wide expanse of the Nexus. Track your fleet, manage your
          inventory, and watch server status — all in one place.
        </p>
        <p className="mt-3 text-sm text-slate-400">
          A companion app for Star Citizen players. Bring your own public RSI handle; we
          never ask for a password.
        </p>

        <ul className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
          {features.map((f) => (
            <li
              key={f.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300"
            >
              <span aria-hidden>{f.icon}</span>
              {f.label}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:items-start">
          <DiscordButton />
          {isDemo && (
            <span className="text-xs text-slate-500">
              Running in demo mode — your data stays in this browser.
            </span>
          )}
        </div>
      </section>

      <section className="relative rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-7">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"
        />
        <h2 className="font-display text-xl font-semibold">Enter the Nook</h2>
        <p className="mt-1 text-sm text-slate-400">
          {isDemo
            ? 'Demo mode creates a local profile on this device. No account needed.'
            : 'Enter to create or resume your account.'}
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Field
            label="Display name"
            placeholder="Citizen name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="nickname"
          />
          <Field
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          {!isDemo && (
            <Field
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              hint="Your Nexus Nook password — never your RSI password."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          )}
          <Field
            label="Public RSI handle (optional)"
            placeholder="e.g. StarHopper"
            hint="Your public citizen handle, display only. Never a password."
            value={rsiHandle}
            onChange={(e) => setRsiHandle(e.target.value)}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Entering…' : 'Enter Nexus Nook'}
          </Button>
        </form>

        {!isDemo && API_BASE && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-widest text-slate-600">
              <span className="h-px flex-1 bg-slate-800" aria-hidden />
              or
              <span className="h-px flex-1 bg-slate-800" aria-hidden />
            </div>
            <a
              href={`${API_BASE}/api/auth/discord`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4752c4] focus:outline-none focus:ring-2 focus:ring-[#5865F2]/60"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
                <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Sign in with Discord
            </a>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              We only read your Discord display name — never your servers or messages.
            </p>
          </>
        )}

        <p className="mt-4 text-center text-xs text-slate-500">
          {isDemo
            ? 'No password required. This is a free, fan-made tool.'
            : 'Free, fan-made tool. We never ask for your RSI password.'}
        </p>
      </section>
    </main>
  )
}
