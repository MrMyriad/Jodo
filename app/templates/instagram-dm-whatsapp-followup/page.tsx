"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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

type Step = 1 | 2 | 3 | 4 | 5;

export default function InstagramDmWhatsAppFollowupTemplatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState(
    "Instagram DM → WhatsApp Follow-up → Save Lead",
  );
  const [autoReply, setAutoReply] = useState(
    "Thanks for messaging! We’ll WhatsApp you the catalog in 1 minute.",
  );
  const [whatsAppMessage, setWhatsAppMessage] = useState(
    "Hi! Here’s our catalog: {{catalogUrl}}",
  );

  const canContinue = useMemo(() => {
    if (step === 4) return whatsAppMessage.trim().length >= 2;
    return true;
  }, [step, whatsAppMessage]);

  const activate = async () => {
    setIsActivating(true);
    setError(null);

    try {
      const res = await fetch("/api/templates/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: "instagram_dm_whatsapp_followup",
          name: workflowName,
          // we store WhatsApp message template in the template activation (engine step config uses it)
          messageTemplate: whatsAppMessage,
          instagramReplyTemplate: autoReply,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        workflow?: { id: string };
      };
      if (!res.ok || !data.workflow?.id) {
        setError(data.error ?? "Failed to activate template.");
        return;
      }

      router.push("/workflows");
    } catch {
      setError("Network error activating template.");
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 md:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/templates" className="hover:underline">
            Templates
          </Link>{" "}
          / Instagram DM → WhatsApp Follow-up
        </p>
        <h1 className="text-3xl font-semibold">
          Instagram DM → WhatsApp Follow-up
        </h1>
        <p className="text-muted-foreground">
          When someone DMs you on Instagram, send an auto-reply, then WhatsApp
          your catalog, and save the lead.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Step {step} of 5</CardTitle>
          <CardDescription>
            {step === 1 && "Connect Instagram"}
            {step === 2 && "Connect WhatsApp Business"}
            {step === 3 && "Connect Google Sheets"}
            {step === 4 && "Customize messages"}
            {step === 5 && "Activate"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {step === 1 ? (
            <div className="rounded-lg border p-4">
              <p className="font-medium">Instagram Business</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We’ll listen to DMs instantly via webhooks.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/connections">Connect Instagram</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/integrations/instagram/connect">
                    Guided setup
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="rounded-lg border p-4">
              <p className="font-medium">WhatsApp Business</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Follow up instantly on WhatsApp after DM.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/connections">Connect WhatsApp</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/integrations/whatsapp/connect">
                    Guided setup
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="rounded-lg border p-4">
              <p className="font-medium">Google Sheets</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We’ll append a row as a lead (name/phone/source).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/connections">Connect Google Sheets</Link>
                </Button>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="workflow-name">Workflow name</Label>
                <Input
                  id="workflow-name"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ig-reply">Reply on Instagram</Label>
                <Textarea
                  id="ig-reply"
                  value={autoReply}
                  onChange={(e) => setAutoReply(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="wa-msg">Then send WhatsApp</Label>
                <Textarea
                  id="wa-msg"
                  value={whatsAppMessage}
                  onChange={(e) => setWhatsAppMessage(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Ask them to share their WhatsApp number in the DM. If
                  they send a 10-digit number, we’ll auto-detect it and send
                  WhatsApp instantly.
                </p>
              </div>

              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs font-medium">Preview</p>
                <p className="mt-2 text-sm">{autoReply}</p>
                <p className="mt-2 text-sm">
                  {whatsAppMessage.replaceAll(
                    "{{catalogUrl}}",
                    "https://example.com/catalog",
                  )}
                </p>
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border p-4">
                <p className="font-medium">Ready to activate</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Once live, your replies and follow-ups will run instantly.
                </p>
              </div>
              <Button onClick={activate} disabled={isActivating}>
                {isActivating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />{" "}
                    Activating...
                  </>
                ) : (
                  "Activate automation"
                )}
              </Button>
            </div>
          ) : null}

          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep((s) => (s === 1 ? 1 : ((s - 1) as Step)))}
            >
              Back
            </Button>
            <Button
              onClick={() => setStep((s) => (s === 5 ? 5 : ((s + 1) as Step)))}
              disabled={!canContinue}
            >
              Continue
            </Button>
          </div>

          {error ? (
            <Card className="border-error/30 bg-error/5">
              <CardContent className="p-4 text-sm text-error">
                {error}
              </CardContent>
            </Card>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
