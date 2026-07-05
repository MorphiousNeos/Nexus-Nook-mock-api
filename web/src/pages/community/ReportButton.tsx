import { useState } from 'react'
import { reportContent, type ReportKind } from '../../services/community'

/**
 * Small "Report" affordance for community content. Asks for an optional
 * reason, submits, and collapses to a confirmation. Errors show inline and
 * reset after a moment so the row doesn't grow noisy controls.
 */
export default function ReportButton({
  kind,
  contentId,
}: {
  kind: ReportKind
  contentId: string
}) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')

  async function handleClick() {
    if (status !== 'idle') return
    const reason = window.prompt(
      'Why are you reporting this? (optional — press OK to submit)',
    )
    if (reason === null) return // cancelled
    setStatus('busy')
    try {
      await reportContent(kind, contentId, reason.trim() || undefined)
      setStatus('done')
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  if (status === 'done') {
    return <span className="text-xs text-emerald-400">Reported ✓</span>
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === 'busy'}
      className="text-xs text-slate-500 underline-offset-2 transition hover:text-amber-300 hover:underline disabled:opacity-60"
      title="Flag this for the moderators"
    >
      {status === 'busy' ? 'Reporting…' : status === 'error' ? 'Failed — retry?' : 'Report'}
    </button>
  )
}
