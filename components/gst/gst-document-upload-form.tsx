"use client";

import { useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export type GstPeriodOption = {
  id: string;
  label: string;
  clientName: string;
};

const documentTypes = [
  ["SALES_INVOICE", "Sales invoices"],
  ["PURCHASE_BILL", "Purchase bills"],
  ["CREDIT_NOTE", "Credit notes"],
  ["DEBIT_NOTE", "Debit notes"],
  ["BANK_STATEMENT", "Bank statements"],
  ["OTHER", "Other"],
];

export function GstDocumentUploadForm({
  periods,
  initialPeriodId,
  storageBlocked,
}: {
  periods: GstPeriodOption[];
  initialPeriodId?: string;
  storageBlocked?: string[];
}) {
  const [periodId, setPeriodId] = useState(initialPeriodId || periods[0]?.id || "");
  const [documentType, setDocumentType] = useState("SALES_INVOICE");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file || !periodId) return;
    setIsUploading(true);
    setMessage(null);
    setError(null);
    const form = new FormData();
    form.set("periodId", periodId);
    form.set("documentType", documentType);
    form.set("file", file);

    try {
      const response = await fetch("/api/gst/documents", { method: "POST", body: form });
      const data = (await response.json()) as {
        error?: string;
        queued?: boolean;
        queue?: { detail?: string };
        status?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      if (data.queued === false) {
        setError(
          data.queue?.detail
            ? `${data.error ?? "Document uploaded, but extraction was not queued."} ${data.queue.detail}`
            : data.error ?? "Document uploaded, but extraction was not queued.",
        );
        setFile(null);
        return;
      }
      setMessage("Document uploaded and extraction queued. Check the review screen after the worker runs.");
      setFile(null);
    } catch {
      setError("Network error while uploading document.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <UploadCloud className="size-5 text-primary" />
          Upload GST documents
        </CardTitle>
        <CardDescription>
          Upload invoices, bills, notes, and statements. Files go to Supabase Storage when configured.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {storageBlocked?.length ? (
          <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            Storage is blocked. Missing: {storageBlocked.join(", ")}. Add these env keys before uploading real files.
          </div>
        ) : null}
        {message ? <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">{message}</div> : null}
        {error ? <div className="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">{error}</div> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="periodId">GST period</Label>
            <select id="periodId" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={periodId} onChange={(event) => setPeriodId(event.target.value)}>
              {periods.map((period) => <option key={period.id} value={period.id}>{period.clientName} - {period.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="documentType">Document type</Label>
            <select id="documentType" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
              {documentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="file">File</Label>
            <input id="file" type="file" className="rounded-md border border-input bg-background px-3 py-2 text-sm" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </div>
        </div>
        <Button onClick={upload} disabled={isUploading || !file || !periodId || Boolean(storageBlocked?.length)}>
          {isUploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Upload and queue extraction
        </Button>
      </CardContent>
    </Card>
  );
}
