# Deployment Guide (Better Auth)

## Environment variables

Set these in your deployment platform (e.g. Vercel):

| Variable | Required | Description |
|---------|----------|-------------|
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `BETTER_AUTH_SECRET` | Yes | Secret for encryption (e.g. `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Yes | Full app URL (e.g. `https://passbook.live`) |
| `BETTER_AUTH_DATABASE_URL` or `BETTER_AUTH_DATABASE_POSTGRES_URL` | Yes (prod) | **Postgres connection string**. Supabase integration creates the latter. |
| `MOONSHOT_API_KEY` | Optional | For AI chat/plan features |
| `MOONSHOT_MODEL` | Optional | Default: `kimi-k2.5` |
| `MOONSHOT_BASE_URL` | Optional | Default: `https://api.moonshot.ai/v1` |

## Database (production)

**SQLite does not work on Vercel** (serverless, no persistent filesystem). Use PostgreSQL.

### 1. Create a Postgres database

Choose one:

- **Vercel Postgres**: Project → Storage → Create Database → Postgres
- **Neon**: [neon.tech](https://neon.tech) → Create project → copy connection string
- **Supabase**: [supabase.com](https://supabase.com) → New project → Settings → Database → Connection string (URI)

### 2. Add connection string to Vercel

In Vercel → Project → Settings → Environment Variables, add:

```
BETTER_AUTH_DATABASE_URL=postgres://user:password@host:5432/database?sslmode=require
```

Use the connection string from your provider.

### 3. Run migrations

Before or after first deploy, run migrations against your Postgres DB. With Supabase, use `BETTER_AUTH_DATABASE_POSTGRES_URL`:

```bash
BETTER_AUTH_DATABASE_POSTGRES_URL="postgres://..." npm run db:migrate
```

Or set the variable in `.env` locally and run:

```bash
npm run db:migrate
```

This creates the `user`, `session`, `account`, and `verification` tables.

## Google OAuth redirect URIs

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), add:

- `http://localhost:3000/api/auth/callback/google` (dev)
- `https://passbook.live/api/auth/callback/google` (prod)

## Local development

1. Copy `.env.local.example` to `.env.local`.
2. Add your Google OAuth credentials and `BETTER_AUTH_SECRET`.
3. Run `npm run dev`. SQLite DB (`auth.db`) is created automatically.
