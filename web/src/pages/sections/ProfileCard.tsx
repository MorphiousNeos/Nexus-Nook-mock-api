import { useEffect, useState } from 'react'
import { useSession } from '../../SessionContext'
import { Button, Card, Field } from '../../components/ui'

export default function ProfileCard() {
  const { state, updateProfile, deleteAccount, isDemo } = useSession()
  const profile = state!.profile
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [email, setEmail] = useState(profile.email)
  const [rsiHandle, setRsiHandle] = useState(profile.rsiHandle)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  async function handleDelete() {
    setDeleteError(null)
    const phrase = window.prompt(
      'This permanently deletes your account and ALL data — fleet, inventory, ' +
        'blueprints, posts, listings, and orgs you own. This cannot be undone.\n\n' +
        'Type DELETE to confirm.',
    )
    if (phrase === null) return
    if (phrase.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Deletion cancelled — you must type DELETE to confirm.')
      return
    }
    setDeleteBusy(true)
    try {
      await deleteAccount()
      // Session state clears via context; the router falls back to the landing page.
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Could not delete the account. Try again.',
      )
      setDeleteBusy(false)
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

        <div className="mt-2 rounded-xl border border-red-900/50 bg-red-950/10 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-red-400">
            Danger zone
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {isDemo
              ? 'Deleting removes all demo data stored in this browser.'
              : 'Deleting permanently removes your account and everything attached to it. See the '}
            {!isDemo && (
              <a href="#/privacy" className="underline hover:text-slate-300">
                privacy policy
              </a>
            )}
            {!isDemo && ' for details.'}
          </p>
          {deleteError && <p className="mt-2 text-xs text-amber-300">{deleteError}</p>}
          <Button
            variant="danger"
            className="mt-3"
            onClick={handleDelete}
            disabled={deleteBusy}
          >
            {deleteBusy ? 'Deleting…' : 'Delete account'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
