import { NextResponse } from 'next/server';

// Sets a demo-mode cookie so middleware lets the user through without a Google session.
export function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get('callbackUrl') || '/';
  const response = NextResponse.redirect(new URL(redirectTo, req.url));
  response.cookies.set('demo_mode', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return response;
}
