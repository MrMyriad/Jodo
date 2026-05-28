"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  serviceSetupOptions,
  serviceSetupPainPoints,
  serviceSetupToolOptions,
} from "@/lib/service-setup";
import { cn } from "@/lib/utils";

type DoneForYouSetupFormProps = {
  initialType?: string;
};

type SetupType = (typeof serviceSetupOptions)[number]["value"];

type SubmitState =
  | { status: "idle"; message?: undefined }
  | { status: "loading"; message?: undefined }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function normalizeInitialType(value?: string) {
  const normalized = value?.toUpperCase().replace(/-/g, "_");
  return (
    serviceSetupOptions.find((option) => option.value === normalized)?.value ??
    "RAZORPAY_RECEIPTS"
  );
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function DoneForYouSetupForm({
  initialType,
}: DoneForYouSetupFormProps) {
  const router = useRouter();
  const [type, setType] = useState(normalizeInitialType(initialType));
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [monthlyVolume, setMonthlyVolume] = useState("");
  const [currentTools, setCurrentTools] = useState<string[]>([]);
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [preferredChannel, setPreferredChannel] = useState("WHATSAPP");
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  const selectedOption = useMemo(
    () =>
      serviceSetupOptions.find((option) => option.value === type) ??
      serviceSetupOptions[0],
    [type],
  );

  async function submitSetupRequest() {
    setState({ status: "loading" });

    try {
      const res = await fetch("/api/service-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          businessName,
          contactName,
          email,
          phone,
          monthlyVolume,
          currentTools,
          painPoints,
          preferredChannel,
          notes,
          source: "done-for-you-page",
        }),
      });

      if (res.status === 401) {
        router.push(
          `/auth/signin?callbackUrl=${encodeURIComponent("/done-for-you")}`,
        );
        return;
      }

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setState({
          status: "error",
          message: data.error ?? "Could not create setup request.",
        });
        return;
      }

      setState({
        status: "success",
        message:
          "Request received. JODO now has the context needed to turn this into a setup checklist and workflow plan.",
      });
    } catch {
      setState({
        status: "error",
        message: "Network error while creating setup request.",
      });
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-[#1a1f2e] p-5 shadow-2xl shadow-black/20 md:p-8">
      <div className="mb-6 rounded-2xl border border-[#6366f1]/20 bg-[#6366f1]/10 p-4">
        <p className="text-sm font-semibold text-[#c7d2fe]">
          Selected service
        </p>
        <p className="mt-2 text-xl font-semibold text-white">
          {selectedOption.label}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {selectedOption.outcome}
        </p>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="setup-type">What should JODO set up?</Label>
          <select
            id="setup-type"
            value={type}
            onChange={(event) => setType(event.target.value as SetupType)}
            className="min-h-11 rounded-md border border-white/10 bg-[#0f1419] px-3 text-sm text-white outline-none ring-offset-background focus:ring-2 focus:ring-[#6366f1]"
          >
            {serviceSetupOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="business-name">Business name</Label>
            <Input
              id="business-name"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="e.g. Jaipur Skincare Co."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact-name">Your name</Label>
            <Input
              id="contact-name"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              placeholder="Who should we coordinate with?"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="setup-email">Email</Label>
            <Input
              id="setup-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="setup-phone">WhatsApp / phone</Label>
            <Input
              id="setup-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="monthly-volume">Monthly volume</Label>
            <Input
              id="monthly-volume"
              value={monthlyVolume}
              onChange={(event) => setMonthlyVolume(event.target.value)}
              placeholder="e.g. 800 orders or 40 GST clients"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="preferred-channel">Preferred channel</Label>
            <select
              id="preferred-channel"
              value={preferredChannel}
              onChange={(event) => setPreferredChannel(event.target.value)}
              className="min-h-11 rounded-md border border-white/10 bg-[#0f1419] px-3 text-sm text-white outline-none ring-offset-background focus:ring-2 focus:ring-[#6366f1]"
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
              <option value="PHONE">Phone</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3">
          <Label>Current tools</Label>
          <div className="flex flex-wrap gap-2">
            {serviceSetupToolOptions.map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => setCurrentTools((values) => toggleValue(values, tool))}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  currentTools.includes(tool)
                    ? "border-[#6366f1]/50 bg-[#6366f1]/15 text-[#c7d2fe]"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white",
                )}
              >
                {tool}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <Label>What is painful right now?</Label>
          <div className="grid gap-2 md:grid-cols-2">
            {serviceSetupPainPoints.map((painPoint) => (
              <button
                key={painPoint}
                type="button"
                onClick={() =>
                  setPainPoints((values) => toggleValue(values, painPoint))
                }
                className={cn(
                  "rounded-xl border px-3 py-2 text-left text-xs font-medium leading-5 transition",
                  painPoints.includes(painPoint)
                    ? "border-[#6366f1]/50 bg-[#6366f1]/15 text-[#c7d2fe]"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white",
                )}
              >
                {painPoint}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="setup-notes">Anything JODO should know?</Label>
          <Textarea
            id="setup-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            placeholder="Example: we use Razorpay payment links and want receipts on WhatsApp with invoice PDF."
          />
        </div>

        {state.status === "success" ? (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            <p>{state.message}</p>
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
            {state.message}
          </div>
        ) : null}

        <Button
          type="button"
          onClick={() => void submitSetupRequest()}
          disabled={state.status === "loading" || businessName.trim().length < 2}
          className="min-h-12"
        >
          {state.status === "loading" ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Creating request...
            </>
          ) : (
            "Request done-for-you setup"
          )}
        </Button>
      </div>
    </div>
  );
}
