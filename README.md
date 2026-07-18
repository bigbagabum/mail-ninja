# Mail Ninja

Standalone email campaign management for teams that need durable imports, suppression handling, safe campaign waves, Resend delivery, webhook ingestion, and private analytics without a CRM or hosted auth provider.

Mail Ninja is designed to be cloned, configured, rebranded, and deployed as an independent product. It uses PostgreSQL as the only required infrastructure dependency and runs the web app and background worker as separate processes.

## Highlights

- Import email recipients from CSV.
- Validate, normalize, inspect, and deduplicate imported rows.
- Optionally auto-score imported recipients into priority cohorts.
- Manually override recipient priority for wave ordering.
- Keep a global suppression list.
- Create multilingual campaigns and template variants.
- Prepare campaigns into deterministic sending waves.
- Store durable background jobs in PostgreSQL.
- Receive and deduplicate Resend webhook events.
- Configure multiple encrypted provider API keys.
- Spend provider keys sequentially or distribute work across them in parallel.
- View provider metrics combined or broken down by API key.
- Track deliveries, opens, clicks, bounces, complaints, failures, and unsubscribes.
- Manage local administrators without public registration.
- Run locally or in production with Docker.

## Tech Stack

| Area | Choice |
| --- | --- |
| Web | Next.js App Router |
| Language | TypeScript strict mode |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS |
| Email provider | Resend |
| Auth | Local admin auth, Argon2id password hashes |
| Sessions | Secure server-side sessions stored in PostgreSQL |
| Jobs | PostgreSQL-backed queue with row locking |
| Tests | Vitest |

## Architecture

Mail Ninja runs as three services:

```text
web      Next.js dashboard, auth, forms, uploads, webhooks
worker   background jobs, campaign preparation, webhook processing
postgres durable state, sessions, job queue, event history
```

There is no Redis requirement. Jobs are claimed from PostgreSQL with row locking and `FOR UPDATE SKIP LOCKED`.

## Requirements

- Node.js 22+
- npm
- PostgreSQL
- Optional: Docker and Docker Compose
- Optional for real sending: Resend account, verified domain, API key, webhook secret

## Quick Start

```bash
git clone <repo-url>
cd mail-ninja
npm install
cp .env.example .env
```

Create `.env.local` with your local database URL:

```env
DATABASE_URL=postgresql://mailninja:change-me@localhost:5432/mailninja
```

Create the database:

```sql
CREATE ROLE mailninja WITH LOGIN PASSWORD 'change-me';
CREATE DATABASE mailninja OWNER mailninja;
```

Apply migrations and create the initial workspace/admin:

```bash
node --env-file=.env --env-file=.env.local --import tsx src/db/migrate.ts
node --env-file=.env --env-file=.env.local --import tsx src/db/seed.ts
```

Start the app:

```bash
npm run dev
```

Start the worker in another terminal:

```bash
node --env-file=.env --env-file=.env.local --import tsx src/worker/index.ts
```

Open:

```text
http://localhost:3000
```

## Quick Start With Docker

This is the easiest path for trying Mail Ninja from GitHub.

