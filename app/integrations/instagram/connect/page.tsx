"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, RefreshCw } from "lucide-react";
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

type InstagramMessage = {
  conversationId: string | null;
  senderId: string | null;
  text: string;
  createdTime: string | null;
};

export default function InstagramConnectPage() {
  const [name, setName] = useState("Primary Instagram");
  const [accessToken, setAccessToken] = useState("");
  const [igAccountId, setIgAccountId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<InstagramMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [replyText, setReplyText] = useState(
    "Thanks for your DM. We have sent details on WhatsApp.",
  );
  const [sendingReply, setSendingReply] = useState(false);

  const canSubmit = accessToken.trim() && igAccountId.trim();

  const loadMessages = useCallback(async () => {
    setLoadingMessages(true);
    try {
      const res = await fetch("/api/integrations/instagram/messages?limit=5");
      const data = (await res.json()) as {
        messages?: InstagramMessage[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not load recent DMs.");
        return;
      }
      setMessages(data.messages ?? []);
      setRecipientId((previous) => previous || data.messages?.[0]?.senderId || "");
    } catch {
      setError("Network error while loading messages.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      const connectedName = params.get("name");
      setMessage(
        `Connected to Instagram${connectedName ? `: ${connectedName}` : ""}`,
      );
      void loadMessages();
    }
    const qError = params.get("error");
    if (qError) {
      setError(`OAuth connection failed: ${qError}`);
    }
  }, [loadMessages]);

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
      setMessage("Connected to Instagram");
      await loadMessages();
    } catch {
      setError("Network error saving Instagram.");
    } finally {
      setIsSaving(false);
    }
  };

  const sendReply = async () => {
    setSendingReply(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/integrations/instagram/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId,
          message: replyText,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to send reply.");
        return;
      }
      setMessage("Instagram reply sent.");
    } catch {
      setError("Network error while sending reply.");
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 md:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/connections" className="hover:underline">
            Connections
          </Link>{" "}
          / Instagram
        </p>
        <h1 className="text-3xl font-semibold">Connect Instagram Business</h1>
        <p className="text-muted-foreground">
          Enable DM triggers and verify send/reply flow before activating automation.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Recommended: One-click OAuth</CardTitle>
          <CardDescription>
            Connect with Meta and let JODO fetch your Instagram Business account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <a href="/api/integrations/instagram/oauth/start">
              Connect Instagram Business Account
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">
            Required permissions: pages list/read and Instagram messaging access.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual credentials (fallback)</CardTitle>
          <CardDescription>
            Use this only if you already have a valid Graph API access token.
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>DM Confirmation Path Test</CardTitle>
          <CardDescription>
            Load recent DMs and send a confirmation reply to validate messaging permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={loadMessages} disabled={loadingMessages}>
              {loadingMessages ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 size-4" /> Refresh DMs
                </>
              )}
            </Button>
          </div>

          <div className="rounded-md border">
            {messages.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No recent DMs found.</p>
            ) : (
              messages.map((dm, idx) => (
                <button
                  key={`${dm.conversationId ?? "conv"}-${idx}`}
                  type="button"
                  className="flex w-full items-start gap-2 border-b px-3 py-3 text-left text-sm last:border-b-0 hover:bg-muted/40"
                  onClick={() => setRecipientId(dm.senderId ?? "")}
                >
                  <MessageCircle className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      Sender: {dm.senderId ?? "-"}
                    </span>
                    <span>{dm.text || "(empty message)"}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="recipient">Recipient ID</Label>
              <Input
                id="recipient"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reply">Reply text</Label>
            <Textarea
              id="reply"
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={sendReply} disabled={sendingReply || !recipientId.trim()}>
              {sendingReply ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Sending...
                </>
              ) : (
                "Send Reply"
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
