# Car Data

Fleet management for businesses: inspection intervals (HU/AU, UVV, service), driver checks, contracts and mileage for every company car. Self-hosted with Docker Compose.

The app is being rebuilt from a personal mileage tracker into a multi-tenant fleet manager; see the spec in issue #13.

## Run it

```sh
cp .env.example .env   # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up
```

The stack starts Postgres, applies migrations, then serves the app on http://localhost:3000. Postgres data lives in the `pgdata` volume.

There is no public sign-up. Create the first platform operator with the CLI; it prints a one-time link (valid 24 hours) to set their password. Running it again for the same email issues a new link.

```sh
docker compose exec app node scripts/create-operator.mjs --email ops@example.com --name "Ops"
# or, outside Docker: pnpm operator:create --email ops@example.com --name "Ops"
```

The operator signs in, creates an organization per business and hands its first admin the invitation link. Admins then manage their own organization.

### Email

Email is optional. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM` (see `.env.example`) to email invitations, password resets and address verification. Without SMTP everything still works: invitations and password-reset links are copied by admins (or, for an organization's admins, by the operator) and handed over directly.

### Weekly digest

With email configured, admins get a weekly digest of everything overdue or due soon. The compose stack's `scheduler` service triggers it every Monday at 07:00 in `APP_TIME_ZONE` by calling `POST /api/digest` with `DIGEST_SECRET` as a bearer token; set `DIGEST_SECRET` (e.g. `openssl rand -hex 32`) to enable it. Admins can turn the digest off in their settings.

**Upgrading from the personal mileage tracker:** the fleet manager starts from a fresh database. Its migration history was replaced by a new baseline, so remove the old database first (`docker compose down -v` deletes the `pgdata` volume) and re-enter your cars.

Serve any hostname other than `localhost` over HTTPS through a reverse proxy (Caddy, Traefik, nginx) in front of the app, with `BETTER_AUTH_URL` set to the public URL. The proxy should forward `Host` (or `X-Forwarded-Host`) and `X-Forwarded-For` unchanged and set `Strict-Transport-Security`; the app sets the other security headers itself.

Set `POSTGRES_PASSWORD` to something other than the example value before exposing the host to a network. Postgres is only published on `127.0.0.1`.

## Develop

```sh
cp .env.example .env
pnpm install
docker compose up -d postgres
docker compose --profile dev up -d mailpit   # optional: catches email, UI on http://localhost:8025
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
pnpm test:e2e      # Playwright; builds and serves a production build on :3100 and :3101
```

The suite needs Postgres and Mailpit (`docker compose --profile dev up -d postgres mailpit`). It serves the build twice: on :3100 with email going to Mailpit, and on :3101 without SMTP for the copy-the-link fallback.

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
