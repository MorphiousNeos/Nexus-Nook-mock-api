import { Card } from '../../components/ui'

/**
 * Shown in the offline demo build (no backend configured). The community
 * features need the live, signed-in site to read and post.
 */
export default function CommunityNotice() {
  return (
    <Card title="Community is live-only" icon="🛰️">
      <p className="text-sm text-slate-300">
        The Community board — Looking for Group, Feed, and Marketplace — runs on the
        hosted Nexus Nook server.
      </p>
      <p className="mt-2 text-sm text-slate-400">
        This is the offline demo build, so there is no community server to connect to.
        Open the hosted site and sign in to browse and post.
      </p>
    </Card>
  )
}
