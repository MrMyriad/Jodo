import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles, Zap } from "lucide-react";
import { AuthNav } from "@/components/layout/auth-nav";
import { DoneForYouSetupForm } from "@/components/service/done-for-you-setup-form";
import { serviceSetupOptions } from "@/lib/service-setup";

export const metadata = {
  title: "Done-for-you automation setup | JODO",
  description:
    "Request a guided JODO setup for Razorpay receipts, GST prep, Instagram follow-ups, missed calls, and CA firm back-office workflows.",
};

export default function DoneForYouPage({
  searchParams,
}: {
  searchParams: { service?: string };
}) {
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
        <div className="container relative mx-auto grid gap-10 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-slate-300">
              <Sparkles className="size-4 text-[#c7d2fe]" />
              Service-led automation
            </div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white md:text-6xl">
              Let JODO map and set up the workflow for you.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
              Some businesses do not want another builder. They want payments,
              GST prep, WhatsApp follow-ups, and lead handoffs running without
              extra ops meetings. This request turns JODO into a guided setup
              desk.
            </p>
            <div className="mt-8 grid gap-3">
              {[
                "We capture your current process and integrations.",
                "JODO recommends the workflow, review points, and launch test.",
                "You keep the same dashboard, logs, review queue, and exports.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#818cf8]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <DoneForYouSetupForm initialType={searchParams.service} />
        </div>
      </section>

      <section className="container mx-auto px-6 pb-20">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Built around outcomes, not app directories.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Choose a setup desk and JODO translates it into workflows,
              checklist items, review screens, and logs.
            </p>
          </div>
          <Link
            href="/solutions/razorpay-gst-whatsapp"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.03] hover:text-white"
          >
            See flagship workflow
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {serviceSetupOptions.map((option) => (
            <Link
              key={option.value}
              href={`/done-for-you?service=${option.value.toLowerCase().replace(/_/g, "-")}`}
              className="rounded-2xl border border-white/[0.06] bg-[#1a1f2e] p-5 transition hover:-translate-y-1 hover:border-[#6366f1]/30 hover:bg-[#1d2333]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#818cf8]">
                {option.shortLabel}
              </p>
              <h3 className="mt-3 text-lg font-semibold">{option.label}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {option.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
