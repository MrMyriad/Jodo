"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type GstClientOption = { id: string; businessName: string };

export function GstPeriodCreator({ clients }: { clients: GstClientOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: clients[0]?.id ?? "",
    month: new Date().getMonth() + 1,
    financialYear: "2026-27",
  });

  async function createPeriod() {
    setError(null);
    const response = await fetch("/api/gst/periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await response.json()) as { error?: string; period?: { id: string } };
    if (!response.ok || !data.period) {
      setError(data.error ?? "Could not open GST period.");
      return;
    }
    const periodId = data.period.id;
    startTransition(() => router.push(`/gst-desk/periods/${periodId}`));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CalendarPlus className="size-5 text-primary" />
          Open GST period
        </CardTitle>
        <CardDescription>Create a monthly workspace such as April 2026.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? <div className="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">{error}</div> : null}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2 md:col-span-3">
            <Label htmlFor="gstClient">Client</Label>
            <select id="gstClient" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.clientId} onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.businessName}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="month">Month</Label>
            <Input id="month" type="number" min={1} max={12} value={form.month} onChange={(event) => setForm((prev) => ({ ...prev, month: Number(event.target.value) }))} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="financialYear">Financial year</Label>
            <Input id="financialYear" value={form.financialYear} onChange={(event) => setForm((prev) => ({ ...prev, financialYear: event.target.value }))} />
          </div>
        </div>
        <Button onClick={createPeriod} disabled={isPending || !form.clientId}>
          {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Open workspace
        </Button>
      </CardContent>
    </Card>
  );
}
