"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type GstReviewRow = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  supplierGstin: string;
  customerName: string;
  customerGstin: string;
  placeOfSupply: string;
  taxableValue: string;
  cgst: string;
  sgst: string;
  igst: string;
  totalAmount: string;
  documentType: string;
  sourceFileId: string;
  confidenceScore: string;
  reviewStatus: string;
  isDemo: boolean;
};

function confidenceVariant(score: string): "default" | "secondary" | "destructive" {
  const numeric = Number(score);
  if (Number.isNaN(numeric)) return "secondary";
  if (numeric < 0.6) return "destructive";
  if (numeric < 0.85) return "secondary";
  return "default";
}

export function GstReviewTable({ rows }: { rows: GstReviewRow[] }) {
  const [items, setItems] = useState(rows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  function patchRow(id: string, patch: Partial<GstReviewRow>) {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function save(row: GstReviewRow, reviewStatus = "REVIEWED") {
    setBusyId(row.id);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/gst/extractions/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...row, reviewStatus, note: noteById[row.id] }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not save review row.");
        return;
      }
      patchRow(row.id, { reviewStatus });
      setMessage(reviewStatus === "APPROVED" ? "Invoice row approved." : "Invoice row saved for CA review.");
    } catch {
      setError("Network error while saving review row.");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review extracted invoices</CardTitle>
          <CardDescription>No extracted rows yet. Upload documents or create the demo workspace first.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review extracted invoices</CardTitle>
        <CardDescription>Low-confidence rows stay blocked until a human corrects or approves them.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {message ? <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">{message}</div> : null}
        {error ? <div className="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">{error}</div> : null}
        <div className="flex flex-col gap-4">
          {items.map((row) => (
            <div key={row.id} className="rounded-xl border bg-background p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={confidenceVariant(row.confidenceScore)}>Confidence {row.confidenceScore || "--"}</Badge>
                  <Badge variant={row.reviewStatus === "APPROVED" ? "default" : "secondary"}>{row.reviewStatus}</Badge>
                  {row.isDemo ? <Badge variant="outline">DEMO</Badge> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => save(row)} disabled={busyId === row.id}>
                    {busyId === row.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                    Save review
                  </Button>
                  <Button size="sm" onClick={() => save(row, "APPROVED")} disabled={busyId === row.id}>
                    <CheckCircle2 className="mr-2 size-4" />
                    Approve
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Input value={row.invoiceNumber} onChange={(event) => patchRow(row.id, { invoiceNumber: event.target.value })} placeholder="Invoice number" />
                <Input type="date" value={row.invoiceDate} onChange={(event) => patchRow(row.id, { invoiceDate: event.target.value })} />
                <Input value={row.placeOfSupply} onChange={(event) => patchRow(row.id, { placeOfSupply: event.target.value })} placeholder="Place of supply" />
                <Input value={row.supplierName} onChange={(event) => patchRow(row.id, { supplierName: event.target.value })} placeholder="Supplier name" />
                <Input value={row.supplierGstin} onChange={(event) => patchRow(row.id, { supplierGstin: event.target.value.toUpperCase() })} placeholder="Supplier GSTIN" />
                <Input value={row.customerName} onChange={(event) => patchRow(row.id, { customerName: event.target.value })} placeholder="Customer name" />
                <Input value={row.customerGstin} onChange={(event) => patchRow(row.id, { customerGstin: event.target.value.toUpperCase() })} placeholder="Customer GSTIN" />
                <Input value={row.taxableValue} onChange={(event) => patchRow(row.id, { taxableValue: event.target.value })} placeholder="Taxable value" />
                <Input value={row.cgst} onChange={(event) => patchRow(row.id, { cgst: event.target.value })} placeholder="CGST" />
                <Input value={row.sgst} onChange={(event) => patchRow(row.id, { sgst: event.target.value })} placeholder="SGST" />
                <Input value={row.igst} onChange={(event) => patchRow(row.id, { igst: event.target.value })} placeholder="IGST" />
                <Input value={row.totalAmount} onChange={(event) => patchRow(row.id, { totalAmount: event.target.value })} placeholder="Total amount" />
              </div>
              <Textarea className="mt-3" value={noteById[row.id] ?? ""} onChange={(event) => setNoteById((previous) => ({ ...previous, [row.id]: event.target.value }))} placeholder="Optional review note for the CA/audit trail" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
