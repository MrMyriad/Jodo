/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Plan } from "@prisma/client";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { type SendVerificationRequestParams } from "next-auth/providers/email";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { sendWelcomeSequence } from "@/lib/email/sequences";
import { getResendClient } from "@/lib/email/resend-client";
import { prisma } from "@/lib/prisma";

type EmailServerConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
};

type MagicLinkTransport = "resend-api" | "smtp" | "disabled";

const providers: NonNullable<NextAuthOptions["providers"]> = [];

function cleanEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function hasEnv(key: string): boolean {
  return Boolean(cleanEnv(key));
}

function getAuthBaseUrl(): string | undefined {
  return cleanEnv("NEXTAUTH_URL") ?? cleanEnv("NEXT_PUBLIC_APP_URL");
}

function getEmailServerConfig(): EmailServerConfig | null {
  const host = cleanEnv("EMAIL_SERVER_HOST") ?? cleanEnv("SMTP_HOST");
  const portValue = cleanEnv("EMAIL_SERVER_PORT") ?? cleanEnv("SMTP_PORT") ?? "587";
  const port = Number(portValue);
  const user = cleanEnv("EMAIL_SERVER_USER") ?? cleanEnv("SMTP_USER");
  const password =
    cleanEnv("EMAIL_SERVER_PASSWORD") ??
    cleanEnv("SMTP_PASSWORD") ??
    cleanEnv("RESEND_API_KEY");
  const from =
    cleanEnv("EMAIL_FROM") ??
    cleanEnv("RESEND_FROM_EMAIL");

  if (!host || !Number.isInteger(port) || port <= 0 || !user || !password || !from) {
    return null;
  }

  return {
    host,
    port,
    user,
    password,
    from,
  };
}

function getMagicLinkFromAddress(): string | undefined {
  return cleanEnv("EMAIL_FROM") ?? cleanEnv("RESEND_FROM_EMAIL");
}

function getMagicLinkTransport(): MagicLinkTransport {
  if (getResendClient()) {
    return "resend-api";
  }

  return getEmailServerConfig() ? "smtp" : "disabled";
}

function buildMagicLinkEmail(url: string) {
  const escapedUrl = url.replace(/"/g, "&quot;");

  return {
    subject: "Sign in to JODO",
    text: `Sign in to JODO: ${url}\n\nThis link expires in 24 hours. If you did not request it, you can ignore this email.`,
    html: `<div style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#111827">
  <h1 style="font-size:20px;margin:0 0 12px">Sign in to JODO</h1>
  <p style="margin:0 0 20px">Use this secure magic link to access your JODO workspace.</p>
  <p style="margin:0 0 24px">
    <a href="${escapedUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">Open JODO</a>
  </p>
  <p style="font-size:13px;color:#6b7280;margin:0">This link expires in 24 hours. If you did not request it, you can ignore this email.</p>
</div>`,
  };
}

async function sendResendVerificationRequest({
  identifier,
  url,
  provider,
}: SendVerificationRequestParams) {
  const resend = getResendClient();
  if (!resend) {
    throw new Error("Resend API client is not configured.");
  }

  const email = buildMagicLinkEmail(url);
  const { error } = await resend.emails.send({
    from: provider.from,
    to: [identifier],
    subject: email.subject,
    text: email.text,
    html: email.html,
    tags: [{ name: "auth", value: "magic-link" }],
  });

  if (error) {
    console.error("[auth.email] Resend magic-link send failed", {
      message: error.message,
      name: error.name,
    });
    throw new Error(error.message || "Failed to send magic link.");
  }
}

export function logAuthConfigDiagnostics() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const globalForDiagnostics = globalThis as typeof globalThis & {
    __jodoAuthDiagnosticsLogged?: boolean;
  };

  if (globalForDiagnostics.__jodoAuthDiagnosticsLogged) {
    return;
  }

  globalForDiagnostics.__jodoAuthDiagnosticsLogged = true;

  const nextAuthUrl = cleanEnv("NEXTAUTH_URL");
  const publicAppUrl = cleanEnv("NEXT_PUBLIC_APP_URL");

  console.info("[auth.config] provider/env presence", {
    nextAuthUrlPresent: Boolean(nextAuthUrl),
    nextPublicAppUrlPresent: Boolean(publicAppUrl),
    nextAuthSecretPresent: hasEnv("NEXTAUTH_SECRET"),
    googleClientIdPresent: hasEnv("GOOGLE_CLIENT_ID"),
    googleClientSecretPresent: hasEnv("GOOGLE_CLIENT_SECRET"),
    emailServerHostPresent: hasEnv("EMAIL_SERVER_HOST"),
    emailServerPortPresent: hasEnv("EMAIL_SERVER_PORT"),
    emailServerUserPresent: hasEnv("EMAIL_SERVER_USER"),
    emailServerPasswordPresent: hasEnv("EMAIL_SERVER_PASSWORD"),
    emailFromPresent: hasEnv("EMAIL_FROM"),
    resendApiKeyPresent: hasEnv("RESEND_API_KEY"),
    resendFromEmailPresent: hasEnv("RESEND_FROM_EMAIL"),
    smtpHostAliasPresent: hasEnv("SMTP_HOST"),
    smtpUserAliasPresent: hasEnv("SMTP_USER"),
    smtpPasswordAliasPresent: hasEnv("SMTP_PASSWORD"),
    googleProviderEnabled: providers.some((provider) => provider.id === "google"),
    emailProviderEnabled: providers.some((provider) => provider.id === "email"),
    magicLinkTransport: getMagicLinkTransport(),
    nextAuthUrlMatchesPublicAppUrl:
      Boolean(nextAuthUrl && publicAppUrl) &&
      nextAuthUrl?.replace(/\/+$/, "") === publicAppUrl?.replace(/\/+$/, ""),
    nextAuthUrlHasTrailingSlash: Boolean(nextAuthUrl?.endsWith("/")),
    sessionStrategy: "jwt",
  });
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
          response_type: "code",
        },
      },
    }),
  );
}

const emailServerConfig = getEmailServerConfig();
const magicLinkFrom = emailServerConfig?.from ?? getMagicLinkFromAddress();

if (emailServerConfig || (getResendClient() && magicLinkFrom)) {
  providers.push(
    EmailProvider({
      ...(emailServerConfig
        ? {
            server: {
              host: emailServerConfig.host,
              port: emailServerConfig.port,
              secure: emailServerConfig.port === 465,
              auth: {
                user: emailServerConfig.user,
                pass: emailServerConfig.password,
              },
            },
          }
        : {}),
      from: magicLinkFrom!,
      maxAge: 24 * 60 * 60,
      ...(getResendClient()
        ? { sendVerificationRequest: sendResendVerificationRequest }
        : {}),
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
  useSecureCookies: getAuthBaseUrl()?.startsWith("https://") ?? false,
  session: {
    // JWT sessions keep NextAuth middleware compatible in production while
    // Prisma still stores users, linked OAuth accounts, and magic-link tokens.
    strategy: "jwt",
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
    session: async ({ session, token, user }: any) => {
      if (session.user) {
        session.user.id = token?.id ?? user?.id ?? session.user.id;
        session.user.email = session.user.email ?? token?.email ?? user?.email;
        session.user.plan = (token?.plan ?? user?.plan ?? Plan.FREE) as Plan;
      }
      return session;
    },
    redirect: async ({ url, baseUrl }) => {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const target = new URL(url);
        if (target.origin === baseUrl) {
          return url;
        }
      } catch {
        // Fall through to the safe default below.
      }

      return baseUrl;
    },
  },
};
