import Link from "next/link";
import { Download } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isGstDeskEnabled } from "@/lib/gst/config";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export default async function GstExportPage({ searchParams }: { searchParams: { periodId?: string } }) {
  const user = await requireUser();
  const enabled = isGstDeskEnabled();
  const periods = enabled
    ? await prisma.gstPeriod.findMany({ where: { userId: user.id }, orderBy: [{ financialYear: "desc" }, { month: "desc" }], include: { client: true } }).catch(() => [])
    : [];
  const selectedPeriodId = searchParams.periodId || periods[0]?.id;
  const selected = periods.find((period) => period.id === selectedPeriodId);
  const rowCount = selectedPeriodId ? await prisma.gstInvoiceExtraction.count({ where: { userId: user.id, periodId: selectedPeriodId } }).catch(() => 0) : 0;
  const needsReview = selectedPeriodId ? await prisma.gstInvoiceExtraction.count({ where: { userId: user.id, periodId: selectedPeriodId, reviewStatus: "NEEDS_REVIEW" } }).catch(() => 0) : 0;

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Export CA review files</h1>
          <p className="text-muted-foreground">Download CSV or Excel-compatible files. This does not file to GSTN.</p>
        </section>
        {!enabled ? <Card><CardHeader><CardTitle>GST Desk disabled</CardTitle><CardDescription>Set GST_DESK_ENABLED=true to enable this module.</CardDescription></CardHeader></Card> : null}
        <Card>
          <CardHeader>
            <CardTitle>{selected ? `${selected.client.businessName} - ${selected.label}` : "No period selected"}</CardTitle>
            <CardDescription>{rowCount} rows ready for export. {needsReview} still need manual review.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {periods.length ? <div className="flex flex-wrap gap-2">{periods.map((period) => <Link key={period.id} href={`/gst-desk/export?periodId=${period.id}`} className="rounded-full border px-3 py-1 text-xs hover:bg-muted">{period.client.businessName} - {period.label}</Link>)}</div> : null}
            {selectedPeriodId ? <div className="flex flex-wrap gap-3"><Link href={`/api/gst/export?periodId=${selectedPeriodId}&format=csv`} className={buttonVariants({ variant: "default" })}><Download className="mr-2 size-4" />Download CSV</Link><Link href={`/api/gst/export?periodId=${selectedPeriodId}&format=xls`} className={buttonVariants({ variant: "outline" })}>Download Excel</Link></div> : <p className="text-sm text-muted-foreground">Create a GST period first.</p>}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
