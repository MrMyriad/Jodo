"use client";

import { useState } from "react";
import { Loader2, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function GstReminderGenerator({ periodId }: { periodId: string }) {
  const [isBusy, setIsBusy] = useState(false);
  const [draft, setDraft] = useState<{ channel: string; subject?: string | null; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(channel: "WHATSAPP" | "EMAIL") {
    setIsBusy(true);
    setError(null);
    setDraft(null);
    try {
      const response = await fetch("/api/gst/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId, channel }),
      });
      const data = (await response.json()) as { error?: string; reminder?: { channel: string; subject?: string | null; body: string } };
      if (!response.ok || !data.reminder) {
        setError(data.error ?? "Could not generate reminder draft.");
        return;
      }
      setDraft(data.reminder);
    } catch {
      setError("Network error while generating reminder.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI reminder draft</CardTitle>
        <CardDescription>
          Generates WhatsApp/email follow-up copy from the missing document checklist. Sending is not automatic in this MVP.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? <div className="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">{error}</div> : null}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => generate("WHATSAPP")} disabled={isBusy}>
            {isBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <MessageCircle className="mr-2 size-4" />}
            WhatsApp draft
          </Button>
          <Button variant="outline" onClick={() => generate("EMAIL")} disabled={isBusy}>
            <Mail className="mr-2 size-4" />
            Email draft
          </Button>
        </div>
        {draft ? (
          <div className="flex flex-col gap-2">
            {draft.subject ? <p className="text-sm font-medium">Subject: {draft.subject}</p> : null}
            <Textarea value={draft.body} readOnly className="min-h-[180px]" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
