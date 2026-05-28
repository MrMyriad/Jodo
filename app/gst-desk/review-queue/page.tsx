import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Download } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isGstDeskEnabled } from "@/lib/gst/config";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

function formatConfidence(value: unknown) {
  if (value === null || typeof value === "undefined") return "unknown";
  const num = Number(value);
  return Number.isFinite(num) ? `${Math.round(num)}%` : String(value);
}

export default async function GstReviewQueuePage() {
  const user = await requireUser();
  const enabled = isGstDeskEnabled();

  let rows: Array<{
    id: string;
    invoiceNumber: string | null;
    supplierName: string | null;
    customerName: string | null;
    confidenceScore: unknown;
    createdAt: Date;
    periodId: string;
    period: { label: string };
    client: { businessName: string };
  }> = [];
  let approvedCount = 0;
  let reviewCount = 0;

  if (enabled) {
    try {
      const [needsReviewRows, approved, needsReview] = await Promise.all([
        prisma.gstInvoiceExtraction.findMany({
          where: { userId: user.id, reviewStatus: "NEEDS_REVIEW" },
          orderBy: [{ confidenceScore: "asc" }, { createdAt: "desc" }],
          take: 50,
          select: {
            id: true,
            invoiceNumber: true,
            supplierName: true,
            customerName: true,
            confidenceScore: true,
            createdAt: true,
            periodId: true,
            period: { select: { label: true } },
            client: { select: { businessName: true } },
          },
        }),
        prisma.gstInvoiceExtraction.count({
          where: { userId: user.id, reviewStatus: "APPROVED" },
        }),
        prisma.gstInvoiceExtraction.count({
          where: { userId: user.id, reviewStatus: "NEEDS_REVIEW" },
        }),
      ]);

      rows = needsReviewRows;
      approvedCount = approved;
      reviewCount = needsReview;
    } catch {
      rows = [];
      approvedCount = 0;
      reviewCount = 0;
    }
  }

  const periodCounts = new Map<
    string,
    { periodId: string; label: string; clientName: string; count: number }
  >();

  for (const row of rows) {
    const existing = periodCounts.get(row.periodId);
    periodCounts.set(row.periodId, {
      periodId: row.periodId,
      label: row.period.label,
      clientName: row.client.businessName,
      count: (existing?.count ?? 0) + 1,
    });
  }

  const periodQueue = [...periodCounts.values()].sort((a, b) => b.count - a.count);

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Clock3 className="size-4 text-primary" />
              Human review layer
            </div>
            <h1 className="text-3xl font-semibold">GST review queue</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Prioritize low-confidence GST rows before export. This is where
              JODO stays safe for CA-ready data instead of blindly trusting OCR.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/gst-desk/review"
              className={buttonVariants({ variant: "outline" })}
            >
              Open review table
            </Link>
            <Link href="/gst-desk/export" className={buttonVariants()}>
              <Download className="mr-2 size-4" />
              Export CA files
            </Link>
          </div>
        </section>

        {!enabled ? (
          <Card>
            <CardHeader>
              <CardTitle>GST Desk disabled</CardTitle>
              <CardDescription>
                Set GST_DESK_ENABLED=true to enable this review queue.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Needs review</CardTitle>
              <CardDescription>Rows waiting for correction</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-3xl font-semibold">{reviewCount}</p>
              <AlertTriangle className="size-5 text-warning" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approved rows</CardTitle>
              <CardDescription>Ready for CA export</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-3xl font-semibold">{approvedCount}</p>
              <CheckCircle2 className="size-5 text-primary" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Affected periods</CardTitle>
              <CardDescription>Client months with review work</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-3xl font-semibold">{periodQueue.length}</p>
              <Clock3 className="size-5 text-primary" />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <Card>
            <CardHeader>
              <CardTitle>Period priority</CardTitle>
              <CardDescription>
                Open the busiest client-period first, correct rows, then export.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {periodQueue.length > 0 ? (
                periodQueue.map((period) => (
                  <Link
                    key={period.periodId}
                    href={`/gst-desk/review?periodId=${period.periodId}`}
                    className="rounded-xl border p-4 transition hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{period.clientName}</p>
                        <p className="text-sm text-muted-foreground">
                          {period.label}
                        </p>
                      </div>
                      <Badge variant="secondary">{period.count} rows</Badge>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  No low-confidence rows are waiting right now.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lowest confidence rows</CardTitle>
              <CardDescription>
                Quick triage list before you enter the full table.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {rows.length > 0 ? (
                rows.slice(0, 8).map((row) => (
                  <Link
                    key={row.id}
                    href={`/gst-desk/review?periodId=${row.periodId}`}
                    className="rounded-xl border p-4 transition hover:bg-muted"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {row.invoiceNumber || "Invoice number missing"}
                        </p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {row.supplierName || row.customerName || row.client.businessName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.client.businessName} - {row.period.label}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-sm text-warning">
                        {formatConfidence(row.confidenceScore)}
                        <ArrowRight className="size-4" />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  Upload GST documents to create extraction rows for review.
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
