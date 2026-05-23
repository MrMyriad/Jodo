import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileSearch, UploadCloud } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { GstReminderGenerator } from "@/components/gst/gst-reminder-generator";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isGstDeskEnabled } from "@/lib/gst/config";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

function money(value: unknown): string {
  if (value === null || typeof value === "undefined") return "--";
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
}

export default async function GstPeriodWorkspacePage({ params }: { params: { periodId: string } }) {
  const user = await requireUser();
  const enabled = isGstDeskEnabled();

  if (!enabled) {
    return (
      <AppShell user={user}>
        <Card><CardHeader><CardTitle>GST Desk disabled</CardTitle><CardDescription>Set GST_DESK_ENABLED=true to enable this module.</CardDescription></CardHeader></Card>
      </AppShell>
    );
  }

  const period = await prisma.gstPeriod.findFirst({
    where: { id: params.periodId, userId: user.id },
    include: {
      client: true,
      checklistItems: { orderBy: [{ status: "asc" }, { title: "asc" }] },
      documents: { orderBy: { createdAt: "desc" }, take: 8 },
      extractions: { orderBy: { createdAt: "desc" }, take: 8 },
      reminderDrafts: { orderBy: { createdAt: "desc" }, take: 2 },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });

  if (!period) notFound();

  const missingCount = period.checklistItems.filter((item) => item.status === "MISSING" || item.status === "REQUESTED").length;
  const needsReviewCount = period.extractions.filter((item) => item.reviewStatus === "NEEDS_REVIEW").length;

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold">{period.client.businessName}</h1>
              {period.client.isDemo ? <Badge variant="outline">DEMO</Badge> : null}
            </div>
            <p className="text-muted-foreground">GST workspace for {period.label}. CA-ready preparation only, no direct GSTN filing.</p>
            <p className="text-sm text-muted-foreground">GSTIN: {period.client.gstin || "Not added"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/gst-desk/upload?periodId=${period.id}`} className={buttonVariants({ variant: "outline" })}><UploadCloud className="mr-2 size-4" />Upload</Link>
            <Link href={`/gst-desk/review?periodId=${period.id}`} className={buttonVariants({ variant: "outline" })}><FileSearch className="mr-2 size-4" />Review</Link>
            <Link href={`/gst-desk/export?periodId=${period.id}`} className={buttonVariants({ variant: "default" })}><Download className="mr-2 size-4" />Export</Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle className="text-base">Documents</CardTitle><CardDescription>Uploaded files</CardDescription></CardHeader><CardContent><p className="text-3xl font-semibold">{period.documents.length}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Needs review</CardTitle><CardDescription>Extraction rows</CardDescription></CardHeader><CardContent><p className="text-3xl font-semibold">{needsReviewCount}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Missing docs</CardTitle><CardDescription>Checklist open items</CardDescription></CardHeader><CardContent><p className="text-3xl font-semibold">{missingCount}</p></CardContent></Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle>Missing document checklist</CardTitle><CardDescription>Use reminder drafts to chase unresolved items.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{period.checklistItems.map((item) => <TableRow key={item.id}><TableCell>{item.title}</TableCell><TableCell><Badge variant={item.status === "RECEIVED" ? "default" : "secondary"}>{item.status}</Badge></TableCell></TableRow>)}</TableBody>
              </Table>
            </CardContent>
          </Card>
          <GstReminderGenerator periodId={period.id} />
        </section>

        <Card>
          <CardHeader><CardTitle>Recent extracted rows</CardTitle><CardDescription>Low-confidence rows should be corrected before export.</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Party</TableHead><TableHead>Taxable</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {period.extractions.length ? period.extractions.map((row) => <TableRow key={row.id}><TableCell>{row.invoiceNumber || "--"}</TableCell><TableCell>{row.customerName || row.supplierName || "Needs review"}</TableCell><TableCell>{money(row.taxableValue)}</TableCell><TableCell>{money(row.totalAmount)}</TableCell><TableCell><Badge variant={row.reviewStatus === "APPROVED" ? "default" : "secondary"}>{row.reviewStatus}</Badge></TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="text-muted-foreground">No extraction rows yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Documents</CardTitle><CardDescription>Latest uploaded files and extraction status.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-3">{period.documents.length ? period.documents.map((doc) => <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div><p className="font-medium">{doc.originalName}</p><p className="text-xs text-muted-foreground">{doc.documentType}</p></div><Badge variant={doc.status === "FAILED" ? "destructive" : "secondary"}>{doc.status}</Badge></div>) : <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Audit trail</CardTitle><CardDescription>Extraction, review, export, and reminder events.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-3">{period.auditLogs.length ? period.auditLogs.map((log) => <div key={log.id} className="rounded-lg border p-3"><p className="text-sm font-medium">{log.action}</p><p className="text-sm text-muted-foreground">{log.message}</p><p className="text-xs text-muted-foreground">{log.createdAt.toISOString()}</p></div>) : <p className="text-sm text-muted-foreground">No GST audit events yet.</p>}</CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
