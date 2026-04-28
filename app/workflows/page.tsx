import { Prisma } from "@prisma/client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { WorkflowControlPanel } from "@/components/workflows/workflow-control-panel";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

type WorkflowListItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: string;
  stepCount: number;
};

function getTriggerType(trigger: Prisma.JsonValue): string {
  if (!trigger || typeof trigger !== "object" || Array.isArray(trigger)) {
    return "unknown";
  }

  const triggerType = (trigger as Record<string, unknown>).type;
  return typeof triggerType === "string" ? triggerType : "unknown";
}

function getStepCount(steps: Prisma.JsonValue[]): number {
  return Array.isArray(steps) ? steps.length : 0;
}

export default async function WorkflowsPage() {
  const user = await requireUser();
  let workflows: WorkflowListItem[] = [];

  try {
    const rows = await prisma.workflow.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        trigger: true,
        steps: true,
      },
    });

    workflows = rows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      isActive: workflow.isActive,
      triggerType: getTriggerType(workflow.trigger),
      stepCount: getStepCount(workflow.steps),
    }));
  } catch {
    workflows = [];
  }

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold">Workflows</h1>
            <p className="text-muted-foreground">
              Manage active automations, run manual tests, and control execution
              state.
            </p>
          </div>
          <Button asChild>
            <Link href="/workflows/new">
              <Plus className="mr-2 size-4" />
              Create Workflow
            </Link>
          </Button>
        </section>

        <WorkflowControlPanel initialWorkflows={workflows} />
      </div>
    </AppShell>
  );
}
