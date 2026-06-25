import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSession } from '../../SessionContext'
import { Badge, Button, Card, EmptyState, Field, Skeleton } from '../../components/ui'
import {
  communityAvailable,
  createLfg,
  deleteLfg,
  listLfg,
  relativeTime,
  type LfgPost,
} from '../../services/community'
import CommunityNotice from './CommunityNotice'

export default function LfgBoard() {
  const { state } = useSession()
  const me = state?.profile.displayName ?? ''

  const [posts, setPosts] = useState<LfgPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [activity, setActivity] = useState('')
  const [region, setRegion] = useState('')
  const [players, setPlayers] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPosts(await listLfg())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load LFG posts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!communityAvailable) {
      setLoading(false)
      return
    }
    void refresh()
  }, [refresh])

  if (!communityAvailable) return <CommunityNotice />

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || busy) return
    setBusy(true)
    setFormError(null)
    try {
      await createLfg({
        title: title.trim(),
        activity: activity.trim(),
        region: region.trim(),
        playersNeeded: players.trim() ? Number(players) : undefined,
        body: body.trim(),
      })
      setTitle('')
      setActivity('')
      setRegion('')
      setPlayers('')
      setBody('')
      await refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not post your request.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setRemovingId(id)
    try {
      await deleteLfg(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that post.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <Card title="Post a request" icon="📣">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field
              label="Title"
              placeholder="Need 2 for bunker clearing"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <Field
            label="Activity"
            placeholder="Bunkers, mining, racing…"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
          />
          <Field
            label="Region"
            placeholder="US-East, EU, APAC…"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
          <Field
            label="Players needed"
            type="number"
            min={1}
            placeholder="2"
            value={players}
            onChange={(e) => setPlayers(e.target.value)}
          />
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Details
            </span>
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="Voice required, friendly crew, etc."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          {formError && (
            <p className="text-sm text-amber-300 sm:col-span-2">{formError}</p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy || !title.trim()}>
              {busy ? 'Posting…' : 'Post request'}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title="Open requests"
        icon="🎯"
        action={
          <Button variant="ghost" onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        }
      >
        {error && <EmptyState icon="⚠️">{error}</EmptyState>}

        {!error && loading && posts.length === 0 && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {!error && !loading && posts.length === 0 && (
          <EmptyState>No open requests yet. Be the first to post one.</EmptyState>
        )}

        {!error && posts.length > 0 && (
          <ul className="space-y-2">
            {posts.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-100">{p.title || 'Untitled'}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {p.author || 'Unknown'} · {relativeTime(p.createdAt)}
                    </p>
                  </div>
                  {me && p.author === me && (
                    <Button
                      variant="danger"
                      className="shrink-0"
                      onClick={() => remove(p.id)}
                      disabled={removingId === p.id}
                    >
                      {removingId === p.id ? 'Deleting…' : 'Delete'}
                    </Button>
                  )}
                </div>
                {(p.activity || p.region || p.playersNeeded !== undefined) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.activity && <Badge tone="purple">{p.activity}</Badge>}
                    {p.region && <Badge tone="slate">{p.region}</Badge>}
                    {p.playersNeeded !== undefined && (
                      <Badge tone="green">
                        {p.playersNeeded} {p.playersNeeded === 1 ? 'player' : 'players'}
                      </Badge>
                    )}
                  </div>
                )}
                {p.body && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                    {p.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
