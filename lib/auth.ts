import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

async function refreshAccessToken(token: {
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
}) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token!,
      }),
    });

    const refreshed = await response.json();

    if (!response.ok) throw refreshed;

    return {
      ...token,
      access_token: refreshed.access_token,
      // Google may not return a new refresh_token — keep the existing one
      refresh_token: refreshed.refresh_token ?? token.refresh_token,
      // expires_in is seconds from now
      expires_at: Math.floor(Date.now() / 1000) + (refreshed.expires_in as number),
    };
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' as const };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.readonly',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: persist tokens from OAuth response
      if (account) {
        return {
          ...token,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
        };
      }

      // Token still valid — return as-is
      if (
        typeof token.expires_at === 'number' &&
        Date.now() < token.expires_at * 1000 - 60_000 // 60s buffer
      ) {
        return token;
      }

      // Token expired — attempt silent refresh
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      session.access_token = token.access_token as string | undefined;
      // Expose refresh error so the client can force re-login
      if (token.error) {
        (session as typeof session & { error: string }).error = token.error as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
