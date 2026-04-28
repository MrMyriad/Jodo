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

export default function WhatsAppConnectPage() {
  const [name, setName] = useState("Primary WhatsApp");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = phoneNumberId.trim() && accessToken.trim();

  const save = async () => {
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "WHATSAPP_BUSINESS",
          name,
          credentials: { phoneNumberId, accessToken },
          testBeforeSave: true,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }
      setMessage("✓ Connected to WhatsApp Business");
    } catch {
      setError("Network error saving WhatsApp.");
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
          / WhatsApp Business
        </p>
        <h1 className="text-3xl font-semibold">Connect WhatsApp Business</h1>
        <p className="text-muted-foreground">
          We’ll send WhatsApp messages instantly after payment. (Official WABA
          credentials)
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Credentials</CardTitle>
          <CardDescription>
            Paste Phone Number ID + Access Token from Meta Business.
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
            <Label htmlFor="phone-id">Phone Number ID</Label>
            <Input
              id="phone-id"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="token">Access Token</Label>
            <Input
              id="token"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
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
