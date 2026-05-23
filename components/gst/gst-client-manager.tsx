"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GstClientManager() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    gstin: "",
    contactName: "",
    email: "",
    phone: "",
    state: "",
  });

  async function createClient() {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/gst/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Could not create GST client.");
      return;
    }
    setMessage("GST client created.");
    setForm({ businessName: "", gstin: "", contactName: "", email: "", phone: "", state: "" });
    startTransition(() => router.refresh());
  }

  async function createDemo() {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/gst/demo", { method: "POST" });
    const data = (await response.json()) as { error?: string; period?: { id: string } };
    if (!response.ok || !data.period) {
      setError(data.error ?? "Could not create demo workspace.");
      return;
    }
    setMessage("Demo GST workspace created. Demo data is clearly marked and should not be treated as production data.");
    router.push(`/gst-desk/periods/${data.period.id}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Building2 className="size-5 text-primary" />
          Add GST client
        </CardTitle>
        <CardDescription>
          Create a client workspace for monthly GST preparation. No GSTN filing is performed in this MVP.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {message ? <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">{message}</div> : null}
        {error ? <div className="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">{error}</div> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input id="businessName" value={form.businessName} onChange={(event) => setForm((prev) => ({ ...prev, businessName: event.target.value }))} placeholder="e.g. Sharma Textiles" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" value={form.gstin} onChange={(event) => setForm((prev) => ({ ...prev, gstin: event.target.value.toUpperCase() }))} placeholder="27ABCDE1234F1Z5" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="state">State</Label>
            <Input id="state" value={form.state} onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))} placeholder="Maharashtra" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contactName">Contact name</Label>
            <Input id="contactName" value={form.contactName} onChange={(event) => setForm((prev) => ({ ...prev, contactName: event.target.value }))} placeholder="Owner / accountant" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="+91..." />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="client@example.com" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={createClient} disabled={isPending || !form.businessName.trim()}>
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Create client
          </Button>
          <Button variant="outline" onClick={createDemo}>
            <Sparkles className="mr-2 size-4" />
            Create demo workspace
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
