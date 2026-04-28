import { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

type ExecutionDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function ExecutionDetailPage({
  params,
}: ExecutionDetailPageProps) {
  const user = await requireUser();

  let execution: Prisma.ExecutionGetPayload<{
    include: {
      workflow: {
        select: {
          name: true;
        };
      };
    };
  }> | null = null;

  try {
    execution = await prisma.execution.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        workflow: {
          select: { name: true },
        },
      },
    });
  } catch {
    execution = null;
  }

  if (!execution) {
    notFound();
  }

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Execution Details</h1>
          <p className="text-muted-foreground">
            Inspect trigger payload, action output, and runtime diagnostics.
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>{execution.workflow.name}</CardTitle>
            <CardDescription>Execution ID: {execution.id}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm">
              Status: <Badge>{execution.status}</Badge>
            </p>
            <p className="text-sm">
              Started:{" "}
              {execution.createdAt.toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            <p className="text-sm">
              Duration:{" "}
              {execution.completedAt
                ? `${execution.completedAt.getTime() - execution.createdAt.getTime()}ms`
                : "Not available"}
            </p>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs font-medium">Trigger data</p>
              <pre className="mt-2 overflow-auto text-xs">
                {JSON.stringify(execution.triggerData, null, 2)}
              </pre>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-xs font-medium">Step results</p>
              <pre className="mt-2 overflow-auto text-xs">
                {JSON.stringify(execution.stepResults ?? [], null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
