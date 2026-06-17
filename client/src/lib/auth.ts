import type { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Mint a fresh backend JWT from our API and store it on the NextAuth token.
async function refreshBackendToken(token: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      googleId: token.googleId,
      email: token.email,
      name: token.name,
      image: token.picture,
    }),
  });

  if (res.ok) {
    const data = await res.json();
    token.backendToken = data.token;
    token.userId = data.user.id;
    token.tag = data.user.tag;
  }
}

// The backend JWT expires after 24h; refresh it once it is missing or within
// 1h of expiry so the session never carries a dead token (which 401s every
// API call and blocks the socket handshake -> game buttons go inactive).
function backendTokenExpiring(backendToken: unknown): boolean {
  if (typeof backendToken !== 'string') return true;
  try {
    const payload = JSON.parse(
      Buffer.from(backendToken.split('.')[1], 'base64url').toString(),
    ) as { exp?: number };
    if (!payload.exp) return true;
    return payload.exp * 1000 < Date.now() + 60 * 60 * 1000;
  } catch {
    return true;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Capture Google identity on the initial sign-in.
      if (account && profile) {
        token.googleId = account.providerAccountId;
        token.picture = (profile as { picture?: string }).picture;
      }

      // Mint/refresh the backend JWT before it lapses. Runs on sign-in (token
      // missing) and on later session reads once the token nears expiry, so a
      // long-lived NextAuth session stays backed by a valid backend token.
      if (token.googleId && token.email && backendTokenExpiring(token.backendToken)) {
        await refreshBackendToken(token as Record<string, unknown>);
      }

      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        backendToken: token.backendToken as string,
        userId: token.userId as string,
        tag: token.tag as string,
        user: {
          ...session.user,
          image: token.picture as string,
        },
      };
    },
  },
  pages: {
    signIn: '/login',
  },
};
