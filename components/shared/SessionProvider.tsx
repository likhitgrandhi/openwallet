'use client';

/**
 * Better Auth uses authClient.useSession() directly — no provider needed.
 * This component exists for layout compatibility and future extensibility.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
