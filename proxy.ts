import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public paths
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Allow if a valid Better Auth session exists
  const session = await auth.api.getSession({ headers: req.headers });
  if (session) return NextResponse.next();

  // Allow if the user explicitly chose demo mode
  const demoMode = req.cookies.get('demo_mode')?.value;
  if (demoMode === '1') return NextResponse.next();

  // Otherwise redirect to login
  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
