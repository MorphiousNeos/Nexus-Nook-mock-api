# Nexus Nook — Launch Checklist

Everything required to go from today's foundation to **live on the Apple App
Store and Google Play**. Owner key:

- 🧑 **You (Cole)** — needs your account, money, or decision; I can't do it for you
- 🤖 **Me (Claude)** — I can build/do this in the repo
- 🤝 **Together** — you provide a key/URL/decision, I wire it in

> Reality check: today this is a working scaffold with **mock data**. The biggest
> bucket of work is "Phase B — build the real app." Don't let the store/legal
> lists fool you into thinking those are the long pole; finishing the features is.

---

## Phase A — Accounts, money & decisions (🧑 you — these gate everything)

- [ ] 🧑 **Apple Developer Program** — **$99/year**. Required to ship on iOS.
      Sign up at developer.apple.com. (Also: building/submitting iOS needs a
      **Mac**, or a cloud-Mac CI service.)
- [ ] 🧑 **Google Play Developer account** — **$25 one-time**. play.google.com/console
- [ ] 🧑 **Backend hosting account** — Railway/Render (~$5–20/mo) + a **domain**
      (~$12/yr). TLS/HTTPS is free via the host.
- [ ] 🧑 **Decide scope of v1** — which features ship first (recommended: Discord
      community chat + user-owned fleet/inventory; see `VISION.md`).
- [ ] 🧑 **Pick the data source** for ship data (Fleetyards / SC Wiki / UEX) and
      **request any API key**.
- [ ] 🧑 **Discord application** — create one at discord.com/developers (for login
      + community integration); give me the client ID.

## Phase B — Build the real app (🤖 me, with your decisions)

- [ ] 🤖 Get CI green (verify the iOS + Android builds actually compile)
- [ ] 🤖 Discord OAuth login + link to the Nexus Discord server
- [ ] 🤖 In-app / community chat (the social "Nook")
- [ ] 🤖 Fleet: pick ships from the chosen ship DB, saved to the user's account
- [ ] 🤖 Inventory: user-managed lists
- [ ] 🤖 Org spaces (create/join inside Nexus Nook)
- [ ] 🤝 Swap mock server-status & ship data for the real community source (key from you)
- [ ] 🤖 Real app **icon** + branding (no CIG/official art) and polished UI
- [ ] 🤖 Error/empty/loading states, offline behavior, basic analytics/crash reporting

## Phase C — Compliance & legal (🤝 / 🧑)

- [ ] 🧑 **Email CIG** describing the app; ask what's permitted (free, highest value)
- [ ] 🧑 **Legal review** — a free clinic (USC game-dev IP clinic, etc.) or a paid
      hour; focus: trademark use + monetization (see `COMPLIANCE.md`)
- [ ] 🤖 **Privacy policy** page (required by both stores) + host it
- [ ] 🤖 **In-app account deletion** (Apple requires it for accounts)
- [ ] 🤖 Attribution for community data sources, in-app
- [ ] 🤖 Confirm the "unofficial / not affiliated" disclaimer is everywhere it needs to be

## Phase D — Backend to production (🤝)

- [ ] 🧑 Create the hosting + managed Postgres + Redis
- [ ] 🤝 Deploy backend; set `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, locked CORS
- [ ] 🤝 Point both apps at the HTTPS backend URL (see `DEPLOY.md`)
- [ ] 🤖 Run DB migration; smoke-test `/health` and auth

## Phase E — Store submission (🧑 / 🤝)

- [ ] 🤖 Build a signed Android **AAB**; 🧑 upload to Play Console
- [ ] 🧑 On a Mac: archive the iOS app and upload to App Store Connect (I prep the project)
- [ ] 🤖 + 🧑 **Store listings**: name, description, keywords, **screenshots**,
      feature graphic
- [ ] 🧑 **Apple App Privacy** "nutrition labels" + **Google Data safety** form
- [ ] 🧑 Submit for review (Apple ~1–3 days; Google ~hours–days); fix any rejections
- [ ] 🤝 Closed beta first (TestFlight / Play internal testing) before public launch

---

## The honest short version

The three things that **gate** everything and only you can start:
1. **Pay for the two developer accounts** ($99/yr Apple, $25 Google) — and have a
   **Mac** available for iOS.
2. **Stand up hosting + a domain**, then give me the URL.
3. **Decide the v1 feature set** and **email CIG**.

Once those are moving, the heavy lifting (Phase B build) is mine. Realistically
this is **weeks of build work**, not days — but every step is concrete and on a
compliant path.
