"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
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

export default function InstagramConnectPage() {
  const [name, setName] = useState("Primary Instagram");
  const [accessToken, setAccessToken] = useState("");
  const [igAccountId, setIgAccountId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = accessToken.trim() && igAccountId.trim();

  const save = async () => {
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INSTAGRAM",
          name,
          credentials: { accessToken, igAccountId },
          testBeforeSave: true,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }
      setMessage("✓ Connected to Instagram");
    } catch {
      setError("Network error saving Instagram.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-10 md:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/connections" className="hover:underline">
            Connections
          </Link>{" "}
          / Instagram
        </p>
        <h1 className="text-3xl font-semibold">Connect Instagram Business</h1>
        <p className="text-muted-foreground">
          Enable DM triggers and auto-replies via Meta Graph API.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Credentials</CardTitle>
          <CardDescription>
            Paste a Graph API access token + IG account ID.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Connection name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="token">Access token</Label>
            <Input
              id="token"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ig">Instagram account ID</Label>
            <Input
              id="ig"
              value={igAccountId}
              onChange={(e) => setIgAccountId(e.target.value)}
            />
          </div>

          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-medium">Webhook endpoint</p>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {typeof window === "undefined"
                ? ""
                : `${window.location.origin}/api/webhooks/instagram`}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Set `META_WEBHOOK_VERIFY_TOKEN` in env to complete verification.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={!canSubmit || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Saving...
                </>
              ) : (
                "Test & Save"
              )}
            </Button>
          </div>

          {message ? (
            <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success">
              <CheckCircle2 className="mr-2 inline-block size-4" />
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
