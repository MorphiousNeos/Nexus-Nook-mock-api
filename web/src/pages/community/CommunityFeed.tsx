import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSession } from '../../SessionContext'
import { Button, Card, EmptyState, Field, Skeleton } from '../../components/ui'
import {
  communityAvailable,
  createPost,
  deletePost,
  isHttpUrl,
  listPosts,
  relativeTime,
  type FeedPost,
} from '../../services/community'
import CommunityNotice from './CommunityNotice'

export default function CommunityFeed() {
  const { state } = useSession()
  const me = state?.profile.displayName ?? ''

  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPosts(await listPosts())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the feed.')
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
    if (!body.trim() || busy) return
    setBusy(true)
    setFormError(null)
    try {
      await createPost({ body: body.trim(), imageUrl: imageUrl.trim() || undefined })
      setBody('')
      setImageUrl('')
      await refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not publish your post.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setRemovingId(id)
    try {
      await deletePost(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that post.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <Card title="Share an update" icon="✍️">
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Post
            </span>
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="What's happening in the verse?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <Field
            label="Image URL (optional)"
            placeholder="https://…"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          {formError && <p className="text-sm text-amber-300">{formError}</p>}
          <Button type="submit" disabled={busy || !body.trim()}>
            {busy ? 'Posting…' : 'Post'}
          </Button>
        </form>
      </Card>

      <Card
        title="Feed"
        icon="🌠"
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
          <EmptyState>The feed is quiet. Share the first update.</EmptyState>
        )}

        {!error && posts.length > 0 && (
          <ul className="space-y-3">
            {posts.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    {p.author || 'Unknown'} · {relativeTime(p.createdAt)}
                  </p>
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
                {p.body && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
                    {p.body}
                  </p>
                )}
                {isHttpUrl(p.imageUrl) && (
                  <img
                    src={p.imageUrl}
                    alt=""
                    loading="lazy"
                    className="mt-3 max-h-80 w-full rounded-lg border border-slate-800 object-cover"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
