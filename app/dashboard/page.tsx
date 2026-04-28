import Link from "next/link";
import { ExecutionStatus } from "@prisma/client";
import { Activity, CheckCircle2, Workflow, Zap } from "lucide-react";
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

function formatDuration(duration: number | null): string {
  if (!duration) return "--";
  if (duration < 1000) return `${duration}ms`;
  return `${(duration / 1000).toFixed(1)}s`;
}

function statusBadgeVariant(
  status: ExecutionStatus,
): "default" | "secondary" | "destructive" {
  if (status === "SUCCESS") return "default";
  if (status === "RUNNING") return "secondary";
  return "destructive";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  let activeWorkflowsCount = 0;
  let executionsTodayCount = 0;
  let successRate = "0%";
  let recentExecutions: Array<{
    id: string;
    status: ExecutionStatus;
    createdAt: Date;
    completedAt: Date | null;
    workflow: {
      name: string;
    };
  }> = [];

  try {
    const [activeWorkflows, executionsToday, recent] = await Promise.all([
      prisma.workflow.count({
        where: {
          userId: user.id,
          isActive: true,
        },
      }),
      prisma.execution.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: startOfDay,
          },
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
  } catch {
    activeWorkflowsCount = 0;
    executionsTodayCount = 0;
    successRate = "0%";
    recentExecutions = [];
  }

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">
            Track automation health, execution performance, and quick next
            actions.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-base">Active Workflows</CardTitle>
                <CardDescription>Currently running</CardDescription>
              </div>
              <Workflow className="size-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{activeWorkflowsCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-base">Executions Today</CardTitle>
                <CardDescription>Since 12:00 AM</CardDescription>
              </div>
              <Activity className="size-5 text-success" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{executionsTodayCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-base">Success Rate</CardTitle>
                <CardDescription>Recent executions</CardDescription>
              </div>
              <CheckCircle2 className="size-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{successRate}</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
              <CardDescription>
                Latest workflow runs with status and performance.
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
                        <TableCell>{execution.workflow.name}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(execution.status)}>
                            {execution.status.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatTimeAgo(execution.createdAt)}
                        </TableCell>
                        <TableCell>
                          {execution.completedAt
                            ? formatDuration(
                                execution.completedAt.getTime() -
                                  execution.createdAt.getTime(),
                              )
                            : "--"}
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
                  No executions yet. Create a workflow and run a test to see
                  logs here.
                </div>
              )}
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
                <Zap className="mr-2 size-4" />
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
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
