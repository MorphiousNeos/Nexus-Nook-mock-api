# Roadmap

## Phase 0 — Foundation ✅
- [x] Repo scaffold (backend / ios / android / docs)
- [x] Import existing API + data design (from deployment/backend/frontend PDFs)
- [x] Choose backend framework (Node/Express, recovered)

## Phase 1 — Backend API ✅ (mock data)
- [x] Data model + schema (`backend/db/schema.sql`)
- [x] API serving auth, ships, user progress, server status
- [x] Document endpoints (`docs/API.md`)
- [ ] Seed broader realistic sample data

## Phase 2 — App shells ✅
- [x] iOS (Swift/SwiftUI) skeleton wired to the API
- [x] Android (Kotlin/Compose) skeleton wired to the API
- [x] Shared API contract per platform

## Phase 2.5 — Compliance & CI ✅ (foundation)
- [x] Compliance guide (`docs/COMPLIANCE.md`)
- [x] Remove credential collection; public-handle-only RSI flow
- [x] "Unofficial / not affiliated" disclaimers in apps + README
- [x] CI workflows (backend / Android / iOS)
- [x] Deployment guide (`docs/DEPLOY.md`)
- [ ] Get CI green (mobile build jobs may need iteration)

## Phase 3 — Core features (next)
- [ ] Decide prioritized feature set (ship DB, fleet, trade routes, org tools…)
- [ ] Implement features end-to-end (API + both clients)
- [ ] Real app icons + store assets

## Phase 4 — Real data (compliant)
- [ ] Integrate a compliant community data source (UEX / SC Wiki / Fleetyards)
      with attribution; keep the same API contract
- [ ] Replace mock RSI/server-status data

## Phase 5 — Launch readiness
- [ ] Deploy backend (HTTPS, strong JWT_SECRET, locked CORS)
- [ ] Privacy policy + in-app account deletion
- [ ] Attorney review of IP/data-source/ToS posture
- [ ] App Store + Play Store submissions

## Open questions
- Which community data source(s) to depend on first?
- Auth model beyond email/password (Discord OAuth?)
- Monetization (and whether CIG's Fan Kit permits it for an app)
- Offline behavior / caching strategy
