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
  const hasDevCredentials = Boolean(providers?.["dev-email"] || providers?.["setup-required"]);

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

        // credentials signIn does not automatically redirect when using redirect:false
        router.push(callbackUrl);
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
    setError(null);
    setFeedback(null);

    if (!hasGoogle) {
      setError(
        "Google sign-in is not configured yet. Add Google OAuth env values first.",
      );
      return;
    }

    await signIn("google", { callbackUrl });
  };

  const title =
    mode === "signin"
      ? "Sign in to AutomateDesi"
      : "Create your AutomateDesi account";
  const description =
    mode === "signin"
      ? "Use Google or a magic link to access your dashboard."
      : "Start free and automate WhatsApp, Instagram, and payment workflows.";

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button type="button" variant="outline" onClick={signInWithGoogle}>
          Continue with Google
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
              placeholder="you@business.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Magic Link"}
          </Button>
        </form>

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
