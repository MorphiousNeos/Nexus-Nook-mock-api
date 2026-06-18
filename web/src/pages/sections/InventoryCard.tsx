import { useState, type FormEvent } from 'react'
import { useSession } from '../../SessionContext'
import { Button, Card, EmptyState, Field } from '../../components/ui'

export default function InventoryCard() {
  const { state, addItem, removeItem } = useSession()
  const inventory = state!.inventory
  const [name, setName] = useState('')
  const [qty, setQty] = useState('1')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await addItem({
        name: name.trim(),
        qty: Math.max(1, parseInt(qty, 10) || 1),
        notes: notes.trim() || undefined,
      })
      setName('')
      setQty('1')
      setNotes('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Inventory" icon="📦">
      <p className="mb-4 text-xs text-slate-400">
        A personal manifest of components, cargo, and gear you want to keep track of.
      </p>

      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Item name" placeholder="Quantum drive" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Quantity" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
        <Field
          label="Notes (optional)"
          placeholder="Stored at Port Olisar"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex items-end">
          <Button type="submit" disabled={busy || !name.trim()} className="w-full">
            {busy ? 'Adding…' : 'Add item'}
          </Button>
        </div>
      </form>

      <ul className="mt-5 space-y-2">
        {inventory.length === 0 && <EmptyState>Your manifest is empty.</EmptyState>}
        {inventory.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
          >
            <div>
              <p className="font-medium text-slate-100">
                {item.name}{' '}
                <span className="text-xs font-normal text-purple-300">×{item.qty}</span>
              </p>
              {item.notes && <p className="mt-1 text-xs text-slate-500">{item.notes}</p>}
            </div>
            <Button variant="danger" onClick={() => removeItem(item.id)} className="shrink-0">
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
