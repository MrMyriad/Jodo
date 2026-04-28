"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
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

export default function RazorpayConnectPage() {
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [name, setName] = useState("Primary Razorpay");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const webhookUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/webhooks/razorpay`;
  }, []);

  const canSubmit = keyId.trim() && keySecret.trim() && webhookSecret.trim();

  const testConnection = async () => {
    setIsTesting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "RAZORPAY",
          name,
          credentials: { keyId, keySecret, webhookSecret },
          testBeforeSave: true,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        verificationResult?: any;
      };
      if (!res.ok) {
        setError(data.error ?? "Test failed.");
        return;
      }

      if (data.verificationResult?.webhookCreated) {
        const id =
          data.verificationResult.webhookCreated.id ??
          data.verificationResult.webhookCreated.webhook_id ??
          null;
        setMessage(
          `✓ Connected to Razorpay — webhook created${id ? ` (id: ${id})` : ""}`,
        );
      } else {
        setMessage("✓ Connected to Razorpay");
      }
    } catch {
      setError("Network error testing Razorpay.");
    } finally {
      setIsTesting(false);
    }
  };

  const saveConnection = async () => {
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "RAZORPAY",
          name,
          credentials: { keyId, keySecret, webhookSecret },
          testBeforeSave: true,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        verificationResult?: any;
      };
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }

      if (data.verificationResult?.webhookCreated) {
        const id =
          data.verificationResult.webhookCreated.id ??
          data.verificationResult.webhookCreated.webhook_id ??
          null;
        setMessage(
          `✓ Razorpay saved — webhook created${id ? ` (id: ${id})` : ""}.`,
        );
      } else {
        setMessage(
          "✓ Razorpay saved. Add the webhook URL in your Razorpay dashboard.",
        );
      }
    } catch {
      setError("Network error saving Razorpay.");
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
          / Razorpay
        </p>
        <h1 className="text-3xl font-semibold">Connect Razorpay</h1>
        <p className="text-muted-foreground">
          Add API keys once. AutomateDesi will verify and save securely.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Credentials</CardTitle>
          <CardDescription>
            Use Razorpay test keys during development.
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
            <Label htmlFor="key-id">API Key</Label>
            <Input
              id="key-id"
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="rzp_test_..."
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="key-secret">API Secret</Label>
            <Input
              id="key-secret"
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              placeholder="..."
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="webhook-secret">Webhook Secret</Label>
            <Input
              id="webhook-secret"
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="whsec_..."
            />
          </div>

          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-medium">Webhook URL</p>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {webhookUrl || "—"}
            </p>
            <a
              href="https://dashboard.razorpay.com/app/webhooks"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              Open Razorpay Webhooks <ExternalLink className="size-4" />
            </a>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={!canSubmit || isTesting}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
            <Button onClick={saveConnection} disabled={!canSubmit || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save"
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
