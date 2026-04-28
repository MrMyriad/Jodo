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

type Step = 1 | 2 | 3 | 4;

export default function MissedCallWhatsAppTemplatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState(
    "Missed Call → WhatsApp Auto Reply",
  );
  const [messageTemplate, setMessageTemplate] = useState(
    "Hi! Sorry we missed your call. Here’s our menu/catalog: {{menuUrl}}",
  );

  const canContinue = useMemo(() => {
    if (step === 3) return messageTemplate.trim().length >= 2;
    return true;
  }, [messageTemplate, step]);

  const activate = async () => {
    setIsActivating(true);
    setError(null);
    try {
      const res = await fetch("/api/templates/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: "missed_call_whatsapp",
          name: workflowName,
          messageTemplate,
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
          / Missed Call → WhatsApp
        </p>
        <h1 className="text-3xl font-semibold">
          Missed Call → Auto WhatsApp Reply
        </h1>
        <p className="text-muted-foreground">
          When you miss a call, instantly WhatsApp them your menu/catalog link.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Step {step} of 4</CardTitle>
          <CardDescription>
            {step === 1 && "Connect Exotel"}
            {step === 2 && "Connect WhatsApp Business"}
            {step === 3 && "Customize message"}
            {step === 4 && "Activate"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {step === 1 ? (
            <div className="rounded-lg border p-4">
              <p className="font-medium">Exotel (Missed calls)</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Exotel will call our webhook instantly when you miss a call.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/connections">Connect Exotel</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/integrations/exotel/connect">Guided setup</Link>
                </Button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="rounded-lg border p-4">
              <p className="font-medium">WhatsApp Business</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We’ll send a WhatsApp message immediately after the missed call.
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
                <Label htmlFor="wa-template">WhatsApp message</Label>
                <Textarea
                  id="wa-template"
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border p-4">
                <p className="font-medium">Ready to activate</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Once live, every missed call webhook triggers WhatsApp
                  instantly.
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
              onClick={() => setStep((s) => (s === 4 ? 4 : ((s + 1) as Step)))}
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
