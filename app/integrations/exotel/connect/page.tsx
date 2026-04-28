"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

export default function ExotelConnectPage() {
  const [name, setName] = useState("Primary Exotel");
  const [apiKey, setApiKey] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const webhookUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const base = `${window.location.origin}/api/webhooks/exotel`;
    return webhookSecret.trim()
      ? `${base}?secret=${encodeURIComponent(webhookSecret.trim())}`
      : base;
  }, [webhookSecret]);

  const canSubmit = apiKey.trim() && apiToken.trim() && webhookSecret.trim();

  const save = async () => {
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EXOTEL",
          name,
          credentials: { apiKey, apiToken, webhookSecret },
          testBeforeSave: true,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }
      setMessage(
        "✓ Connected to Exotel. Add the webhook URL in Exotel missed call settings.",
      );
    } catch {
      setError("Network error saving Exotel.");
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
          / Exotel
        </p>
        <h1 className="text-3xl font-semibold">
          Connect Exotel (Missed Calls)
        </h1>
        <p className="text-muted-foreground">
          Trigger WhatsApp auto-replies instantly when you miss a call.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Credentials</CardTitle>
          <CardDescription>
            Save Exotel API key/token + a webhook secret.
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
            <Label htmlFor="apiKey">API key</Label>
            <Input
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="apiToken">API token</Label>
            <Input
              id="apiToken"
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="secret">Webhook secret</Label>
            <Input
              id="secret"
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
          </div>

          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-medium">Webhook URL</p>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {webhookUrl || "—"}
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
