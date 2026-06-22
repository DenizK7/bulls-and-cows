import type { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// DEV ONLY: one-click local login that bypasses Google. Gated on NODE_ENV so it is
// NEVER registered in production builds (Hetzner runs `next start` -> production).
const DEV_LOGIN_ENABLED = process.env.NODE_ENV !== 'production';
// Two distinct local accounts so PvP/rematch can be tested across two windows.
const DEV_USERS: Record<string, { id: string; email: string; name: string; image: string }> = {
  '1': { id: 'dev-local-1', email: 'deniz@dev.local', name: 'Deniz', image: '' },
  '2': { id: 'dev-local-2', email: 'rakip@dev.local', name: 'Rakip', image: '' },
};

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

const providers: AuthOptions['providers'] = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
];

if (DEV_LOGIN_ENABLED) {
  providers.push(
    CredentialsProvider({
      id: 'dev',
      name: 'Dev Login',
      credentials: { who: { label: 'who', type: 'text' } },
      async authorize(credentials) {
        return DEV_USERS[credentials?.who === '2' ? '2' : '1'];
      },
    }),
  );
}

export const authOptions: AuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // Capture identity on the initial sign-in.
      if (account) {
        if (account.provider === 'google' && profile) {
          token.googleId = account.providerAccountId;
          token.picture = (profile as { picture?: string }).picture;
        } else if (account.provider === 'dev') {
          token.googleId = (user?.id as string) ?? DEV_USERS['1'].id;
          token.picture = '';
          if (user?.email) token.email = user.email;
          if (user?.name) token.name = user.name;
        }
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
