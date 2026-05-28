import Link from "next/link";
import { ExecutionStatus } from "@prisma/client";
import { Activity, CheckCircle2, IndianRupee, Workflow, Zap } from "lucide-react";
import { WorkflowUsageChart } from "@/components/dashboard/workflow-usage-chart";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60)
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function formatDurationMs(createdAt: Date, completedAt: Date | null): string {
  if (!completedAt) return "--";
  const duration = completedAt.getTime() - createdAt.getTime();
  if (duration < 1000) return `${duration}ms`;
  return `${(duration / 1000).toFixed(1)}s`;
}

function statusBadgeVariant(
  status: ExecutionStatus,
): "default" | "secondary" | "destructive" {
  if (status === "SUCCESS") return "default";
  if (status === "RUNNING" || status === "PENDING" || status === "RETRYING")
    return "secondary";
  return "destructive";
}

function getTaskLimit(plan: string): number | null {
  if (plan === "FREE") return 500;
  if (plan === "PRO") return 10_000;
  return null;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let activeWorkflowsCount = 0;
  let executionsTodayCount = 0;
  let totalExecutionsThisMonth = 0;
  let successRate = "0%";
  let tasksUsed = user.tasksUsedThisMonth;
  let tasksLimit = getTaskLimit(user.plan);
  let moneySaved = 0;
  let recentExecutions: Array<{
    id: string;
    status: ExecutionStatus;
    createdAt: Date;
    completedAt: Date | null;
    workflow: {
      name: string;
    };
  }> = [];
  let workflowUsage: Array<{ name: string; runs: number }> = [];

  try {
    const [activeWorkflows, executionsToday, recent, executionsThisMonth] =
      await Promise.all([
        prisma.workflow.count({
          where: {
            userId: user.id,
            isActive: true,
          },
        }),
        prisma.execution.count({
          where: {
            userId: user.id,
            createdAt: { gte: startOfDay },
          },
        }),
        prisma.execution.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: {
            workflow: {
              select: { name: true },
            },
          },
        }),
        prisma.execution.findMany({
          where: {
            userId: user.id,
            createdAt: { gte: startOfMonth },
          },
          select: {
            status: true,
            tasksConsumed: true,
            workflow: {
              select: { name: true },
            },
          },
        }),
      ]);

    const successfulCount = recent.filter(
      (execution) => execution.status === "SUCCESS",
    ).length;

    activeWorkflowsCount = activeWorkflows;
    executionsTodayCount = executionsToday;
    recentExecutions = recent;
    successRate =
      recent.length > 0
        ? `${Math.round((successfulCount / recent.length) * 100)}%`
        : "0%";

    totalExecutionsThisMonth = executionsThisMonth.length;
    if (tasksUsed === 0) {
      tasksUsed = executionsThisMonth.reduce(
        (acc, item) => acc + Math.max(0, item.tasksConsumed ?? 0),
        0,
      );
    }

    // Simple savings estimate: each successful execution saves ~Rs 8 of manual effort.
    moneySaved = Math.round(
      executionsThisMonth.filter((item) => item.status === "SUCCESS").length * 8,
    );

    const usageMap = new Map<string, number>();
    for (const execution of executionsThisMonth) {
      const workflowName = execution.workflow?.name ?? "Workflow";
      usageMap.set(workflowName, (usageMap.get(workflowName) ?? 0) + 1);
    }

    workflowUsage = [...usageMap.entries()]
      .map(([name, runs]) => ({ name, runs }))
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 6);
  } catch {
    activeWorkflowsCount = 0;
    executionsTodayCount = 0;
    totalExecutionsThisMonth = 0;
    successRate = "0%";
    tasksUsed = user.tasksUsedThisMonth;
    tasksLimit = getTaskLimit(user.plan);
    moneySaved = 0;
    recentExecutions = [];
    workflowUsage = [];
  }

  const taskProgressPercent =
    tasksLimit && tasksLimit > 0
      ? Math.min(100, Math.round((tasksUsed / tasksLimit) * 100))
      : null;

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">
            Track automations, task usage, reliability, and business impact.
          </p>
          <p className="text-sm text-muted-foreground">
            {activeWorkflowsCount} active workflows and {executionsTodayCount} executions today.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-1">
                <CardTitle className="text-base">Automations Run</CardTitle>
                <CardDescription>This month</CardDescription>
              </div>
              <Zap className="size-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{totalExecutionsThisMonth}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-1">
                <CardTitle className="text-base">Success Rate</CardTitle>
                <CardDescription>Recent executions</CardDescription>
              </div>
              <CheckCircle2 className="size-5 text-success" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{successRate}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-1">
                <CardTitle className="text-base">Tasks Used</CardTitle>
                <CardDescription>
                  {tasksLimit ? `${tasksUsed} / ${tasksLimit}` : `${tasksUsed} / Unlimited`}
                </CardDescription>
              </div>
              <Activity className="size-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{tasksUsed}</p>
              {taskProgressPercent !== null ? (
                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${taskProgressPercent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {taskProgressPercent}% of monthly limit used
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-1">
                <CardTitle className="text-base">Money Saved</CardTitle>
                <CardDescription>vs manual work</CardDescription>
              </div>
              <IndianRupee className="size-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">Rs {moneySaved}</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Most Used Workflows</CardTitle>
              <CardDescription>
                Workflow execution frequency for this month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkflowUsageChart data={workflowUsage} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Most common setup actions for new users.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Link href="/workflows/new" className={buttonVariants()}>
                <Workflow className="mr-2 size-4" />
                Create New Workflow
              </Link>
              <Link
                href="/templates"
                className={buttonVariants({ variant: "outline" })}
              >
                Browse Templates
              </Link>
              <Link
                href="/connections"
                className={buttonVariants({ variant: "outline" })}
              >
                Connect Account
              </Link>
              <Link
                href="/dashboard/outcomes"
                className={buttonVariants({ variant: "outline" })}
              >
                View Outcome Dashboard
              </Link>
              <Link
                href="/done-for-you"
                className={buttonVariants({ variant: "outline" })}
              >
                Request Setup Help
              </Link>
              <Link
                href="/pricing"
                className={buttonVariants({ variant: "outline" })}
              >
                <IndianRupee className="mr-2 size-4" />
                View Pricing
              </Link>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
              <CardDescription>
                Latest workflow runs with status and timing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentExecutions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentExecutions.map((execution) => (
                      <TableRow key={execution.id}>
                        <TableCell className="min-w-[180px] max-w-[260px] break-words">
                          {execution.workflow.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(execution.status)}>
                            {execution.status.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatTimeAgo(execution.createdAt)}</TableCell>
                        <TableCell>
                          {formatDurationMs(execution.createdAt, execution.completedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/dashboard/executions/${execution.id}`}
                            className="text-primary hover:underline"
                          >
                            View details
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No executions yet. Create a workflow and run a test to see logs.
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
