# Car Data

Track the mileage of your cars over time. Passkey sign-in, multiple cars per user, a mileage chart, installable as a PWA. Self-hosted with Docker Compose.

## Run it

```sh
cp .env.example .env   # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up
```

The stack starts Postgres, applies migrations, then serves the app on http://localhost:3000. Postgres data lives in the `pgdata` volume.

Passkeys and the installable PWA need a secure context: `localhost` works as is, any other hostname must be served over HTTPS by a reverse proxy (Caddy, Traefik, nginx) in front of the app, with `BETTER_AUTH_URL` and `PASSKEY_RP_ID` set to match.

## Develop

```sh
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

Or run the dev server inside Docker with the source bind-mounted:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Database

Schema lives in `src/lib/db/schema/`. After changing it:

```sh
pnpm db:generate   # writes a migration to drizzle/
pnpm db:migrate    # applies pending migrations to DATABASE_URL
```

### Checks

```sh
pnpm typecheck
pnpm lint
pnpm test:e2e      # Playwright; builds and serves a production build on :3100, needs Postgres up
```

The suite runs against a production build because the service worker is
network-only in development. To run it against the docker compose app instead,
start the stack with auth rate limiting off (all tests share one IP) and point
Playwright at it:

```sh
BETTER_AUTH_RATE_LIMIT=off docker compose up -d
PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm test:e2e
```

First-time Playwright setup: `pnpm exec playwright install chromium`.

### PWA icons

`public/icons/` is generated from `scripts/icon-source.svg`; after changing the
source run `node scripts/generate-icons.mjs` and commit the PNGs.

## Docs for agents

See `AGENTS.md`, `CONTEXT.md` (domain vocabulary) and `docs/agents/`.
