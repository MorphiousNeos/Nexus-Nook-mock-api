# Nexus Nook — iOS Client (Swift / SwiftUI)

Native iOS app for the Nexus Nook Star Citizen companion. SwiftUI, async/await
URLSession, no third-party dependencies. Deployment target iOS 16.

## Project layout

```
ios/
  project.yml            # XcodeGen spec (the .xcodeproj is generated, not committed)
  NexusNook/
    NexusNookApp.swift   # @main entry, hosts RootView
    Info.plist           # bundle config + ATS exception for localhost http
    Config.swift         # API base URL (Info.plist -> falls back to localhost:3001)
    Models/              # Codable models (User, Ship, ServerStatus, AuthResponse, ...)
    Networking/          # APIClient (async), APIError, TokenStore (Keychain)
    ViewModels/          # AuthViewModel, DashboardViewModel
    Views/               # RootView, LoginView, DashboardView, ShipRow, ServerStatusRow
    Assets.xcassets/     # AccentColor + AppIcon placeholders
```

## Generate & open the project

The `.xcodeproj` is produced from `project.yml` via [XcodeGen] so it is
reproducible and not committed.

```sh
brew install xcodegen      # one time
cd ios
xcodegen generate          # creates NexusNook.xcodeproj
open NexusNook.xcodeproj    # build & run the "NexusNook" scheme in Xcode
```

Re-run `xcodegen generate` whenever you add or remove source files.

[XcodeGen]: https://github.com/yonaskolb/XcodeGen

## Point at a backend

The app reads the API base URL from the `APIBaseURL` key in
`NexusNook/Info.plist`, defaulting to `http://localhost:3001` (see
`Config.swift`). To change it:

- Edit `APIBaseURL` in `Info.plist`, **or**
- Override `APIBaseURL` as a build setting / xcconfig.

Start the mock backend in `../backend` (default port 3001), then run the app.
The Simulator can reach the host's `localhost` directly. `Info.plist` includes
an `NSAppTransportSecurity` exception so cleartext HTTP to `localhost` works in
dev — remove it before shipping a production build over HTTPS.

## Auth flow

1. `LoginView` registers (`username`/`email`/`password`) or logs in
   (`email`/`password`).
2. On success the JWT is stored in the Keychain via `TokenStore` and
   `AuthViewModel.isAuthenticated` flips to `true`.
3. On launch, an existing token is treated as authenticated optimistically;
   `DashboardViewModel.load` verifies it via `GET /api/user/profile` and logs
   out automatically on a `401`.

## What is stubbed / assumptions

- **RSI integration is mock server-side.** `Connect RSI` and `Sync RSI Data`
  call the real endpoints, but the backend returns sample data regardless of
  input. The UI just surfaces the response in an alert.
- **TokenStore is a minimal Keychain wrapper** (single generic-password item,
  `kSecAttrAccessibleAfterFirstUnlock`). It covers store/load/delete for one
  user; it is not a full-featured Keychain library and ignores `OSStatus`
  failures silently.
- **AppIcon / AccentColor are placeholders.** `AppIcon.appiconset` has no image
  files yet (add a 1024×1024 PNG before submitting to the App Store).
- `getServerStatus` and `health` are public (no `Authorization` header); all
  other `/api/*` calls send `Bearer <JWT>`.
- No automated tests or CI in this scaffold; this is a headless setup focused on
  idiomatic, compilable source.
