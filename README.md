# Nexus Nook — Star Citizen Companion App

A companion app for **Star Citizen**, with native mobile clients for iOS and Android
backed by a mock API (with a path to real data sources).

> **Status:** Foundation / scaffolding. The data model and API are being built from
> existing design work. See `docs/ROADMAP.md` for the current plan and progress.

## Repository layout

```
.
├── backend/    # Mock API + data model (the "nexus-nook-mock-api")
├── ios/        # Native iOS client (Swift / SwiftUI)
├── android/    # Native Android client (Kotlin / Jetpack Compose)
└── docs/       # Architecture, data model, roadmap
```

## Stack decisions

| Layer    | Choice                          | Notes |
|----------|---------------------------------|-------|
| iOS      | Swift + SwiftUI                 | Native, separate codebase |
| Android  | Kotlin + Jetpack Compose        | Native, separate codebase |
| Backend  | Mock API (TBD on paste of prior work) | Serves canned data first, real sources later |

## Data sources

Star Citizen has **no official public API**. Live/game data therefore comes from:

- A **mock API** in `backend/` for development and offline work (built first).
- Third-party / community sources later (e.g. community APIs, UEX, wikis), pending
  decisions on which to integrate and their terms of use.

## Planned features

To be finalized from existing design work. Candidate feature set:

- Ship database & comparison
- Hangar / fleet tracker
- Trade routes & commodity prices
- Org / fleet management tools
- Mining & refining helpers
- News / status feed

## Compliance

Star Citizen has no official public API, and third-party apps must respect Cloud
Imperium Games' terms and IP guidelines. Nexus Nook is built to be compliant:

- **No credential collection.** The app uses only a user's *public* RSI handle —
  it never asks for, transmits, or stores an RSI password.
- **Unofficial / not affiliated.** The app displays a clear disclaimer that it is
  fan-made and not affiliated with or endorsed by Cloud Imperium Games.
- **Compliant data sources.** Live data is sourced only from community APIs whose
  terms permit third-party use, with attribution.

See [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) for the full guidance and pre-launch
checklist. **This is not legal advice — a qualified games/IP attorney should review
before any public launch.**

## Getting started

This repo is in early scaffolding. Build/run instructions for each client and the
backend will be added as those pieces land.

---

*Nexus Nook is an unofficial, fan-made application and is not affiliated with or
endorsed by Cloud Imperium Games or Roberts Space Industries. Star Citizen® is a
registered trademark of Cloud Imperium Rights LLC.*
