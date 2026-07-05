# Nexus Nook — Android Client (Kotlin / Jetpack Compose)

Native Android companion app for the Nexus Nook Star Citizen backend.

- `applicationId`: `com.nexusnook.companion`
- minSdk 24 · targetSdk 34 · compileSdk 34
- Jetpack Compose (Material 3), Retrofit + OkHttp, kotlinx.serialization,
  Coroutines/Flow, ViewModel, DataStore (Preferences) for JWT storage.

## Open & build

1. Open the `android/` folder (this directory) in Android Studio (Hedgehog or newer).
2. Let Gradle sync. Versions are pinned to a coherent set:
   AGP 8.2.2, Kotlin 1.9.22, Compose BOM 2024.02.00, Compose compiler 1.5.10, Gradle 8.5.
3. Run the `app` configuration on an emulator (API 24+) or a device.

> The Gradle wrapper `.jar` binary is intentionally **not** committed. Android Studio
> regenerates it on first sync, or run `gradle wrapper` once if you have Gradle installed.

## Run the backend

Start the mock API from the repo root (see `backend/`), it listens on port `3001`.

## Base URL (emulator vs. real device)

The base URL is a `BuildConfig` field set in `app/build.gradle.kts`:

```kotlin
buildConfigField("String", "BASE_URL", "\"http://10.0.2.2:3001\"")
```

- **Emulator:** `http://10.0.2.2:3001` — `10.0.2.2` is the emulator's alias for the
  host machine's loopback (`localhost`). This is the default.
- **Physical device:** replace it with your dev machine's LAN IP, e.g.
  `http://192.168.1.50:3001`, then rebuild. The phone and machine must be on the
  same network.

`usesCleartextTraffic="true"` is set in the manifest so plain HTTP works in dev.
Remove it (or scope it) before shipping anything over real HTTPS.

## Auth flow

- Register/login hit `/api/auth/*`; the returned JWT is stored in DataStore
  (`TokenStore`). `AuthInterceptor` attaches `Authorization: Bearer <jwt>` to every
  request. Public endpoints (`/api/servers/status`, `/health`, auth) work without it.
- The dashboard loads profile, ships, and server status concurrently. A `401` from
  any call clears the token and returns to the login screen.

## What's stubbed / simplified

- **No tests.** No unit or instrumented tests are included.
- **No app icon / launcher resources.** Uses the default system icon; no mipmaps or
  adaptive icon are provided.
- **Manual DI.** `NexusNookApp` is a tiny manual DI container (no Hilt/Dagger).
- **DataStore, not encrypted storage.** JWT is stored in Preferences DataStore for
  simplicity; swap in `androidx.security:security-crypto` if hardware-backed
  encryption is required.
- **No token refresh / expiry handling** beyond logging out on `401`.
- **Server status** has no auto-polling; pull happens on load and the refresh button.
- Date/time fields (`last_rsi_sync`, `created_at`) are displayed as raw strings.
