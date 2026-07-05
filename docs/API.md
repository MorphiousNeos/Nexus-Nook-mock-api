# Nexus Nook API Contract

Base URL: `http://localhost:3001` (dev) — set per environment.

All `/api/*` routes are rate limited (100 requests / 15 min / IP). Authenticated
routes require an `Authorization: Bearer <JWT>` header. Tokens expire after 7 days.

This contract is shared by all clients (web, iOS, Android).

## Auth

### POST `/api/auth/register`
Body: `{ "username", "email", "password" }`
→ `201 { "success": true, "token", "user": { "id", "username", "email" } }`
Errors: `400` missing fields, `409` user exists.

### POST `/api/auth/login`
Body: `{ "email", "password" }`
→ `200 { "success": true, "token", "user": { "id", "username", "email", "rsiConnected" } }`
Errors: `401` invalid credentials.

## RSI integration (auth required)

> **Compliance:** these endpoints work with a user's **public RSI handle only**.
> They never accept or store RSI passwords and never log into a user's account.
> See [`COMPLIANCE.md`](COMPLIANCE.md).

### POST `/api/rsi/connect`
Body: `{ "rsiHandle" }` — the public citizen handle (mock data in dev)
→ `200 { "success": true, "message", "data": { "handle", "organization", "shipsImported" } }`
Errors: `400` missing/blank handle.

### POST `/api/rsi/sync`
→ `200 { "success": true, "message", "timestamp" }`
Errors: `400` RSI account not connected.

### GET `/api/ships`
→ `200 { "ships": [ { "id", "name", "manufacturer", "type", "cargo", "crew", "speed", "price", "pledge", "status", "location", "insurance" } ] }`

## User data (auth required)

### GET `/api/user/profile`
→ `200 { "user": { "id", "username", "email", "rsi_connected", "rsi_handle", "rsi_organization", "last_rsi_sync", "created_at" } }`

### POST `/api/user/save`
Body: `{ "gameData": { ... } }`
→ `200 { "success": true, "message": "Progress saved" }`

### GET `/api/user/load`
→ `200 { "gameData": { ... } | null }`

## Public

### GET `/health`
→ `200 { "status": "OK", "timestamp", "service" }`

### GET `/api/servers/status`
→ `200 { "servers": [ { "region", "status", "players", "latency", "capacity" } ] }`
(Mock data, cached 30s.)
