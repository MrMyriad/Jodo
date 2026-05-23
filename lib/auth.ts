/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Plan } from "@prisma/client";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { sendWelcomeSequence } from "@/lib/email/sequences";
import { prisma } from "@/lib/prisma";

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

const emailServerHost = process.env.EMAIL_SERVER_HOST;
const emailServerPort = process.env.EMAIL_SERVER_PORT;
const emailServerUser = process.env.EMAIL_SERVER_USER;
const emailServerPassword = process.env.EMAIL_SERVER_PASSWORD;
const emailFrom = process.env.EMAIL_FROM;

if (
  emailServerHost &&
  emailServerPort &&
  emailServerUser &&
  emailServerPassword &&
  emailFrom
) {
  providers.push(
    EmailProvider({
      server: {
        host: emailServerHost,
        port: Number(emailServerPort),
        auth: {
          user: emailServerUser,
          pass: emailServerPassword,
        },
      },
      from: emailFrom,
      maxAge: 24 * 60 * 60,
    }),
  );
}

if (providers.length === 0) {
  if (process.env.NODE_ENV === "development") {
    // In local development, provide a simple credentials provider so
    // developers can sign in without configuring OAuth/SMTP. This will
    // create or return a Prisma user record for the provided email.
    providers.push(
      CredentialsProvider({
        id: "dev-email",
        name: "Developer Email",
        credentials: {
          email: { label: "Email", type: "text" },
        },
        authorize: async (creds) => {
          const email = creds?.email as string | undefined;
          if (!email) return null;

          try {
            // If no DATABASE_URL is configured in dev, return an ephemeral
            // in-memory dev user so sign-in works without a database.
            if (!process.env.DATABASE_URL) {
              return {
                id: `dev:${email}`,
                email,
                name: email.split("@")[0],
                plan: Plan.FREE,
              } as any;
            }

            // create or find a local dev user
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
              return {
                id: existing.id,
                email: existing.email,
                name: existing.name ?? undefined,
                plan: existing.plan ?? undefined,
              } as any;
            }

            const created = await prisma.user.create({
              data: { email, name: email.split("@")[0] },
            });
            return {
              id: created.id,
              email: created.email,
              name: created.name ?? undefined,
              plan: created.plan ?? undefined,
            } as any;
          } catch (err) {
            if (process.env.NODE_ENV === "development") {
              return {
                id: `dev:${email}`,
                email,
                name: email.split("@")[0],
                plan: Plan.FREE,
              } as any;
            }

            return null;
          }
        },
      }),
    );
  } else {
    // In production, keep a no-op credentials provider to surface a clear
    // sign-in page rather than crash during initialization. It will not
    // authenticate users.
    providers.push(
      CredentialsProvider({
        id: "setup-required",
        name: "Setup Required",
        credentials: {},
        authorize: async () => null,
      }),
    );
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // Ensure a stable secret is provided; in production this MUST be set.
  secret:
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : "dev-nextauth-secret"),
  debug: process.env.NODE_ENV !== "production",
  // If a credentials provider is enabled (dev-only), NextAuth requires the
  // JWT session strategy for sign-in to work. Otherwise, use database
  // sessions backed by Prisma.
  session: {
    // Use JWT sessions in non-production to allow CredentialsProvider
    // sign-in flows during local development. Production keeps database
    // sessions backed by Prisma.
    strategy: process.env.NODE_ENV === "production" ? "database" : "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
    newUser: "/onboarding",
  },
  providers,
  events: {
    createUser: async ({ user }) => {
      if (!user?.id || !user.email) {
        return;
      }

      try {
        await sendWelcomeSequence({
          userId: user.id,
          email: user.email,
          name: user.name,
        });
      } catch (error) {
        console.error("[auth.createUser] welcome sequence failed:", error);
      }
    },
  },
  callbacks: {
    // Populate JWT token on first sign-in so session() can read it when
    // using the `jwt` session strategy in development.
    jwt: async ({ token, user }: any) => {
      if (user) {
        token.id = (user as any).id;
        token.email = (user as any).email;
        token.plan = (user as any).plan ?? Plan.FREE;
      }
      return token;
    },
    session: async ({ session, token }: any) => {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = session.user.email ?? token.email;
        session.user.plan = (token.plan ?? Plan.FREE) as Plan;
      }
      return session;
    },
  },
};
