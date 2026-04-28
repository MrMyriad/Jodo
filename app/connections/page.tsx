import { AppShell } from "@/components/layout/app-shell";
import { ConnectionCenter } from "@/components/connections/connection-center";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

type ConnectionRecord = {
  id: string;
  name: string;
  type:
    | "RAZORPAY"
    | "WHATSAPP_BUSINESS"
    | "INSTAGRAM"
    | "EXOTEL"
    | "ZOHO_BOOKS"
    | "GOOGLE_SHEETS"
    | "SHOPIFY"
    | "PHONEPE"
    | "PAYTM"
    | "SHIPROCKET"
    | "DELHIVERY";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default async function ConnectionsPage() {
  const user = await requireUser();

  let initialConnections: ConnectionRecord[] = [];

  try {
    const connections = await prisma.integration.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ type: "asc" }, { createdAt: "desc" }],
    });

    initialConnections = connections.map((connection) => ({
      id: connection.id,
      name: connection.name,
      type: connection.type,
      isActive: connection.isActive,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
    }));
  } catch {
    initialConnections = [];
  }

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Connected Accounts</h1>
          <p className="text-muted-foreground">
            Add and verify integrations directly from UI. No manual database
            setup needed.
          </p>
        </section>

        <ConnectionCenter initialConnections={initialConnections} />
      </div>
    </AppShell>
  );
}
