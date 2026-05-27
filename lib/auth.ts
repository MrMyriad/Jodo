/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Plan } from "@prisma/client";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import { type Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import { type SendVerificationRequestParams } from "next-auth/providers/email";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { sendWelcomeSequence } from "@/lib/email/sequences";
import { getEmailFromAddress, getResendClient } from "@/lib/email/resend-client";
import { prisma } from "@/lib/prisma";

type EmailServerConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
};

type MagicLinkTransport = "resend-api" | "smtp" | "disabled";

type MagicLinkUrlDiagnostics = {
  sourceHost: string | null;
  sourcePath: string | null;
  finalHost: string | null;
  finalPath: string | null;
  callbackHost: string | null;
  callbackPath: string | null;
  hasToken: boolean;
  hasEmail: boolean;
  rebuilt: boolean;
};

type AdapterCreateUserInput = Parameters<NonNullable<Adapter["createUser"]>>[0];
type AdapterUpdateUserInput = Parameters<NonNullable<Adapter["updateUser"]>>[0];

const providers: NonNullable<NextAuthOptions["providers"]> = [];

function sanitizePrismaMessage(message: string | undefined): string | undefined {
  if (!message) {
    return undefined;
  }

  return message
    .split("\n")[0]
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/token=[^&\s]+/gi, "token=[redacted]")
    .slice(0, 240);
}

function getPrismaErrorDetails(error: unknown) {
  const maybePrismaError = error as {
    code?: string;
    name?: string;
    message?: string;
  };

  return {
    name: maybePrismaError.name ?? "Error",
    code: maybePrismaError.code ?? null,
    message: sanitizePrismaMessage(maybePrismaError.message),
  };
}

function logAdapterDiagnostic(
  level: "info" | "error",
  message: string,
  details: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (level === "error") {
    console.error(message, details);
    return;
  }

  console.info(message, details);
}

function createLoggingPrismaAdapter(): Adapter {
  const adapter = PrismaAdapter(prisma);

  return {
    ...adapter,
    async getUserByEmail(email) {
      try {
        const user = await adapter.getUserByEmail!(email);
        logAdapterDiagnostic("info", "[auth.adapter] getUserByEmail completed", {
          provider: "email",
          userExists: Boolean(user),
        });
        return user;
      } catch (error) {
        logAdapterDiagnostic("error", "[auth.adapter] getUserByEmail failed", {
          provider: "email",
          error: getPrismaErrorDetails(error),
        });
        throw error;
      }
    },
    async createUser(user: AdapterCreateUserInput) {
      logAdapterDiagnostic("info", "[auth.adapter] createUser started", {
        provider: "email-or-oauth",
        hasEmail: Boolean(user.email),
        hasName: Boolean(user.name),
        hasImage: Boolean(user.image),
        hasEmailVerified: Boolean(user.emailVerified),
      });

      try {
        const createdUser = await adapter.createUser!(user);
        logAdapterDiagnostic("info", "[auth.adapter] createUser completed", {
          provider: "email-or-oauth",
          createUserSucceeded: true,
          userExists: Boolean(createdUser?.id),
        });
        return createdUser;
      } catch (error) {
        logAdapterDiagnostic("error", "[auth.adapter] createUser failed", {
          provider: "email-or-oauth",
          createUserSucceeded: false,
          error: getPrismaErrorDetails(error),
        });
        throw error;
      }
    },
    async updateUser(user: AdapterUpdateUserInput) {
      try {
        const updatedUser = await adapter.updateUser!(user);
        logAdapterDiagnostic("info", "[auth.adapter] updateUser completed", {
          provider: "email-or-oauth",
          hasEmailVerified: Boolean(user.emailVerified),
          updateUserSucceeded: true,
        });
        return updatedUser;
      } catch (error) {
        logAdapterDiagnostic("error", "[auth.adapter] updateUser failed", {
          provider: "email-or-oauth",
          hasEmailVerified: Boolean(user.emailVerified),
          error: getPrismaErrorDetails(error),
        });
        throw error;
      }
    },
  };
}

function cleanEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function hasEnv(key: string): boolean {
  return Boolean(cleanEnv(key));
}

function getAuthBaseUrl(): string | undefined {
  return (cleanEnv("NEXTAUTH_URL") ?? cleanEnv("NEXT_PUBLIC_APP_URL"))?.replace(
    /\/+$/,
    "",
  );
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
  if (getResendClient()) {
    return cleanEnv("RESEND_FROM_EMAIL") ?? cleanEnv("EMAIL_FROM");
  }

  return cleanEnv("EMAIL_FROM") ?? cleanEnv("RESEND_FROM_EMAIL");
}

