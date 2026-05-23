import Link from "next/link";
import { AlertTriangle, Download, FileText, FolderOpen, UploadCloud, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isGstDeskEnabled } from "@/lib/gst/config";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export default async function GstDeskPage() {
  const user = await requireUser();
  const enabled = isGstDeskEnabled();

  let stats = { clients: 0, periods: 0, documents: 0, needsReview: 0 };
  let recentPeriods: Array<{ id: string; label: string; client: { businessName: string; isDemo: boolean } }> = [];

  if (enabled) {
    try {
      const [clients, periods, documents, needsReview, recent] = await Promise.all([
        prisma.gstClient.count({ where: { userId: user.id } }),
        prisma.gstPeriod.count({ where: { userId: user.id } }),
        prisma.gstDocument.count({ where: { userId: user.id } }),
        prisma.gstInvoiceExtraction.count({ where: { userId: user.id, reviewStatus: "NEEDS_REVIEW" } }),
        prisma.gstPeriod.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: { id: true, label: true, client: { select: { businessName: true, isDemo: true } } },
        }),
      ]);
      stats = { clients, periods, documents, needsReview };
      recentPeriods = recent;
    } catch {
      stats = { clients: 0, periods: 0, documents: 0, needsReview: 0 };
    }
  }

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold">JODO GST Desk</h1>
                <Badge variant="secondary">CA-ready prep, no GSTN filing</Badge>
              </div>
              <p className="max-w-3xl text-muted-foreground">
                Prepare GST documents, extracted invoice rows, missing-document follow-ups, and CA review exports for Indian SMBs.
              </p>
            </div>
            <Link href="/gst-desk/export" className={buttonVariants({ variant: "default" })}>
              <Download className="mr-2 size-4" />
              Export CA files
            </Link>
          </div>
        </section>

        {!enabled ? (
          <Card className="border-warning/30 bg-warning/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="size-5" /> GST Desk disabled</CardTitle>
              <CardDescription>Set GST_DESK_ENABLED=true to enable this module.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card><CardHeader><CardTitle className="text-base">Clients</CardTitle><CardDescription>GST accounts</CardDescription></CardHeader><CardContent className="flex items-center justify-between"><p className="text-3xl font-semibold">{stats.clients}</p><Users className="size-5 text-primary" /></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Periods</CardTitle><CardDescription>Monthly workspaces</CardDescription></CardHeader><CardContent className="flex items-center justify-between"><p className="text-3xl font-semibold">{stats.periods}</p><FolderOpen className="size-5 text-primary" /></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Documents</CardTitle><CardDescription>Uploaded files</CardDescription></CardHeader><CardContent className="flex items-center justify-between"><p className="text-3xl font-semibold">{stats.documents}</p><UploadCloud className="size-5 text-primary" /></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Needs Review</CardTitle><CardDescription>Low confidence rows</CardDescription></CardHeader><CardContent className="flex items-center justify-between"><p className="text-3xl font-semibold">{stats.needsReview}</p><FileText className="size-5 text-warning" /></CardContent></Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Recent GST periods</CardTitle>
              <CardDescription>Jump back into client preparation workspaces.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {recentPeriods.length ? recentPeriods.map((period) => (
                <Link key={period.id} href={`/gst-desk/periods/${period.id}`} className="rounded-lg border p-4 transition hover:bg-muted">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><p className="font-medium">{period.client.businessName}</p><p className="text-sm text-muted-foreground">{period.label}</p></div>
                    {period.client.isDemo ? <Badge variant="outline">DEMO</Badge> : null}
                  </div>
                </Link>
              )) : <p className="text-sm text-muted-foreground">No GST periods yet. Create a client and open April 2026 from the client screen.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>GST Desk flow</CardTitle>
              <CardDescription>Separate from JODO automations, but using the same auth, DB, queue, logs, and audit style.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Link href="/gst-desk/clients" className={buttonVariants({ variant: "default" })}>Manage clients</Link>
              <Link href="/gst-desk/upload" className={buttonVariants({ variant: "outline" })}>Upload documents</Link>
              <Link href="/gst-desk/review" className={buttonVariants({ variant: "outline" })}>Review extracted rows</Link>
              <Link href="/gst-desk/export" className={buttonVariants({ variant: "outline" })}>
                <Download className="mr-2 size-4" />
                Export CSV / Excel
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
