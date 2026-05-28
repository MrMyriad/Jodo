import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  IndianRupee,
  MessageCircle,
  ReceiptText,
} from "lucide-react";
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
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

function startOfCurrentMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatRupees(value: number) {
  return `Rs ${Math.round(value).toLocaleString("en-IN")}`;
}

export default async function OutcomesDashboardPage() {
  const user = await requireUser();
  const startOfMonth = startOfCurrentMonth();

  let stats = {
    successfulRuns: 0,
    failedRuns: 0,
    receiptsSent: 0,
    gstDocsPrepared: 0,
    rowsNeedingReview: 0,
    approvedRows: 0,
    remindersDrafted: 0,
    openSetupRequests: 0,
    tasksConsumed: 0,
  };

  let topWorkflows: Array<{ name: string; runs: number }> = [];

  try {
    const [
      successfulRuns,
      failedRuns,
      monthlyExecutions,
      gstDocsPrepared,
      rowsNeedingReview,
      approvedRows,
      remindersDrafted,
      openSetupRequests,
    ] = await Promise.all([
      prisma.execution.count({
        where: {
          userId: user.id,
          status: "SUCCESS",
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.execution.count({
        where: {
          userId: user.id,
          status: "FAILED",
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.execution.findMany({
        where: { userId: user.id, createdAt: { gte: startOfMonth } },
        select: {
          status: true,
          tasksConsumed: true,
          workflow: { select: { name: true } },
        },
      }),
      prisma.gstDocument.count({
        where: { userId: user.id, createdAt: { gte: startOfMonth } },
      }),
      prisma.gstInvoiceExtraction.count({
        where: { userId: user.id, reviewStatus: "NEEDS_REVIEW" },
      }),
      prisma.gstInvoiceExtraction.count({
        where: { userId: user.id, reviewStatus: "APPROVED" },
      }),
      prisma.gstReminderDraft.count({
        where: { userId: user.id, createdAt: { gte: startOfMonth } },
      }),
      prisma.serviceSetupRequest.count({
        where: {
          userId: user.id,
          status: { in: ["NEW", "TRIAGED", "IN_PROGRESS", "WAITING_ON_CLIENT"] },
        },
      }),
    ]);

    const usageMap = new Map<string, number>();
    let receiptsSent = 0;
    let tasksConsumed = 0;

    for (const execution of monthlyExecutions) {
      const name = execution.workflow?.name ?? "Workflow";
      usageMap.set(name, (usageMap.get(name) ?? 0) + 1);
      tasksConsumed += Math.max(0, execution.tasksConsumed ?? 0);

      const lowerName = name.toLowerCase();
      if (
        execution.status === "SUCCESS" &&
        (lowerName.includes("receipt") ||
          lowerName.includes("whatsapp") ||
          lowerName.includes("invoice"))
      ) {
        receiptsSent += 1;
      }
    }

    topWorkflows = [...usageMap.entries()]
      .map(([name, runs]) => ({ name, runs }))
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 5);

    stats = {
      successfulRuns,
      failedRuns,
      receiptsSent,
      gstDocsPrepared,
      rowsNeedingReview,
      approvedRows,
      remindersDrafted,
      openSetupRequests,
      tasksConsumed,
    };
  } catch {
    stats = {
      successfulRuns: 0,
      failedRuns: 0,
      receiptsSent: 0,
      gstDocsPrepared: 0,
      rowsNeedingReview: 0,
      approvedRows: 0,
      remindersDrafted: 0,
      openSetupRequests: 0,
      tasksConsumed: 0,
    };
    topWorkflows = [];
  }

  const hoursSaved = Math.round(stats.successfulRuns * 0.08 * 10) / 10;
  const moneySaved = stats.successfulRuns * 8 + stats.approvedRows * 4;
  const nextMoves = [
    stats.rowsNeedingReview > 0
      ? {
          title: "Review GST rows",
          body: `${stats.rowsNeedingReview} extracted rows need human review before export.`,
          href: "/gst-desk/review-queue",
          tone: "warning",
        }
      : null,
    stats.failedRuns > 0
      ? {
          title: "Fix failed automations",
          body: `${stats.failedRuns} workflow runs failed this month. Check logs before scaling volume.`,
          href: "/dashboard",
          tone: "danger",
        }
      : null,
    stats.openSetupRequests > 0
      ? {
          title: "Finish setup requests",
          body: `${stats.openSetupRequests} done-for-you requests are still open.`,
          href: "/done-for-you",
          tone: "info",
        }
      : null,
  ].filter(Boolean) as Array<{
    title: string;
    body: string;
    href: string;
    tone: "warning" | "danger" | "info";
  }>;

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <BarChart3 className="size-4 text-primary" />
              Business outcomes
            </div>
            <h1 className="text-3xl font-semibold">Outcome dashboard</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              A practical view of what JODO did for the business this month:
              receipts sent, GST work prepared, review queues, failures, and
              manual work avoided.
            </p>
          </div>
          <Link href="/done-for-you" className={buttonVariants()}>
            Request setup help
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Receipts Sent</CardTitle>
                <CardDescription>Payment and invoice workflows</CardDescription>
              </div>
              <MessageCircle className="size-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stats.receiptsSent}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">GST Docs Prepared</CardTitle>
                <CardDescription>Uploaded this month</CardDescription>
              </div>
              <FileText className="size-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stats.gstDocsPrepared}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Human Review Queue</CardTitle>
                <CardDescription>Rows needing correction</CardDescription>
              </div>
              <AlertTriangle className="size-5 text-warning" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stats.rowsNeedingReview}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Manual Work Saved</CardTitle>
                <CardDescription>Simple monthly estimate</CardDescription>
              </div>
              <IndianRupee className="size-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatRupees(moneySaved)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                About {hoursSaved} hours avoided
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Workflow outcomes</CardTitle>
              <CardDescription>
                Top workflows by monthly run count, with the outcome lens front
                and center.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {topWorkflows.length > 0 ? (
                topWorkflows.map((workflow) => (
                  <div
                    key={workflow.name}
                    className="flex items-center justify-between gap-4 rounded-xl border p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{workflow.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {workflow.runs} runs this month
                      </p>
                    </div>
                    <Badge variant="secondary">{workflow.runs}</Badge>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  No workflow outcomes yet. Activate the flagship payment to
                  receipt workflow or request a done-for-you setup.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What to fix next</CardTitle>
              <CardDescription>
                JODO should point operators to the next bottleneck, not just
                show charts.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {nextMoves.length > 0 ? (
                nextMoves.map((move) => (
                  <Link
                    key={move.title}
                    href={move.href}
                    className="rounded-xl border p-4 transition hover:bg-muted"
                  >
                    <div className="flex items-start gap-3">
                      {move.tone === "danger" ? (
                        <AlertTriangle className="mt-0.5 size-5 text-destructive" />
                      ) : move.tone === "warning" ? (
                        <Clock3 className="mt-0.5 size-5 text-warning" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 size-5 text-primary" />
                      )}
                      <div>
                        <p className="font-medium">{move.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {move.body}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 text-emerald-400" />
                    <div>
                      <p className="font-medium">No urgent bottlenecks</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Your review queue and failures are clear. Add the next
                        high-volume workflow when ready.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Link
                href="/solutions/razorpay-gst-whatsapp"
                className={buttonVariants({ variant: "outline" })}
              >
                <ReceiptText className="mr-2 size-4" />
                Open flagship workflow
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
