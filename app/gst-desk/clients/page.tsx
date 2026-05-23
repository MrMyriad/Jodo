import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/layout/app-shell";
import { GstClientManager } from "@/components/gst/gst-client-manager";
import { GstPeriodCreator } from "@/components/gst/gst-period-creator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isGstDeskEnabled } from "@/lib/gst/config";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export default async function GstClientsPage() {
  const user = await requireUser();
  const enabled = isGstDeskEnabled();
  const clients = enabled
    ? await prisma.gstClient.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        include: { periods: { orderBy: { updatedAt: "desc" }, take: 2 } },
      }).catch(() => [])
    : [];

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">GST clients</h1>
          <p className="text-muted-foreground">Manage SMB/CA clients and open monthly GST periods.</p>
        </section>

        {!enabled ? <Card><CardHeader><CardTitle>GST Desk disabled</CardTitle><CardDescription>Set GST_DESK_ENABLED=true to enable this module.</CardDescription></CardHeader></Card> : null}

        <section className="grid gap-6 xl:grid-cols-2">
          <GstClientManager />
          {clients.length ? <GstPeriodCreator clients={clients.map((client) => ({ id: client.id, businessName: client.businessName }))} /> : null}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Client list</CardTitle>
            <CardDescription>Demo data is explicitly marked and should not be treated as production GST data.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {clients.length ? clients.map((client) => (
              <div key={client.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{client.businessName}</p>
                    <p className="text-sm text-muted-foreground">{client.gstin || "GSTIN not added"} {client.state ? `| ${client.state}` : ""}</p>
                    <p className="text-sm text-muted-foreground">{client.contactName || "No contact"} {client.phone ? `| ${client.phone}` : ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {client.isDemo ? <Badge variant="outline">DEMO</Badge> : null}
                    {client.periods.map((period) => (
                      <Link key={period.id} href={`/gst-desk/periods/${period.id}`} className="rounded-full border px-3 py-1 text-xs hover:bg-muted">{period.label}</Link>
                    ))}
                  </div>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No GST clients yet. Add one manually or create a demo workspace.</p>}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
