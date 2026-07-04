import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSession } from '../../SessionContext'
import { Badge, Button, Card, EmptyState, Field, Skeleton } from '../../components/ui'
import {
  communityAvailable,
  createListing,
  deleteListing,
  listMarket,
  relativeTime,
  type Listing,
  type ListingKind,
} from '../../services/community'
import CommunityNotice from './CommunityNotice'
import ReportButton from './ReportButton'

const KIND_TONE: Record<ListingKind, 'green' | 'purple' | 'amber'> = {
  sell: 'green',
  buy: 'purple',
  trade: 'amber',
}

const KIND_LABEL: Record<ListingKind, string> = {
  sell: 'Selling',
  buy: 'Buying',
  trade: 'Trade',
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('en-US')} aUEC`
}

export default function Marketplace() {
  const { state } = useSession()
  const me = state?.profile.displayName ?? ''

  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [kind, setKind] = useState<ListingKind>('sell')
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setListings(await listMarket())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the marketplace.')
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
      await createListing({
        kind,
        title: title.trim(),
        price: price.trim() ? Number(price) : undefined,
        body: body.trim(),
      })
      setTitle('')
      setPrice('')
      setBody('')
      setKind('sell')
      await refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the listing.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setRemovingId(id)
    try {
      await deleteListing(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that listing.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <Card title="Create listing" icon="🏷️">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Kind
            </span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ListingKind)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="sell">Sell</option>
              <option value="buy">Buy</option>
              <option value="trade">Trade</option>
            </select>
          </label>
          <Field
            label="Price (aUEC, optional)"
            type="number"
            min={0}
            placeholder="50000"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Field
              label="Title"
              placeholder="Selling spare medical supplies"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Details
            </span>
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="Quantity, location, terms…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          {formError && (
            <p className="text-sm text-amber-300 sm:col-span-2">{formError}</p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy || !title.trim()}>
              {busy ? 'Posting…' : 'Create listing'}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title="Listings"
        icon="🛒"
        action={
          <Button variant="ghost" onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        }
      >
        {error && <EmptyState icon="⚠️">{error}</EmptyState>}

        {!error && loading && listings.length === 0 && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {!error && !loading && listings.length === 0 && (
          <EmptyState>No listings yet. Post the first one.</EmptyState>
        )}

        {!error && listings.length > 0 && (
          <ul className="space-y-2">
            {listings.map((l) => (
              <li
                key={l.id}
                className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={KIND_TONE[l.kind]}>{KIND_LABEL[l.kind]}</Badge>
                      <span className="font-medium text-slate-100">
                        {l.title || 'Untitled'}
                      </span>
                      {l.price !== undefined && (
                        <span className="text-sm font-medium text-emerald-300">
                          {formatPrice(l.price)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {l.author || 'Unknown'} · {relativeTime(l.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {me && l.author !== me && <ReportButton kind="market" contentId={l.id} />}
                    {me && l.author === me && (
                      <Button
                        variant="danger"
                        onClick={() => remove(l.id)}
                        disabled={removingId === l.id}
                      >
                        {removingId === l.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    )}
                  </div>
                </div>
                {l.body && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                    {l.body}
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
