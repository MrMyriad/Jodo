"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

type TemplateRecord = {
  id?: string;
  name?: string;
  language?: string;
  category?: string;
  status?: string;
};

export default function WhatsAppConnectPage() {
  const [name, setName] = useState("Primary WhatsApp");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [templateName, setTemplateName] = useState("payment_receipt_v1");
  const [templateLanguage, setTemplateLanguage] = useState("en");
  const [templateCategory, setTemplateCategory] = useState("UTILITY");
  const [templateBody, setTemplateBody] = useState(
    "Hi {{1}}, your payment of Rs {{2}} is confirmed. Invoice link: {{3}}",
  );
  const [submittingTemplate, setSubmittingTemplate] = useState(false);

  const [testTo, setTestTo] = useState("91");
  const [testMessage, setTestMessage] = useState("Hello from JODO test");
  const [sendingTest, setSendingTest] = useState(false);

  const canSubmit = phoneNumberId.trim() && accessToken.trim();

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/integrations/whatsapp/templates");
      const data = (await res.json()) as {
        templates?: TemplateRecord[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not load templates.");
        return;
      }
      setTemplates(data.templates ?? []);
    } catch {
      setError("Network error while loading templates.");
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

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
          credentials: {
            phoneNumberId,
            accessToken,
            ...(businessAccountId.trim()
              ? { businessAccountId: businessAccountId.trim() }
              : {}),
          },
          testBeforeSave: true,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }
      setMessage("Connected to WhatsApp Business");
      await loadTemplates();
    } catch {
      setError("Network error saving WhatsApp.");
    } finally {
      setIsSaving(false);
    }
  };

  const submitTemplate = async () => {
    setSubmittingTemplate(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/integrations/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          language: templateLanguage,
          category: templateCategory,
          bodyText: templateBody,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to submit template.");
        return;
      }
      setMessage("Template submitted for approval.");
      await loadTemplates();
    } catch {
      setError("Network error while submitting template.");
    } finally {
      setSubmittingTemplate(false);
    }
  };

  const sendTest = async () => {
    setSendingTest(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/integrations/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo, message: testMessage }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to send test message.");
        return;
      }
      setMessage("Test WhatsApp message sent.");
    } catch {
      setError("Network error while sending test message.");
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 md:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/connections" className="hover:underline">
            Connections
          </Link>{" "}
          / WhatsApp Business
        </p>
        <h1 className="text-3xl font-semibold">Connect WhatsApp Business</h1>
        <p className="text-muted-foreground">
          Set credentials once, submit templates for approval, and test sends
          directly from this page.
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="waba">Business Account ID (optional)</Label>
            <Input
              id="waba"
              value={businessAccountId}
              onChange={(e) => setBusinessAccountId(e.target.value)}
              placeholder="Used for template approval API"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template Approval Flow</CardTitle>
          <CardDescription>
            Submit a WhatsApp template for approval and track current status.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tmpl-name">Template name</Label>
              <Input
                id="tmpl-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tmpl-lang">Language</Label>
              <Input
                id="tmpl-lang"
                value={templateLanguage}
                onChange={(e) => setTemplateLanguage(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tmpl-cat">Category</Label>
              <select
                id="tmpl-cat"
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
              >
                <option value="UTILITY">UTILITY</option>
                <option value="MARKETING">MARKETING</option>
                <option value="AUTHENTICATION">AUTHENTICATION</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tmpl-body">Template body</Label>
            <Textarea
              id="tmpl-body"
              rows={4}
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use placeholders like <code>{"{{1}}"}</code>,{" "}
              <code>{"{{2}}"}</code>, <code>{"{{3}}"}</code> for dynamic values.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={loadTemplates} disabled={loadingTemplates}>
              {loadingTemplates ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 size-4" /> Refresh Templates
                </>
              )}
            </Button>
            <Button onClick={submitTemplate} disabled={submittingTemplate}>
              {submittingTemplate ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit for Approval"
              )}
            </Button>
          </div>

          <div className="rounded-md border">
            <div className="grid grid-cols-4 border-b bg-muted/40 px-3 py-2 text-xs font-medium">
              <span>Name</span>
              <span>Language</span>
              <span>Category</span>
              <span>Status</span>
            </div>
            {templates.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                No templates found yet.
              </p>
            ) : (
              templates.map((template, index) => (
                <div key={`${template.id ?? template.name ?? "template"}-${index}`} className="grid grid-cols-4 border-b px-3 py-2 text-xs last:border-b-0">
                  <span>{template.name ?? "-"}</span>
                  <span>{template.language ?? "-"}</span>
                  <span>{template.category ?? "-"}</span>
                  <span>{template.status ?? "-"}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send Test Message</CardTitle>
          <CardDescription>
            Verify delivery before activating customer workflows.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="test-to">Phone (with country code)</Label>
            <Input id="test-to" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="test-msg">Message</Label>
            <Textarea
              id="test-msg"
              rows={3}
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={sendTest} disabled={sendingTest || !testTo.trim() || !testMessage.trim()}>
              {sendingTest ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Sending...
                </>
              ) : (
                "Send Test"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

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
    </main>
  );
}
