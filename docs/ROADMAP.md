# Roadmap

## Phase 0 — Foundation (in progress)
- [x] Repo scaffold (backend / ios / android / docs)
- [ ] Import existing API + data design (pending paste of prior work)
- [ ] Finalize feature list and data model
- [ ] Choose backend mock-API framework

## Phase 1 — Mock API
- [ ] Define data model (entities, fields, relationships)
- [ ] Stand up mock API serving canned JSON for all entities
- [ ] Document endpoints (OpenAPI / README)
- [ ] Seed realistic sample data

## Phase 2 — App shells
- [ ] iOS (Swift/SwiftUI) app skeleton wired to the mock API
- [ ] Android (Kotlin/Compose) app skeleton wired to the mock API
- [ ] Shared API contract / models per platform

## Phase 3 — Core features
- [ ] Implement prioritized features end-to-end (API + both clients)

## Phase 4 — Real data
- [ ] Evaluate community/third-party data sources and their terms
- [ ] Swap mock endpoints for real sources behind the same contract

## Open questions
- Which third-party data sources are acceptable to depend on?
- Auth model (accounts? per-device? read-only?)
- Offline behavior / caching strategy
