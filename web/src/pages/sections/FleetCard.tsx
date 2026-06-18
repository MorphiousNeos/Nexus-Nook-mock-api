import { useState, type FormEvent } from 'react'
import { useSession } from '../../SessionContext'
import { Button, Card, EmptyState, Field } from '../../components/ui'

export default function FleetCard() {
  const { state, addShip, removeShip } = useSession()
  const fleet = state!.fleet
  const [name, setName] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [type, setType] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await addShip({
        name: name.trim(),
        manufacturer: manufacturer.trim(),
        type: type.trim(),
        notes: notes.trim() || undefined,
      })
      setName('')
      setManufacturer('')
      setType('')
      setNotes('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Fleet" icon="🚀">
      <p className="mb-4 text-xs text-slate-400">
        Your personal fleet — ships you add yourself. This is your own data; Nexus Nook does
        not import from or scrape RSI.
      </p>

      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Ship name" placeholder="Avenger Titan" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Manufacturer" placeholder="Aegis Dynamics" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
        <Field label="Type" placeholder="Light Fighter" value={type} onChange={(e) => setType(e.target.value)} />
        <Field label="Notes (optional)" placeholder="LTI, daily driver…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? 'Adding…' : 'Add ship'}
          </Button>
        </div>
      </form>

      <ul className="mt-5 space-y-2">
        {fleet.length === 0 && <EmptyState>No ships yet. Add your first hull above.</EmptyState>}
        {fleet.map((ship) => (
          <li
            key={ship.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
          >
            <div>
              <p className="font-medium text-slate-100">{ship.name}</p>
              <p className="text-xs text-slate-400">
                {[ship.manufacturer, ship.type].filter(Boolean).join(' · ') || 'Unspecified'}
              </p>
              {ship.notes && <p className="mt-1 text-xs text-slate-500">{ship.notes}</p>}
            </div>
            <Button variant="danger" onClick={() => removeShip(ship.id)} className="shrink-0">
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
