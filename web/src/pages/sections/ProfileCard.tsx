import { useEffect, useState } from 'react'
import { useSession } from '../../SessionContext'
import { Button, Card, Field } from '../../components/ui'

export default function ProfileCard() {
  const { state, updateProfile } = useSession()
  const profile = state!.profile
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [email, setEmail] = useState(profile.email)
  const [rsiHandle, setRsiHandle] = useState(profile.rsiHandle)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setDisplayName(profile.displayName)
    setEmail(profile.email)
    setRsiHandle(profile.rsiHandle)
  }, [profile])

  const dirty =
    displayName !== profile.displayName ||
    email !== profile.email ||
    rsiHandle !== profile.rsiHandle

  async function save() {
    setBusy(true)
    try {
      await updateProfile({ displayName, email, rsiHandle })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Profile / Account" icon="🛰️">
      <div className="space-y-4">
        <Field
          label="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Public RSI handle"
          placeholder="e.g. StarHopper"
          hint="Display only. We never ask for your RSI password."
          value={rsiHandle}
          onChange={(e) => setRsiHandle(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={!dirty || busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </Button>
          {saved && <span className="text-sm text-emerald-400">Saved ✓</span>}
        </div>
        <p className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
          Your RSI handle is the public citizen name from your profile. Nexus Nook never
          asks for, stores, or transmits an RSI password and never logs into your account.
        </p>
      </div>
    </Card>
  )
}
