# Car Data

Fleet management for businesses: inspection intervals (HU/AU, UVV, service), driver checks, contracts and mileage for every company car. Self-hosted with Docker Compose.

The app is being rebuilt from a personal mileage tracker into a multi-tenant fleet manager; see the spec in issue #13.

## Run it

```sh
cp .env.example .env   # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up
```

The stack starts Postgres, applies migrations, then serves the app on http://localhost:3000. Postgres data lives in the `pgdata` volume.

Serve any hostname other than `localhost` over HTTPS through a reverse proxy (Caddy, Traefik, nginx) in front of the app, with `BETTER_AUTH_URL` set to the public URL. The proxy should forward `Host` (or `X-Forwarded-Host`) and `X-Forwarded-For` unchanged and set `Strict-Transport-Security`; the app sets the other security headers itself.

Set `POSTGRES_PASSWORD` to something other than the example value before exposing the host to a network. Postgres is only published on `127.0.0.1`.

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

The suite runs against a production build. To run it against the docker compose app instead,
start the stack with auth rate limiting off (all tests share one IP) and point
Playwright at it:

```sh
BETTER_AUTH_RATE_LIMIT=off docker compose up -d
PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm test:e2e
```

First-time Playwright setup: `pnpm exec playwright install chromium`.

## Docs for agents

See `AGENTS.md`, `CONTEXT.md` (domain vocabulary) and `docs/agents/`.
