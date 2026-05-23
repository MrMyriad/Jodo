"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export default function ZohoConnectPage() {
  const [name, setName] = useState("Zoho Books");
  const [accessToken, setAccessToken] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creatingTestInvoice, setCreatingTestInvoice] = useState(false);
  const [testInvoiceInfo, setTestInvoiceInfo] = useState<{
    id: string;
    number: string;
    url: string | null;
    pdfUrl: string | null;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      const connectedName = params.get("name");
      setMessage(
        `Connected to Zoho Books${connectedName ? `: ${connectedName}` : ""}`,
      );
    }
    const qError = params.get("error");
    if (qError) {
      setError(`OAuth connection failed: ${qError}`);
    }
  }, []);

  const canSubmit = accessToken.trim() && organizationId.trim();

  const save = async () => {
    setIsSaving(true);
    setMessage(null);
    setError(null);
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

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to save Zoho Books connection.");
        return;
      }

      setMessage("Connected to Zoho Books");
    } catch {
      setError("Network error while saving Zoho Books.");
    } finally {
      setIsSaving(false);
    }
  };

  const createTestInvoice = async () => {
    setCreatingTestInvoice(true);
    setMessage(null);
    setError(null);
    setTestInvoiceInfo(null);
    try {
      const res = await fetch("/api/integrations/zoho/invoices/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: "JODO Test Customer",
          itemName: "Automation Test Item",
          amount: 99,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        invoice?: {
          id: string;
          number: string;
          url: string | null;
          pdfUrl: string | null;
        };
      };

      if (!res.ok || !data.invoice) {
        setError(data.error ?? "Failed to create test invoice.");
        return;
      }

      setTestInvoiceInfo(data.invoice);
      setMessage("Test invoice created successfully.");
    } catch {
      setError("Network error while creating test invoice.");
    } finally {
      setCreatingTestInvoice(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl p-6">
      <header className="mb-4">
        <p className="text-sm text-muted-foreground">
          <Link href="/connections" className="hover:underline">
            Connections
          </Link>{" "}
          / Zoho Books
        </p>
        <h1 className="text-3xl font-semibold">Connect Zoho Books</h1>
        <p className="text-muted-foreground">
          Connect your Zoho organization and validate invoice + PDF flow.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Recommended: OAuth connect</CardTitle>
          <CardDescription>
            Secure one-click connect and organization selection with Zoho.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <a href="/api/integrations/zoho/oauth/start">Connect with Zoho</a>
          </Button>
          <p className="text-xs text-muted-foreground">
            Scope includes invoice and organization access for automated billing flows.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Manual credentials (fallback)</CardTitle>
          <CardDescription>
            Use this only when you already have an active Zoho access token.
          </CardDescription>
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
            <Input
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={createTestInvoice} disabled={creatingTestInvoice}>
              {creatingTestInvoice ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Creating invoice...
                </>
              ) : (
                "Create Test Invoice"
              )}
            </Button>
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

          {testInvoiceInfo ? (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p>
                Invoice: {testInvoiceInfo.number} ({testInvoiceInfo.id})
              </p>
              {testInvoiceInfo.url ? (
                <p className="break-all text-xs text-muted-foreground">
                  URL: {testInvoiceInfo.url}
                </p>
              ) : null}
              {testInvoiceInfo.pdfUrl ? (
                <p className="break-all text-xs text-muted-foreground">
                  PDF: {testInvoiceInfo.pdfUrl}
                </p>
              ) : null}
            </div>
          ) : null}

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
