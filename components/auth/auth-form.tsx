"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { type ClientSafeProvider, getProviders, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "signin" | "signup";

type AuthFormProps = {
  mode: AuthMode;
  callbackUrl: string;
};

export function AuthForm({ mode, callbackUrl }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Record<
    string,
    ClientSafeProvider
  > | null>(null);

  useEffect(() => {
    void getProviders().then((availableProviders) => {
      setProviders(availableProviders);
    });
  }, []);

  const hasGoogle = Boolean(providers?.google);
  const hasEmail = Boolean(providers?.email);
  const hasDevCredentials = Boolean(
    providers?.["dev-email"] || providers?.["setup-required"],
  );
  const isLocalDevEmail = hasDevCredentials && !hasEmail;
  const providersLoading = providers === null;

  const submitEmailMagicLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    setIsLoading(true);

    try {
      if (hasEmail) {
        const result = await signIn("email", {
          email,
          redirect: false,
          callbackUrl,
        });

        if (result?.error) {
          setError(
            "Unable to send magic link. Please verify your email settings and try again.",
          );
          return;
        }

        setFeedback("Magic link sent. Check your inbox to continue.");
        router.push("/auth/verify-request");
        return;
      }

      // If no email provider is configured but a development credentials provider
      // exists, use it to sign in/create a dev user (local development only).
      if (hasDevCredentials) {
        const devId = providers?.["dev-email"] ? "dev-email" : "setup-required";
        const result = await signIn(devId as string, {
          email,
          redirect: false,
          callbackUrl,
        });

        if (result?.error) {
          setError("Unable to sign in with development credentials.");
          return;
        }

        // Credentials sign-in sets the session cookie, then a hard navigation
        // avoids stale app-router state during local audit/dev reloads.
        window.location.assign(callbackUrl);
        return;
      }

      if (providersLoading) {
        setError("Sign-in options are still loading. Please try again in a moment.");
        return;
      }

      setError(
        "Email sign-in is not configured yet. Add SMTP env values to enable magic links.",
      );
      return;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (isGoogleLoading || providersLoading) {
      return;
    }

    setError(null);
    setFeedback(null);
    setIsGoogleLoading(true);

    if (!hasGoogle) {
      setError(
        "Google sign-in is not configured yet. Add Google OAuth env values first.",
      );
      setIsGoogleLoading(false);
      return;
    }

    try {
      await signIn("google", { callbackUrl, redirect: true });
    } catch {
      setIsGoogleLoading(false);
      setError("Unable to start Google sign-in. Please try again.");
    }
  };

  const title =
    mode === "signin"
      ? "Sign in to JODO"
      : "Create your JODO account";
  const description =
    mode === "signin"
      ? isLocalDevEmail
        ? "Local audit mode is enabled. Enter the audit email to access the dashboard."
        : "Use Google or a magic link to access your dashboard."
      : "Start free and automate WhatsApp, Instagram, and payment workflows.";
  const emailButtonLabel = providersLoading
    ? "Loading sign-in..."
    : isLoading
      ? isLocalDevEmail
        ? "Signing in..."
        : "Sending..."
      : isLocalDevEmail
        ? "Continue with dev email"
        : "Send Magic Link";

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={signInWithGoogle}
          disabled={providersLoading || isGoogleLoading}
        >
          {isGoogleLoading ? "Opening Google..." : "Continue with Google"}
        </Button>

        <div className="text-center text-xs text-muted-foreground">
          or continue with email
        </div>

        <form onSubmit={submitEmailMagicLink} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder={isLocalDevEmail ? "audit@jodo.local" : "you@business.com"}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={isLoading || providersLoading}>
            {emailButtonLabel}
          </Button>
        </form>

        {isLocalDevEmail ? (
          <p className="text-xs text-muted-foreground">
            Audit login: use <span className="font-medium text-foreground">audit@jodo.local</span>.
            No password required.
          </p>
        ) : null}

        {feedback ? <p className="text-sm text-success">{feedback}</p> : null}
        {error ? <p className="text-sm text-error">{error}</p> : null}

        <p className="text-xs text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <Link
            href={mode === "signin" ? "/auth/signup" : "/auth/signin"}
            className="text-primary-600 hover:underline"
          >
            {mode === "signin" ? "Create account" : "Sign in"}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
