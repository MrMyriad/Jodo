"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ZohoConnectPage() {
  const [name, setName] = useState("Zoho Books");
  const [accessToken, setAccessToken] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = accessToken.trim() && organizationId.trim();

  const save = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ZOHO_BOOKS",
          name,
          credentials: { accessToken, organizationId },
          testBeforeSave: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Failed to save Zoho Books connection.");
        return;
      }

      setMessage("✓ Zoho Books connected");
    } catch {
      setMessage("Network error while saving Zoho Books.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-2xl p-6">
      <header className="mb-4">
        <p className="text-sm text-muted-foreground">
          <Link href="/connections" className="hover:underline">
            Connections
          </Link>{" "}
          / Zoho Books
        </p>
        <h1 className="text-3xl font-semibold">Connect Zoho Books</h1>
        <p className="text-muted-foreground">
          Provide an access token and organization id to create invoices.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Credentials</CardTitle>
          <CardDescription>Paste a Zoho Books access token.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label>Connection name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label>Access token</Label>
            <Input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
          </div>

          <div>
            <Label>Organization ID</Label>
            <Input value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} />
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={isSaving || !canSubmit}>
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
        </CardContent>
      </Card>
    </main>
  );
}