function getMagicLinkTransport(): MagicLinkTransport {
  if (getResendClient()) {
    return "resend-api";
  }

  return getEmailServerConfig() ? "smtp" : "disabled";
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeMagicLinkCallbackUrl(
  callbackUrl: string | null,
  baseUrl: string,
): URL {
  const fallback = new URL("/dashboard", baseUrl);

  if (!callbackUrl) {
    return fallback;
  }

  try {
    const parsed = new URL(callbackUrl, baseUrl);
    const isSameOrigin = parsed.origin === fallback.origin;
    const isVerifyRequestPage =
      parsed.pathname === "/auth/verify-request" ||
      parsed.pathname === "/api/auth/verify-request";

    if (!isSameOrigin || isVerifyRequestPage) {
      return fallback;
    }

    return parsed;
  } catch {
    return fallback;
  }
}

function safeUrlParts(url: URL | null) {
  return {
    host: url?.host ?? null,
    path: url?.pathname ?? null,
  };
}

function createEmailVerificationUrl({
  rawUrl,
  token,
  identifier,
  providerId,
}: {
  rawUrl: string;
  token: string;
  identifier: string;
  providerId: string;
}): { verificationUrl: string; diagnostics: MagicLinkUrlDiagnostics } {
  const baseUrl = getAuthBaseUrl() ?? "http://localhost:3000";
  let sourceUrl: URL | null = null;

  try {
    sourceUrl = new URL(rawUrl, baseUrl);
  } catch {
    sourceUrl = null;
  }

  const expectedPath = `/api/auth/callback/${providerId}`;
  const sourceIsCallback = sourceUrl?.pathname === expectedPath;
  const sourceHasToken = Boolean(sourceUrl?.searchParams.get("token"));
  const sourceHasEmail = Boolean(sourceUrl?.searchParams.get("email"));

  const finalUrl =
    sourceIsCallback && sourceHasToken && sourceHasEmail
      ? new URL(sourceUrl!.toString())
      : new URL(expectedPath, baseUrl);

  if (!finalUrl.searchParams.get("token")) {
    finalUrl.searchParams.set("token", token);
  }

  if (!finalUrl.searchParams.get("email")) {
    finalUrl.searchParams.set("email", identifier);
  }

  const callbackUrl = normalizeMagicLinkCallbackUrl(
    finalUrl.searchParams.get("callbackUrl"),
    baseUrl,
  );
  finalUrl.searchParams.set("callbackUrl", callbackUrl.toString());

  const sourceParts = safeUrlParts(sourceUrl);
  const finalParts = safeUrlParts(finalUrl);
  const callbackParts = safeUrlParts(callbackUrl);

  return {
    verificationUrl: finalUrl.toString(),
    diagnostics: {
      sourceHost: sourceParts.host,
      sourcePath: sourceParts.path,
      finalHost: finalParts.host,
      finalPath: finalParts.path,
      callbackHost: callbackParts.host,
      callbackPath: callbackParts.path,
      hasToken: Boolean(finalUrl.searchParams.get("token")),
      hasEmail: Boolean(finalUrl.searchParams.get("email")),
      rebuilt: !sourceIsCallback || !sourceHasToken || !sourceHasEmail,
    },
  };
}

function logMagicLinkUrlDiagnostics(diagnostics: MagicLinkUrlDiagnostics) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  console.info("[auth.email] magic-link URL diagnostics", diagnostics);
}

function buildMagicLinkEmail(url: string) {
  const escapedUrl = escapeHtmlAttribute(url);

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
  token,
  url,
  provider,
}: SendVerificationRequestParams) {
  const resend = getResendClient();
  if (!resend) {
    throw new Error("Resend API client is not configured.");
  }

  const { verificationUrl, diagnostics } = createEmailVerificationUrl({
    rawUrl: url,
    token,
    identifier,
    providerId: provider.id,
  });

  logMagicLinkUrlDiagnostics(diagnostics);

  const email = buildMagicLinkEmail(verificationUrl);
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
const magicLinkFrom = getResendClient()
  ? getEmailFromAddress()
  : emailServerConfig?.from ?? getMagicLinkFromAddress();

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
  adapter: createLoggingPrismaAdapter(),
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