```bash
git clone <repo-url>
cd mail-ninja
cp .env.docker.example .env
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Default login:

```text
Email:    admin@example.com
Password: adminadminadmin
```

The compose bundle starts:

```text
postgres
migrate
seed
web
worker
```

`migrate` and `seed` are one-shot services. They run before `web` and `worker`. Seed creates only the default workspace/settings/admin; it does not create recipients or campaigns.

The PostgreSQL data is stored in the Docker volume:

```text
postgres_data
```

To reset the local Docker database completely:

```bash
docker compose down -v
docker compose up --build
```

## Default Admin

The default local admin is controlled by environment variables:

```env
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=adminadminadmin
INITIAL_ADMIN_NAME=Admin
```

Default login after running the seed:

```text
Email:    admin@example.com
Password: adminadminadmin
```

Change this password before deploying anywhere real.

## Administrator Management

Mail Ninja has no public registration. Administrators are created by an existing administrator in the private dashboard or by CLI.

### Add An Admin In The UI

1. Log in.
2. Open `Settings -> Admins`.
3. Fill `Add Administrator`.
4. Give the new admin the temporary password.

### Change Your Own Password

1. Log in.
2. Open `Settings -> Admins`.
3. Use `Change My Password`.

Changing a password revokes existing sessions for that administrator.

### Reset An Admin Password In The UI

1. Log in as an administrator.
2. Open `Settings -> Admins`.
3. Use the `Reset` field in the administrator table.

### Add An Admin By CLI

Set:

```env
INITIAL_ADMIN_EMAIL=new-admin@example.com
INITIAL_ADMIN_PASSWORD=temporary-long-password
INITIAL_ADMIN_NAME="New Admin"
```

Run:

```bash
node --env-file=.env --env-file=.env.local --import tsx src/cli/create-admin.ts
```

### Reset An Admin Password By CLI

Set:

```env
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=new-long-password
```

Run:

```bash
node --env-file=.env --env-file=.env.local --import tsx src/cli/reset-admin-password.ts
```

The CLI reset command:

- updates the Argon2id password hash;
- reactivates the admin account;
- revokes existing sessions;
- writes an audit log entry.

## Environment Variables

`.env.example` contains the full list. Common values:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. Put local overrides in `.env.local`. |
| `APP_NAME` | yes | Display name. Default: `Mail Ninja`. |
| `APP_BASE_URL` | yes | Base URL used for links and webhook display. |
| `APP_TIMEZONE` | yes | Default application timezone. |
| `SESSION_SECRET` | yes | Long random secret for session security. |
| `SESSION_TTL_HOURS` | yes | Admin session lifetime. |
| `INITIAL_ADMIN_EMAIL` | bootstrap | Admin email used by seed/CLI. |
| `INITIAL_ADMIN_PASSWORD` | bootstrap | Admin password used by seed/CLI. |
| `INITIAL_ADMIN_NAME` | bootstrap | Admin display name used by seed/CLI. |
| `RESEND_API_KEY` | sending | Resend API key. |
| `RESEND_WEBHOOK_SECRET` | webhooks | Resend webhook verification secret. |
| `DEFAULT_FROM_NAME` | sending | Default sender name. |
| `DEFAULT_FROM_EMAIL` | sending | Default sender email. |
| `DEFAULT_REPLY_TO` | optional | Default reply-to email. |
| `MAX_IMPORT_FILE_SIZE_MB` | yes | Upload limit for imports. |
| `MAX_IMPORT_ROWS` | yes | Import row limit. |
| `IMPORT_RETENTION_DAYS` | yes | Retention window for raw import data. |
| `WORKER_ID` | worker | Worker identity for job locks. |
| `WORKER_CONCURRENCY` | worker | Number of jobs claimed per poll. |
| `JOB_POLL_INTERVAL_MS` | worker | Worker polling interval. |
| `JOB_LOCK_TIMEOUT_MINUTES` | worker | Stale job lock timeout. |

Do not commit production secrets.

## Database

Generate migrations after schema changes:

```bash
npm run db:generate
```

Apply migrations:

```bash
node --env-file=.env --env-file=.env.local --import tsx src/db/migrate.ts
```

Create a single SQL structure file for a fresh database or manual SQL editor setup:

```bash
npm run db:structure
```

The generated file is `docs/database-structure.sql`. Check that it is still in sync with migrations:

```bash
npm run db:structure:check
```

Seed bootstrap data:

```bash
node --env-file=.env --env-file=.env.local --import tsx src/db/seed.ts
```

The seed creates:

- one default workspace;
- workspace settings;
- one initial admin if admin env variables are present.

The seed does not create demo recipients, campaigns, suppressions, or events.

## Recipient Priority Cohorts

CSV import can optionally score recipients during analysis. The scoring is explainable and based on available fields such as:

- verified email;
- marketing consent;
- recent activity;
- known locale;
- known role;
- known platform;
- external id.

Generated cohorts:

```text
high_intent
engaged
standard
low_confidence
```

Priority scoring is optional. Enable it on the import detail page with:

```text
Auto-score priority cohorts during analysis
```

Administrators can manually override any recipient priority from the recipient detail page. Campaign preparation uses `priority_score DESC, recipient_id ASC`, so higher-priority recipients are assigned to earlier waves first.

## Import Template

Open:

```text
Imports -> Upload CSV
```

The page includes:

- a downloadable recipient CSV template;
- the exact import header;
- field types and required flags;
- a `Copy structure` button with a ready-to-use structure reference and SQL export example.

Only `email` is required. All other fields can be mapped or left empty.

## Resend Setup

You can configure Resend in two ways:

1. Environment fallback key.
2. Provider key pool in the private UI.

### Environment Fallback

Set secrets in `.env.local` or your deployment secret manager:

```env
RESEND_API_KEY=...
RESEND_WEBHOOK_SECRET=...
DEFAULT_FROM_EMAIL=sender@your-domain.example
DEFAULT_REPLY_TO=support@your-domain.example
```

In Mail Ninja:

1. Open `Settings`.
2. Check `Resend Connection`.
3. Save sender settings.
4. Copy the webhook URL displayed in the UI.

Webhook route:

```text
POST /api/webhooks/resend
```

In Resend:

1. Verify your sending domain.
2. Create a webhook endpoint using your public app URL.
3. Subscribe to delivery, open, click, bounce, complaint, failure, suppression, and unsubscribe events where available.

Secrets are never displayed in the browser.

### Provider Key Pool

Open:

```text
Settings -> Provider Keys
```

From there you can add any number of API keys. Each key has:

- provider type;
- display name;
- encrypted API key;
- optional encrypted webhook secret;
- routing order;
- status: active, paused, or failed;
- usage count;
- last used timestamp.

Supported routing strategies:

| Strategy | Behavior |
| --- | --- |
| `Sequential` | Uses active keys in routing order and lower usage count first. Good for controlled quota consumption. |
| `Parallel` | Distributes operations across active keys. Good for spreading throughput across multiple keys. |

Set the strategy in:

```text
Settings -> Sender Settings -> API key routing
```

Provider analytics modes:

| Mode | Behavior |
| --- | --- |
| `Combined` | Campaign analytics show all provider keys together. |
| `By API key` | Campaign analytics include a provider key breakdown for sent, delivered, opened, clicked, bounced, complained, and unsubscribed events. |

Set the metrics mode in:

```text
Settings -> Sender Settings -> Provider metrics
```

API keys and webhook secrets are encrypted before being stored in PostgreSQL. They are never shown back in the UI. Environment variables remain available as a fallback when no active provider keys exist.

## Docker

The repository includes:

- `Dockerfile`
- `docker-compose.yml`
- `docker-compose.production.yml`
- `.env.docker.example`

Start the stack:

```bash
cp .env.docker.example .env
docker compose up --build
```

Docker services:

```text
postgres
migrate
seed
web
worker
```

The default local compose file runs migrations and seed as one-shot setup services before starting web and worker. For production deployments, you may still choose to run migrations explicitly as part of a release step:

```bash
docker compose run --rm web node --env-file=.env --import tsx src/db/migrate.ts
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Build the production web app. |
| `npm run start` | Start the built web app. |
| `npm run worker` | Start the worker process. |
| `npm run db:generate` | Generate Drizzle migrations. |
| `npm run db:migrate` | Apply migrations using the current shell env. |
| `npm run db:structure` | Generate `docs/database-structure.sql` from all migrations. |
| `npm run db:structure:check` | Verify that `docs/database-structure.sql` is up to date. |
| `npm run db:seed` | Seed bootstrap workspace/admin data. |
| `npm run admin:create` | Create an admin from env values. |
| `npm run admin:reset-password` | Reset an admin password from env values. |
| `npm run typecheck` | Run TypeScript checks. |
| `npm run test` | Run Vitest tests. |
| `npm run test:e2e` | Run Playwright tests. |

