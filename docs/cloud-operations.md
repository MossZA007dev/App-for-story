# Saga Forge Cloud

Live site: https://saga-forge-nine.vercel.app

The cloud version uses Supabase PostgreSQL, Auth, and private Storage. Account sessions establish an `authenticated` database transaction with row-level policies; the server's database connection is never exposed to the browser. AI credentials are encrypted separately for each account. Media is served with short-lived signed URLs after checking account access.

## Development

Use Node 22, `npm install`, and `npm run dev -- --port 3004`. Enter configuration locally using `python3 scripts/cloud/configure.py`; never paste credentials into issues or chats. `.env.local` and the downloaded `.supabase-ca.crt` must stay ignored by Git.

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are public client configuration. `DATABASE_URL` and `SETTINGS_ENCRYPTION_KEY` are server-only. The encryption key is 32 random bytes in base64; retain it across deployments so saved settings remain readable. Production also needs the Supabase database certificate in `SUPABASE_CA_CERT`. Local development reads `.supabase-ca.crt` by default.

## Schema and migration

Reviewed SQL lives in `supabase/migrations`. `scripts/cloud/prepare-database.ts` is dry-run by default and uses a transaction, an advisory lock and migration checksums with `--apply`. Do not run the old SQLite `db:push` or seed workflow against production.

The initial transfer was completed from a consistent read-only snapshot of the original Mac database, retaining stable IDs and checking every manuscript and media checksum. The original Mac data was left intact. Migration credentials are separate from runtime settings and must not be deployed. Do not rerun the initial importer after editing cloud manuscripts; it deliberately refuses mismatching source data rather than overwrite it.

Use the online site on both computers after migration. Changes made to the old localhost SQLite app are not synchronized into Supabase.

## Collaboration

The story owner opens the editor and selects **เชิญเพื่อนร่วมเขียน**. Invitations use a random single-use token, stored only as a hash, and expire in seven days. The raw token stays in the invitation URL fragment until the recipient submits it after signing in. Owners can assign reader/editor roles, revoke pending invitations, and remove members. Story participant labels from the original local app are descriptive metadata; they do not grant account permissions.

Scene saves carry the version loaded by the editor. A database row lock serializes writers; a stale save returns HTTP 409 and keeps the local manuscript available for copying. Background refresh skips unsaved changes. This is shared editing with conflict detection, not simultaneous cursor-based text merging.

## Deployments

The Vercel project is `saga-forge`; source is deployed from this cloud checkout. Automatic Git deployment was disconnected because the original repository main branch still contains the local SQLite application. Reconnect Git only after integrating the cloud version into the intended production branch. `.vercelignore` excludes local databases, old story assets, environment files, private certificates, and migration scripts. Static legacy `/images/` references fall back to the authenticated media endpoint in production.

Runtime environment transfer uses an explicit whitelist; migration and AI service keys are excluded. `scripts/cloud/configure-vercel.cjs` sends values through stdin and prints names/status only. The production site origin is derived from the request when `NEXT_PUBLIC_SITE_URL` is unset. Supabase Auth redirect URLs must include the production callback and the password-reset callback.

Email confirmation is disabled for the current private test to avoid the built-in email provider's restrictions. Before a public/commercial launch, configure a mail provider and email verification.

## Validation

- `node scripts/cloud/test-account-security.cjs`: isolated PostgreSQL policy tests.
- `node --import tsx scripts/cloud/test-scene-conflict.ts`: disposable project and two real database connections.
- `node --import tsx scripts/cloud/test-hosted-collaboration.ts`: disposable confirmed accounts, hosted login, invitations, stale-save rejection, reader restrictions, private avatar/bookmarks/AI settings, revocation, and cleanup. Requires a locally entered administrative migration credential; sends no email and calls no generation provider.
- `npm audit --omit=dev` and `npm run build` before deployment.
