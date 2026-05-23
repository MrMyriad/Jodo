"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { Confetti } from "@/components/confetti";

type Step = 1 | 2 | 3 | 4 | 5;
type ConnectionSummary = {
  id: string;
  type: string;
  isActive: boolean;
};

export default function RazorpayWhatsAppInvoiceTemplatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [messageTemplate, setMessageTemplate] = useState(
    "Hi {{customer.name}}, your payment of Rs {{amount}} is received. Invoice: {{step0.invoiceUrl}}",
  );
  const [workflowName, setWorkflowName] = useState(
    "Razorpay Payment -> Zoho Invoice -> WhatsApp Receipt",
  );

  const [connections, setConnections] = useState<ConnectionSummary[]>([]);
  const [fromOnboarding, setFromOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setFromOnboarding(Boolean(params.get("fromOnboarding")));
  }, []);

  useEffect(() => {
    fetch("/api/connections")
      .then((res) => res.json())
      .then((data: { connections?: ConnectionSummary[] }) =>
        setConnections(data.connections ?? []),
      )
      .catch(() => setConnections([]));
  }, []);

  useEffect(() => {
    if (!fromOnboarding) return;
    const required = ["RAZORPAY", "ZOHO_BOOKS", "WHATSAPP_BUSINESS"];
    const ok = required.every((type) =>
      connections.some((connection) => connection.type === type && connection.isActive),
    );
    if (ok) {
      setTimeout(() => {
        void activate();
      }, 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections, fromOnboarding]);

  const canContinue = useMemo(() => {
    if (step === 4) return messageTemplate.trim().length >= 2;
    return true;
  }, [messageTemplate, step]);

  const activate = async () => {
    setIsActivating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/templates/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: "razorpay_whatsapp_invoice",
          name: workflowName,
          messageTemplate,
        }),
      });

      if (res.status === 401) {
        const current = typeof window !== "undefined" ? window.location.href : "/";
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(current)}`);
        return;
      }

      const data = (await res.json()) as {
        error?: string;
        workflow?: { id: string };
      };
      if (!res.ok || !data.workflow?.id) {
        setError(data.error ?? "Failed to activate template.");
        return;
      }

      setSuccess(
        "Activated. Every Razorpay payment will create a Zoho invoice and send WhatsApp receipt + PDF.",
      );
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
          / Razorpay -&gt; WhatsApp + GST Invoice
        </p>
        <h1 className="text-3xl font-semibold">
          Razorpay Payment -&gt; WhatsApp Receipt + GST Invoice
        </h1>
        <p className="text-muted-foreground">
          Connect 3 accounts, customize the message, and go live in under 2 minutes.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Step {step} of 5</CardTitle>
          <CardDescription>
            {step === 1 && "Connect Razorpay"}
            {step === 2 && "Connect WhatsApp Business"}
            {step === 3 && "Connect Zoho Books"}
            {step === 4 && "Customize message template"}
            {step === 5 && "Activate"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {step === 1 ? (
            <div className="rounded-lg border p-4">
              <p className="font-medium">Razorpay</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We will listen to instant Razorpay webhooks (no polling delays).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/connections">Connect Razorpay</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/integrations/razorpay/connect">Guided setup</Link>
                </Button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="rounded-lg border p-4">
              <p className="font-medium">WhatsApp Business</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Send invoice receipt instantly after payment.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/connections">Connect WhatsApp</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/integrations/whatsapp/connect">Guided setup</Link>
                </Button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="rounded-lg border p-4">
              <p className="font-medium">Zoho Books</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We will create a GST invoice and attach PDF on WhatsApp.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/connections">Connect Zoho Books</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/integrations/zoho/connect">Guided setup</Link>
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
                <Label htmlFor="wa-template">WhatsApp message</Label>
                <Textarea
                  id="wa-template"
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Variables: <code>{"{{customer.name}}"}</code>,{" "}
                  <code>{"{{amount}}"}</code>, <code>{"{{step0.invoiceUrl}}"}</code>
                </p>
              </div>
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs font-medium">Preview</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {messageTemplate
                    .replaceAll("{{customer.name}}", "Rahul")
                    .replaceAll("{{amount}}", "1499")
                    .replaceAll("{{step0.invoiceUrl}}", "https://books.zoho.in/invoice/INV-123")}
                </p>
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border p-4">
                <p className="font-medium">Ready to go live</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every payment capture will run invoice + WhatsApp actions instantly.
                </p>
              </div>
              <Button onClick={() => void activate()} disabled={isActivating}>
                {isActivating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Activating...
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

          {success ? (
            <Card className="border-success/30 bg-success/5">
              <CardContent className="flex items-center gap-2 p-4 text-sm text-success">
                <CheckCircle2 className="size-4" />
                {success}
              </CardContent>
            </Card>
          ) : null}

          {error ? (
            <Card className="border-error/30 bg-error/5">
              <CardContent className="p-4 text-sm text-error">{error}</CardContent>
            </Card>
          ) : null}
        </CardContent>
      </Card>
      {success ? <Confetti run={Boolean(success)} /> : null}
    </main>
  );
}