For scripts that need `.env.local`, use the explicit Node form:

```bash
node --env-file=.env --env-file=.env.local --import tsx src/db/migrate.ts
node --env-file=.env --env-file=.env.local --import tsx src/db/seed.ts
node --env-file=.env --env-file=.env.local --import tsx src/worker/index.ts
```

## Main Routes

| Route | Purpose |
| --- | --- |
| `/login` | Administrator login |
| `/dashboard` | Global dashboard |
| `/campaigns` | Campaign list |
| `/campaigns/new` | New campaign |
| `/recipients` | Recipient list |
| `/imports` | Import list |
| `/imports/new` | Upload CSV import |
| `/suppressions` | Suppression management |
| `/events` | Technical event explorer |
| `/jobs` | Job inspection |
| `/settings` | App and Resend settings |
| `/settings/providers` | Provider API key pool |
| `/settings/admins` | Administrator management |

## Health Checks

```text
GET /api/health
GET /api/health/ready
```

`/api/health/ready` verifies database connectivity and returns `503` when the database is not reachable.

## Security Model

- No public registration.
- No hosted authentication provider.
- Passwords are Argon2id hashes.
- Raw session tokens are never stored.
- Session tokens are stored as hashes in PostgreSQL.
- Cookies are HttpOnly and SameSite Strict.
- Cookies are marked secure in production.
- Provider secrets stay in environment variables.
- Resend webhooks are verified before being accepted.
- Duplicate webhook events are deduplicated by provider event id.
- Sensitive actions are written to `audit_logs`.

## Production Checklist

Before production use:

- Change the default admin password.
- Set a strong `SESSION_SECRET`.
- Use HTTPS.
- Configure a public `APP_BASE_URL`.
- Configure `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET`.
- Verify your sender domain in Resend.
- Run `web` and `worker` as separate processes.
- Run migrations explicitly during deployment.
- Configure PostgreSQL backups.
- Configure upload storage and retention.
- Review logs for secret redaction.
- Configure trusted proxy headers if deployed behind a reverse proxy.

## Troubleshooting

### `DATABASE_URL is required`

Next.js loads `.env.local`, but standalone Node scripts do not unless you pass env files explicitly. Use:

```bash
node --env-file=.env --env-file=.env.local --import tsx src/db/migrate.ts
```

### Cannot log in

Reset the admin password:

```bash
node --env-file=.env --env-file=.env.local --import tsx src/cli/reset-admin-password.ts
```

Then log in with `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`.

### Resend shows missing configuration

Check:

```env
RESEND_API_KEY
RESEND_WEBHOOK_SECRET
DEFAULT_FROM_EMAIL
APP_BASE_URL
```

Restart the web process after changing env files.

## Current Status

Mail Ninja currently includes the application foundation: authentication, settings, administrator management, recipients, suppressions, imports, campaigns, waves, PostgreSQL jobs, webhook event storage, and analytics scaffolding.

Before enabling real production campaign sends, validate the Resend contact, segment, broadcast, and webhook flow against the target Resend account and verified domain.
