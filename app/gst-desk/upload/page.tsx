import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { GstDocumentUploadForm } from "@/components/gst/gst-document-upload-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGstStorageStatus } from "@/lib/gst/storage";
import { isGstDeskEnabled } from "@/lib/gst/config";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export default async function GstUploadPage({ searchParams }: { searchParams: { periodId?: string } }) {
  const user = await requireUser();
  const enabled = isGstDeskEnabled();
  const storage = getGstStorageStatus();
  const periods = enabled
    ? await prisma.gstPeriod.findMany({
        where: { userId: user.id },
        orderBy: [{ financialYear: "desc" }, { month: "desc" }],
        include: { client: true },
      }).catch(() => [])
    : [];

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Upload GST documents</h1>
          <p className="text-muted-foreground">Sales invoices, purchase bills, notes, and statements are stored in Supabase Storage before extraction.</p>
        </section>
        {!enabled ? <Card><CardHeader><CardTitle>GST Desk disabled</CardTitle><CardDescription>Set GST_DESK_ENABLED=true to enable this module.</CardDescription></CardHeader></Card> : null}
        {periods.length ? (
          <GstDocumentUploadForm
            periods={periods.map((period) => ({ id: period.id, label: period.label, clientName: period.client.businessName }))}
            initialPeriodId={searchParams.periodId}
            storageBlocked={storage.configured ? undefined : storage.missing}
          />
        ) : (
          <Card><CardHeader><CardTitle>No GST periods yet</CardTitle><CardDescription>Create a client and period from <Link href="/gst-desk/clients" className="underline">GST clients</Link> first.</CardDescription></CardHeader></Card>
        )}
      </div>
    </AppShell>
  );
}
