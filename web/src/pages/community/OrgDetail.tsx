import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSession } from '../../SessionContext'
import { Badge, Button, Card, EmptyState, Field, Skeleton } from '../../components/ui'
import {
  createOp,
  deleteOp,
  deleteOrg,
  formatDateTime,
  getOrg,
  joinOrg,
  leaveOrg,
  relativeTime,
  rsiOrgUrl,
  rsiSpectrumUrl,
  type OrgDetail as OrgDetailData,
} from '../../services/community'

export default function OrgDetail({
  orgId,
  onBack,
  onChanged,
}: {
  orgId: string
  onBack: () => void
  onChanged: () => void
}) {
  const { state } = useSession()
  const me = state?.profile.displayName ?? ''

  const [org, setOrg] = useState<OrgDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [body, setBody] = useState('')
  const [opBusy, setOpBusy] = useState(false)
  const [opError, setOpError] = useState<string | null>(null)
  const [removingOpId, setRemovingOpId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setOrg(await getOrg(orgId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this org.')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const isOwner = !!me && !!org && org.owner === me
  const isMember =
    isOwner || (!!me && !!org && org.members.some((m) => m.name === me))

  async function runAction(fn: () => Promise<void>, fallback: string) {
    setActionBusy(true)
    setActionError(null)
    try {
      await fn()
      await refresh()
      onChanged()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : fallback)
    } finally {
      setActionBusy(false)
    }
  }

  async function handleDeleteOrg() {
    if (!org) return
    if (!window.confirm(`Delete "${org.name}"? This cannot be undone.`)) return
    setActionBusy(true)
    setActionError(null)
    try {
      await deleteOrg(org.id)
      onChanged()
      onBack()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete this org.')
      setActionBusy(false)
    }
  }

  async function submitOp(e: FormEvent) {
    e.preventDefault()
    if (!org || !title.trim() || opBusy) return
    setOpBusy(true)
    setOpError(null)
    try {
      await createOp(org.id, {
        title: title.trim(),
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        body: body.trim(),
      })
      setTitle('')
      setStartsAt('')
      setBody('')
      await refresh()
      onChanged()
    } catch (err) {
      setOpError(err instanceof Error ? err.message : 'Could not schedule that op.')
    } finally {
      setOpBusy(false)
    }
  }

  async function removeOp(opId: string) {
    if (!org) return
    setRemovingOpId(opId)
    try {
      await deleteOp(org.id, opId)
      await refresh()
      onChanged()
    } catch (err) {
      setOpError(err instanceof Error ? err.message : 'Could not delete that op.')
    } finally {
      setRemovingOpId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" onClick={onBack}>
          ← Back to orgs
        </Button>
      </div>

      {error && (
        <Card title="Org" icon="🌌">
          <EmptyState icon="⚠️">{error}</EmptyState>
        </Card>
      )}

      {!error && loading && !org && (
        <Card title="Loading org" icon="🌌">
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      )}

      {!error && org && (
        <>
          <Card
            title={org.name || 'Untitled org'}
            icon="🌌"
            action={
              <Button variant="ghost" onClick={refresh} disabled={loading}>
                {loading ? 'Refreshing…' : 'Refresh'}
              </Button>
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              {org.tag && <Badge tone="purple">[{org.tag}]</Badge>}
              <Badge tone="slate">Owner: {org.owner || 'Unknown'}</Badge>
              {org.createdAt && (
                <span className="text-xs text-slate-500">
                  Founded {relativeTime(org.createdAt)}
                </span>
              )}
            </div>
            {org.description && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">
                {org.description}
              </p>
            )}

            {org.rsiSid && (
              <div className="mt-4 rounded-lg border border-blue-900/50 bg-blue-950/20 p-3">
                <p className="text-xs uppercase tracking-wider text-blue-300">
                  Linked RSI org
                </p>
                <p className="mt-0.5 font-medium text-slate-100">SID: {org.rsiSid}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href={rsiOrgUrl(org.rsiSid)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-blue-700/60 bg-blue-950/40 px-3 py-1.5 text-xs font-medium text-blue-200 transition hover:bg-blue-900/40"
                  >
                    Open on RSI ↗
                  </a>
                  <a
                    href={rsiSpectrumUrl(org.rsiSid)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-blue-700/60 bg-blue-950/40 px-3 py-1.5 text-xs font-medium text-blue-200 transition hover:bg-blue-900/40"
                  >
                    Open Spectrum ↗
                  </a>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Link only — Nexus Nook never reads RSI rosters, credentials, or
                  Spectrum messages.
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {isOwner ? (
                <Button
                  variant="danger"
                  onClick={handleDeleteOrg}
                  disabled={actionBusy}
                >
                  {actionBusy ? 'Working…' : 'Delete org'}
                </Button>
              ) : isMember ? (
                <Button
                  variant="ghost"
                  onClick={() => runAction(() => leaveOrg(org.id), 'Could not leave.')}
                  disabled={actionBusy}
                >
                  {actionBusy ? 'Working…' : 'Leave org'}
                </Button>
              ) : (
                <Button
                  onClick={() => runAction(() => joinOrg(org.id), 'Could not join.')}
                  disabled={actionBusy || !me}
                >
                  {actionBusy ? 'Working…' : 'Join org'}
                </Button>
              )}
              {!me && (
                <span className="text-xs text-slate-500">Sign in to join.</span>
              )}
            </div>
            {actionError && (
              <p className="mt-2 text-sm text-amber-300">{actionError}</p>
            )}
          </Card>

          <Card title="Roster" icon="👥">
            {org.members.length === 0 ? (
              <EmptyState>No members yet.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {org.members.map((m, i) => {
                  const owner = m.name === org.owner
                  return (
                    <li
                      key={`${m.name}-${i}`}
                      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                        owner
                          ? 'border-purple-700/50 bg-purple-950/20'
                          : 'border-slate-800 bg-slate-950/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-slate-100">
                          {m.name || 'Unknown'}
                        </span>
                        {m.joinedAt && (
                          <span className="ml-2 text-xs text-slate-500">
                            joined {relativeTime(m.joinedAt)}
                          </span>
                        )}
                      </div>
                      {owner ? (
                        <Badge tone="purple">Owner</Badge>
                      ) : (
                        m.role && <Badge tone="slate">{m.role}</Badge>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card title="Operations" icon="🛰️">
            {isMember ? (
              <form onSubmit={submitOp} className="mb-4 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field
                    label="Title"
                    placeholder="Bunker run · Stanton"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <Field
                  label="Starts at"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
                    Details
                  </span>
                  <textarea
                    className="min-h-[72px] w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 transition focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Meet at the hangar, bring a dropship."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </label>
                {opError && (
                  <p className="text-sm text-amber-300 sm:col-span-2">{opError}</p>
                )}
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={opBusy || !title.trim()}>
                    {opBusy ? 'Scheduling…' : 'Schedule operation'}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="mb-4 text-sm text-slate-400">
                Join this org to schedule operations.
              </p>
            )}

            {org.ops.length === 0 ? (
              <EmptyState>No operations scheduled yet.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {org.ops.map((op) => {
                  const canDelete =
                    isOwner || (!!me && op.author === me)
                  const when = formatDateTime(op.startsAt)
                  return (
                    <li
                      key={op.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-100">
                            {op.title || 'Untitled op'}
                          </p>
                          {when && (
                            <p className="mt-0.5 text-xs text-purple-300">{when}</p>
                          )}
                          <p className="mt-0.5 text-xs text-slate-500">
                            {op.author || 'Unknown'} · {relativeTime(op.createdAt)}
                          </p>
                        </div>
                        {canDelete && (
                          <Button
                            variant="danger"
                            className="shrink-0"
                            onClick={() => removeOp(op.id)}
                            disabled={removingOpId === op.id}
                          >
                            {removingOpId === op.id ? 'Deleting…' : 'Delete'}
                          </Button>
                        )}
                      </div>
                      {op.body && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                          {op.body}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
