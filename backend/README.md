# Nexus Nook — Backend API

Node/Express REST API for the Nexus Nook Star Citizen companion app. Provides
JWT authentication, an RSI integration layer (currently mocked), ship data,
user progress persistence, and server status. Backed by PostgreSQL with Redis
caching.

## Run locally

### Option A — Docker (Postgres + Redis + API together)

```bash
cd backend
cp .env.example .env          # then edit JWT_SECRET
JWT_SECRET=dev-secret docker-compose up --build
```

### Option B — Node directly (bring your own Postgres + Redis)

```bash
cd backend
cp .env.example .env          # point DATABASE_URL / REDIS_URL at your services
npm install
npm run migrate               # creates tables from db/schema.sql
npm run dev                   # starts on http://localhost:3001
```

## Smoke test

```bash
curl http://localhost:3001/health

curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"password123"}'
```

## Endpoints

See [`../docs/API.md`](../docs/API.md) for the full request/response contract —
that document is the source of truth the iOS and Android clients build against.

## Important notes

- **RSI integration is a mock.** Star Citizen / RSI has no official public API.
  The `RSIApiClient` returns canned data. Before any real launch, replace it
  with a ToS-compliant data source and **do not** collect users' real RSI
  account passwords through `/api/rsi/connect` until that integration exists.
- Set a strong, random `JWT_SECRET` in production and lock `FRONTEND_URL` (CORS)
  to your real client origin(s).
