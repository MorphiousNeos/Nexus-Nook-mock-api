import { Badge, Card } from '../../components/ui'

export default function OrgCard() {
  return (
    <Card title="Org" icon="🌌">
      <div className="flex items-center gap-2">
        <Badge tone="purple">Coming soon</Badge>
      </div>
      <p className="mt-3 text-sm text-slate-300">
        In-app organizations are on the way. Form a crew, share a roster, and coordinate
        ops with your fellow citizens — right inside Nexus Nook.
      </p>
      <ul className="mt-4 space-y-1 text-sm text-slate-400">
        <li>• Shared org roster and roles</li>
        <li>• Pooled fleet overview</li>
        <li>• Event and op planning</li>
      </ul>
    </Card>
  )
}
