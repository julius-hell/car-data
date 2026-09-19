# Car Data

Track the mileage of your cars over time. Passkey sign-in, multiple cars per user, a mileage chart, installable as a PWA. Self-hosted with Docker Compose.

## Run it

```sh
cp .env.example .env   # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up
```

The stack starts Postgres, applies migrations, then serves the app on http://localhost:3000. Postgres data lives in the `pgdata` volume.

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
pnpm test:e2e      # Playwright; starts `pnpm dev` itself, needs Postgres up
```

First-time Playwright setup: `pnpm exec playwright install chromium`.

## Docs for agents

See `AGENTS.md`, `CONTEXT.md` (domain vocabulary) and `docs/agents/`.
