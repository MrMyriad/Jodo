import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  IndianRupee,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { AuthNav } from "@/components/layout/auth-nav";

const readinessSteps = [
  {
    title: "Connect Razorpay",
    body: "Store encrypted API credentials and verify webhook signature handling.",
    href: "/integrations/razorpay/connect",
  },
  {
    title: "Connect Zoho Books",
    body: "Create GST invoice drafts with customer, items, GST values, and invoice links.",
    href: "/integrations/zoho/connect",
  },
  {
    title: "Connect WhatsApp Business",
    body: "Use an approved receipt template and test a real delivery path.",
    href: "/integrations/whatsapp/connect",
  },
  {
    title: "Activate the workflow",
    body: "Use the template wizard to create the live Razorpay -> GST invoice -> WhatsApp flow.",
    href: "/templates/razorpay-whatsapp-invoice",
  },
  {
    title: "Watch logs and outcomes",
    body: "Execution logs, retries, failures, and business outcomes stay visible after launch.",
    href: "/dashboard/outcomes",
  },
];

const proofPoints = [
  {
    icon: IndianRupee,
    title: "Payment event",
    body: "Razorpay payment captured arrives through a signed webhook.",
  },
  {
    icon: ReceiptText,
    title: "GST invoice",
    body: "Zoho Books invoice action receives customer and order data.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp receipt",
    body: "Customer receives receipt text and invoice URL/PDF reference.",
  },
  {
    icon: ShieldCheck,
    title: "Operator safety",
    body: "Failures go to execution logs instead of silently disappearing.",
  },
];

export const metadata = {
  title: "Razorpay to GST invoice to WhatsApp | JODO",
  description:
    "JODO flagship workflow for Indian businesses: Razorpay payment captured, GST invoice created, WhatsApp receipt sent, and execution logs tracked.",
};

export default function RazorpayGstWhatsappSolutionPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0f1419] text-white">
      <nav className="border-b border-white/[0.06] bg-[#0f1419]/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#6366f1]">
              <Zap className="size-5 text-white" />
            </span>
            <span className="text-lg font-semibold tracking-tight">JODO</span>
          </Link>
          <AuthNav />
        </div>
      </nav>

      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#6366f1]/10 via-transparent to-transparent" />
        <div className="container relative mx-auto px-6 py-16 md:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-slate-300">
              <Clock3 className="size-4 text-[#c7d2fe]" />
              Flagship workflow
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Razorpay payment to GST invoice to WhatsApp receipt.
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-400">
              This is the workflow JODO must win first: one payment should
              create the back-office paperwork, notify the customer, and leave
              a clear execution trail for the team.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/templates/razorpay-whatsapp-invoice"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#6366f1] px-6 text-sm font-semibold text-white transition hover:bg-[#5558e3]"
              >
                Activate template
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/done-for-you?service=razorpay-receipts"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 px-6 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.03] hover:text-white"
              >
                Ask JODO to set it up
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {proofPoints.map((point) => {
            const Icon = point.icon;

            return (
              <div
                key={point.title}
                className="rounded-2xl border border-white/[0.06] bg-[#1a1f2e] p-5"
              >
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
                  <Icon className="size-5 text-[#c7d2fe]" />
                </div>
                <h2 className="text-lg font-semibold">{point.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {point.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto grid gap-8 px-6 pb-24 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#818cf8]">
            Production checklist
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Make the workflow safe enough for real orders.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Switching happens when a business trusts the new system with daily
            revenue. These steps connect the integrations, activate the
            workflow, and keep the operator loop visible.
          </p>
          <Link
            href="/dashboard/outcomes"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.03] hover:text-white"
          >
            View outcome dashboard
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#1a1f2e] p-4 md:p-6">
          <div className="grid gap-3">
            {readinessSteps.map((step, index) => (
              <Link
                key={step.title}
                href={step.href}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:border-[#6366f1]/30 hover:bg-[#6366f1]/10"
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#6366f1]/15 text-sm font-semibold text-[#c7d2fe]">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold">{step.title}</p>
                      <ArrowRight className="size-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" />
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {step.body}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-[#6366f1]/20 bg-[#6366f1]/10 p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <FileText className="mt-1 size-7 shrink-0 text-[#c7d2fe]" />
              <div>
                <h2 className="text-2xl font-bold">
                  Want a human review checkpoint before receipts go live?
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Use GST Desk review queues for document prep and manual
                  correction. JODO should automate the repeatable parts while
                  keeping risky data visible.
                </p>
              </div>
            </div>
            <Link
              href="/gst-desk/review-queue"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#0f1419] transition hover:bg-slate-200"
            >
              Open review queue
              <CheckCircle2 className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
