# Deployment & Backend URL Configuration

How to deploy the backend and point each app at it. The mobile apps talk to the
backend purely over the REST contract in [`API.md`](API.md), so once the backend
is hosted you only change one URL per app.

> A real launch also needs the items in [`COMPLIANCE.md`](COMPLIANCE.md)
> (privacy policy, account deletion, compliant data sources, attorney review).

## 1. Deploy the backend

The backend (`backend/`) is a standard Node/Express + PostgreSQL + Redis service.
It ships with a `Dockerfile`, `docker-compose.yml`, `db/schema.sql`, and
`migrate.js`. Pick a host:

| Host | Notes |
|------|-------|
| Railway | Easiest; add PostgreSQL + Redis plugins; set env vars in dashboard |
| Render | Free tier; connect repo, add Postgres + Redis |
| Heroku | `heroku-postgresql` + `heroku-redis` add-ons |
| Any Docker host | `docker build` the `backend/` image; provide managed Postgres + Redis |

Required environment variables (see `backend/.env.example`):

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — long random string (`openssl rand -base64 32`)
- `FRONTEND_URL` — allowed CORS origin(s) for any web client
- `NODE_ENV=production`

After the database is reachable, run the migration once: `npm run migrate`.

Verify: `curl https://your-backend.example.com/health` returns `{"status":"OK",...}`.

## 2. Point the iOS app at it

`ios/NexusNook/Config.swift` reads `APIBaseURL` from `Info.plist`, falling back to
`http://localhost:3001` for the simulator. To use your deployed backend, set the
key in `ios/NexusNook/Info.plist`:

```xml
<key>APIBaseURL</key>
<string>https://your-backend.example.com</string>
```

For separate dev/prod values, define `APIBaseURL` via an `.xcconfig` build setting
per configuration instead of hardcoding it. Production must be **HTTPS** (the dev
App Transport Security localhost exception should not be relied on for release).

## 3. Point the Android app at it

`Config.kt` reads `BuildConfig.BASE_URL`, which is set per build type in
`android/app/build.gradle.kts`:

- **debug** → `http://10.0.2.2:3001` (emulator → host machine)
- **release** → `https://your-backend.example.com` (replace the placeholder)

For a physical device on debug, change the debug `BASE_URL` to your machine's LAN
IP (e.g. `http://192.168.1.50:3001`). Release builds must use HTTPS.

## 4. What I can't do for you

Actually provisioning hosting requires your own accounts and secrets (Railway/
Render/Heroku login, database, a domain + TLS). Once you've created a backend URL,
drop it into the two places above (or tell me the URL and I'll wire it in).
