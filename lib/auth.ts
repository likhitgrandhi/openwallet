import { betterAuth } from 'better-auth';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import path from 'path';

// Postgres for production (Vercel); SQLite for local dev
// Supabase integration creates BETTER_AUTH_DATABASE_POSTGRES_URL
const dbUrl =
  process.env.BETTER_AUTH_DATABASE_URL ??
  process.env.BETTER_AUTH_DATABASE_POSTGRES_URL;

// In production, require Postgres (SQLite fails on Vercel serverless)
if (process.env.NODE_ENV === 'production' && !dbUrl?.startsWith('postgres')) {
  throw new Error(
    'BETTER_AUTH_DATABASE_URL or BETTER_AUTH_DATABASE_POSTGRES_URL must be set in production'
  );
}

const database =
  dbUrl?.startsWith('postgres')
    ? new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        idleTimeoutMillis: 10000,
      })
    : new Database(dbUrl ?? path.join(process.cwd(), 'auth.db'));

export const auth = betterAuth({
  database,
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
  trustedOrigins: [
    'http://localhost:3000',
    'https://passbook.live',
    'https://www.passbook.live',
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/gmail.readonly',
      ],
    },
  },
  pages: {
    signIn: '/login',
  },
});
