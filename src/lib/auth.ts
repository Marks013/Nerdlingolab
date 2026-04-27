import { PrismaAdapter } from "@auth/prisma-adapter";
import { UserRole } from "@/generated/prisma/client";
import bcrypt from "bcryptjs";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "E-mail", type: "email" },
      password: { label: "Senha", type: "password" }
    },
    async authorize(rawCredentials) {
      const parsedCredentials = credentialsSchema.safeParse(rawCredentials);

      if (!parsedCredentials.success) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email: parsedCredentials.data.email }
      });

      if (!user?.passwordHash) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(
        parsedCredentials.data.password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role
      };
    }
  })
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET
    })
  );
}

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    maxAge: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 12,
    strategy: "jwt"
  },
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === "production",
  pages: {
    signIn: "/entrar"
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }

      if (!token.role && token.sub) {
        const persistedUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true }
        });

        token.role = persistedUser?.role ?? UserRole.CUSTOMER;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role ?? UserRole.CUSTOMER;
      }

      return session;
    }
  }
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
