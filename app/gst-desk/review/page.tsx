import Link from "next/link";
import { Download } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { GstReviewTable, type GstReviewRow } from "@/components/gst/gst-review-table";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isGstDeskEnabled } from "@/lib/gst/config";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

function str(value: unknown): string {
  if (value === null || typeof value === "undefined") return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

export default async function GstReviewPage({ searchParams }: { searchParams: { periodId?: string } }) {
  const user = await requireUser();
  const enabled = isGstDeskEnabled();
  const periods = enabled
    ? await prisma.gstPeriod.findMany({ where: { userId: user.id }, orderBy: [{ financialYear: "desc" }, { month: "desc" }], include: { client: true } }).catch(() => [])
    : [];
  const selectedPeriodId = searchParams.periodId || periods[0]?.id;
  const rows = selectedPeriodId
    ? await prisma.gstInvoiceExtraction.findMany({
        where: { userId: user.id, periodId: selectedPeriodId },
        orderBy: [{ reviewStatus: "asc" }, { createdAt: "desc" }],
      }).catch(() => [])
    : [];

  const exportHref = selectedPeriodId ? `/gst-desk/export?periodId=${selectedPeriodId}` : "/gst-desk/export";

  const reviewRows: GstReviewRow[] = rows.map((row) => ({
    id: row.id,
    invoiceNumber: str(row.invoiceNumber),
    invoiceDate: str(row.invoiceDate),
    supplierName: str(row.supplierName),
    supplierGstin: str(row.supplierGstin),
    customerName: str(row.customerName),
    customerGstin: str(row.customerGstin),
    placeOfSupply: str(row.placeOfSupply),
    taxableValue: str(row.taxableValue),
    cgst: str(row.cgst),
    sgst: str(row.sgst),
    igst: str(row.igst),
    totalAmount: str(row.totalAmount),
    documentType: row.documentType,
    sourceFileId: row.sourceFileId,
    confidenceScore: str(row.confidenceScore),
    reviewStatus: row.reviewStatus,
    isDemo: row.isDemo,
  }));

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold">Review GST extraction</h1>
            <p className="text-muted-foreground">Correct low-confidence invoice rows before exporting files for CA review.</p>
          </div>
          <Link href={exportHref} className={buttonVariants({ variant: "default" })}>
            <Download className="mr-2 size-4" />
            Export CA files
          </Link>
        </section>
        {!enabled ? <Card><CardHeader><CardTitle>GST Desk disabled</CardTitle><CardDescription>Set GST_DESK_ENABLED=true to enable this module.</CardDescription></CardHeader></Card> : null}
        {periods.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Period</CardTitle>
              <CardDescription>
                {periods.map((period) => (
                  <Link key={period.id} href={`/gst-desk/review?periodId=${period.id}`} className={`mr-2 inline-flex rounded-full border px-3 py-1 text-xs ${period.id === selectedPeriodId ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{period.client.businessName} - {period.label}</Link>
                ))}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={exportHref} className={buttonVariants({ variant: "outline" })}>
                Export CSV / Excel
              </Link>
            </CardContent>
          </Card>
        ) : null}
        <GstReviewTable rows={reviewRows} />
      </div>
    </AppShell>
  );
}
