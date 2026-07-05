import { Link } from 'react-router-dom'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold text-slate-100">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/" className="text-sm text-purple-300 hover:underline">
        ← Back to Nexus Nook
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold text-slate-100">Privacy Policy</h1>
      <p className="mt-1 text-xs text-slate-500">Last updated: July 4, 2026</p>

      <p className="mt-6 text-sm leading-relaxed text-slate-300">
        Nexus Nook is a free, fan-made companion app for Star Citizen. We collect the
        minimum needed to run the app, we never sell data, and you can delete everything
        yourself at any time. This page explains it in plain language.
      </p>

      <Section title="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Account basics:</strong> a display name, an email address, and a
            password (stored only as a bcrypt hash — we cannot read it).
          </li>
          <li>
            <strong>If you sign in with Discord:</strong> your Discord ID, display name,
            and (if verified) email. That's the entire scope we request — never your
            servers, messages, or friends.
          </li>
          <li>
            <strong>If you choose to add it:</strong> your public RSI citizen handle
            and/or your org's public SID. Display only.
          </li>
          <li>
            <strong>What you create in the app:</strong> your fleet, inventory, blueprint
            tracker, and any community content you post (LFG posts, feed posts,
            marketplace listings, orgs, scheduled ops).
          </li>
        </ul>
      </Section>

      <Section title="What we never collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your RSI (Star Citizen) password or login — never, under any flow.</li>
          <li>Discord messages, servers, or contacts.</li>
          <li>Payment information (there is nothing to buy).</li>
          <li>Advertising identifiers or cross-site tracking data. We run no ads and no
            third-party analytics.</li>
        </ul>
      </Section>

      <Section title="Where your data lives">
        <p>
          Account data is stored in a PostgreSQL database hosted on Render.com (US).
          Demo mode stores everything in your own browser's localStorage and sends us
          nothing. Game reference data (commodity prices, ship specs) is fetched by your
          browser directly from community APIs — UEX Corp (uexcorp.space) and the Star
          Citizen Wiki (star-citizen.wiki) — under their own terms.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          We don't use cookies. A sign-in token is kept in your browser's localStorage
          and is removed when you sign out.
        </p>
      </Section>

      <Section title="Community content & moderation">
        <p>
          Posts, listings, and org pages are visible to other signed-in users along with
          your display name. Content can be reported in-app; moderators may remove
          content that breaks the rules.
        </p>
      </Section>

      <Section title="Deleting your data">
        <p>
          Profile → Danger zone → <strong>Delete account</strong> permanently removes
          your account and everything attached to it (fleet, inventory, blueprints,
          posts, listings, org memberships, and orgs you own). This is immediate and
          irreversible. You can also email{' '}
          <a href="mailto:cole@houstonshome.com" className="text-purple-300 hover:underline">
            cole@houstonshome.com
          </a>{' '}
          and we'll do it for you.
        </p>
      </Section>

      <Section title="Children">
        <p>
          Nexus Nook is not directed at children under 13, and we don't knowingly
          collect their data.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If this policy changes materially we'll note it here with a new date, and
          announce it on our Discord.
        </p>
      </Section>

      <Section title="The unofficial bit">
        <p>
          Nexus Nook is an unofficial fan project, not affiliated with or endorsed by
          Cloud Imperium Games. Star Citizen® is a registered trademark of Cloud
          Imperium Rights LLC.
        </p>
      </Section>
    </main>
  )
}
