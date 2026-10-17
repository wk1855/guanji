import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticateOwner } from "@/lib/owner";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        try {
          const user = await authenticateOwner(credentials.username, credentials.password);
          if (!user) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.avatar_url,
            supabaseId: user.id,
            tier: user.tier,
          };
        } catch (err) {
          console.error("[Auth] owner login failed:", err);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.supabaseId = (user as { supabaseId?: string }).supabaseId ?? user.id;
        token.tier = ((user as { tier?: "pro" }).tier ?? "pro") as "pro";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.supabaseId ?? token.sub) as string;
        session.user.tier = token.tier ?? "pro";
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/bazi`;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
