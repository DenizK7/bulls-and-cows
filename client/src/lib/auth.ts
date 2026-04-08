import type { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.googleId = account.providerAccountId;
        token.picture = (profile as { picture?: string }).picture;

        // Get JWT from our backend
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            googleId: account.providerAccountId,
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
