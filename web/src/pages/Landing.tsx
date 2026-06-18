import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../SessionContext'
import { Button, Field } from '../components/ui'
import DiscordButton from '../components/DiscordButton'

export default function Landing() {
  const { enter, state, isDemo } = useSession()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [rsiHandle, setRsiHandle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (state) navigate('/dashboard', { replace: true })
  }, [state, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!displayName.trim() || !email.trim()) {
      setError('A display name and email are required.')
      return
    }
    setBusy(true)
    try {
      await enter({ displayName, email, rsiHandle })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enter. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 md:items-center md:py-20">
      <section className="text-center md:text-left">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-700/50 bg-purple-950/40 px-3 py-1 text-xs uppercase tracking-widest text-purple-200">
          Unofficial fan companion
        </div>
        <h1 className="font-display text-5xl font-bold leading-tight md:text-6xl">
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            Nexus Nook
          </span>
        </h1>
        <p className="mt-4 text-lg text-slate-300">
          A cozy nook in the wide expanse of the Nexus. Track your fleet, manage your
          inventory, and watch server status — all in one place.
        </p>
        <p className="mt-3 text-sm text-slate-400">
          A companion app for Star Citizen players. Bring your own public RSI handle; we
          never ask for a password.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:items-start">
          <DiscordButton />
          {isDemo && (
            <span className="text-xs text-slate-500">
              Running in demo mode — your data stays in this browser.
            </span>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
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
        <p className="mt-4 text-center text-xs text-slate-500">
          No password required. This is a free, fan-made tool.
        </p>
      </section>
    </main>
  )
}
