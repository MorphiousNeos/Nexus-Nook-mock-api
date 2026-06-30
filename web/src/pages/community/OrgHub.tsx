import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Badge, Button, Card, EmptyState, Field, Skeleton } from '../../components/ui'
import {
  communityAvailable,
  createOrg,
  listOrgs,
  normalizeRsiSid,
  relativeTime,
  rsiOrgUrl,
  type OrgSummary,
} from '../../services/community'
import CommunityNotice from './CommunityNotice'
import OrgDetail from './OrgDetail'

export default function OrgHub() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [orgs, setOrgs] = useState<OrgSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [description, setDescription] = useState('')
  const [rsiSid, setRsiSid] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const sidPreview = normalizeRsiSid(rsiSid)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setOrgs(await listOrgs())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orgs.')
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

  if (selectedId) {
    return (
      <OrgDetail
        orgId={selectedId}
        onBack={() => setSelectedId(null)}
        onChanged={refresh}
      />
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setFormError(null)
    try {
      await createOrg({
        name: name.trim(),
        tag: tag.trim(),
        description: description.trim(),
        rsiSid: sidPreview || undefined,
      })
      setName('')
      setTag('')
      setDescription('')
      setRsiSid('')
      await refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create that org.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card title="Found an org" icon="🌌">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Name"
            placeholder="Crimson Vanguard"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Field
            label="Tag"
            placeholder="CRMSN"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Description
            </span>
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="A crew built around bunkers, hauling, and good company."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Link to RSI org (optional)
            </span>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="SID (e.g. CRMSN) or the org URL from robertsspaceindustries.com"
              value={rsiSid}
              onChange={(e) => setRsiSid(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Public SID only — we link out to the org's page on RSI. No login, no
              scraping, no member rosters pulled from RSI.
              {rsiSid && !sidPreview && (
                <span className="ml-1 text-amber-300">
                  Doesn't look like a valid SID.
                </span>
              )}
              {sidPreview && (
                <span className="ml-1 text-purple-300">
                  Will link to{' '}
                  <a
                    className="underline"
                    href={rsiOrgUrl(sidPreview)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    /orgs/{sidPreview}
                  </a>
                  .
                </span>
              )}
            </p>
          </label>
          {formError && (
            <p className="text-sm text-amber-300 sm:col-span-2">{formError}</p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? 'Creating…' : 'Create org'}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title="Organizations"
        icon="🛰️"
        action={
          <Button variant="ghost" onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        }
      >
        {error && <EmptyState icon="⚠️">{error}</EmptyState>}

        {!error && loading && orgs.length === 0 && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {!error && !loading && orgs.length === 0 && (
          <EmptyState>No orgs yet. Found the first one.</EmptyState>
        )}

        {!error && orgs.length > 0 && (
          <ul className="space-y-2">
            {orgs.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(o.id)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3 text-left transition hover:border-purple-700/60 hover:bg-slate-900/60 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-100">
                          {o.name || 'Untitled org'}
                        </span>
                        {o.tag && <Badge tone="purple">[{o.tag}]</Badge>}
                        {o.rsiSid && (
                          <span
                            title={`Linked RSI org: ${o.rsiSid}`}
                            className="rounded bg-blue-950/60 px-1.5 py-0.5 text-[10px] font-medium text-blue-300"
                          >
                            RSI · {o.rsiSid}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {o.owner || 'Unknown'} ·{' '}
                        {o.memberCount !== undefined
                          ? `${o.memberCount} ${o.memberCount === 1 ? 'member' : 'members'} · `
                          : ''}
                        {relativeTime(o.createdAt)}
                      </p>
                    </div>
                  </div>
                  {o.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-300">
                      {o.description}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
