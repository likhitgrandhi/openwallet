import { NextResponse } from 'next/server';
import { Pool } from 'pg';

/**
 * Debug endpoint to verify auth/database setup.
 * Remove or protect in production.
 */
export async function GET() {
  const checks: Record<string, string | boolean> = {};

  const dbUrl =
    process.env.BETTER_AUTH_DATABASE_POSTGRES_URL ??
    process.env.BETTER_AUTH_DATABASE_URL;
  checks['has_postgres_url'] = !!dbUrl?.startsWith('postgres');
  checks['BETTER_AUTH_SECRET'] = !!process.env.BETTER_AUTH_SECRET;
  checks['BETTER_AUTH_URL'] = process.env.BETTER_AUTH_URL || '(not set)';
  checks['GOOGLE_CLIENT_ID'] = !!process.env.GOOGLE_CLIENT_ID;
  checks['GOOGLE_CLIENT_SECRET'] = !!process.env.GOOGLE_CLIENT_SECRET;

  if (dbUrl?.startsWith('postgres')) {
    try {
      const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
      });
      await pool.query('SELECT 1');
      await pool.end();
      checks['db_connection'] = 'ok';
    } catch (err) {
      checks['db_connection'] = 'failed';
      checks['db_error'] = err instanceof Error ? err.message : String(err);
    }
  } else {
    checks['db_connection'] = 'skipped (no postgres url)';
  }

  return NextResponse.json(checks);
}
