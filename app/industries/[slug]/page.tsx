import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  ReceiptText,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { AuthNav } from "@/components/layout/auth-nav";

type IndustryPage = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: string;
  service: string;
  workflows: string[];
  outcomes: string[];
};

const industries: IndustryPage[] = [
  {
    slug: "d2c-brands",
    eyebrow: "D2C brands",
    title: "Automations for D2C teams selling through WhatsApp and Instagram.",
    description:
      "Turn payment links, Instagram demand, fulfillment sheets, and WhatsApp updates into a single operator-friendly system.",
    primaryCta: "Set up D2C order ops",
    service: "d2c-order-ops",
    workflows: [
      "Razorpay payment -> GST invoice -> WhatsApp receipt",
      "New order -> Google Sheet row -> team WhatsApp alert",
      "Instagram DM -> WhatsApp follow-up -> lead capture",
    ],
    outcomes: [
      "Faster buyer response",
      "Cleaner daily order handoff",
      "Less manual payment reconciliation",
    ],
  },
  {
    slug: "instagram-sellers",
    eyebrow: "Instagram sellers",
    title: "Respond to buyers before the conversation goes cold.",
    description:
      "JODO turns DMs and comments into WhatsApp follow-ups, lead rows, and reminders without asking sellers to learn a complex builder.",
    primaryCta: "Set up Instagram follow-up",
    service: "instagram-lead-followup",
    workflows: [
      "New DM -> auto-reply -> WhatsApp catalog",
      "Comment keyword -> Google Sheet lead",
      "Missed WhatsApp reply -> reminder draft",
    ],
    outcomes: [
      "More leads captured",
      "Shorter response time",
      "No buyer lost inside DMs",
    ],
  },
  {
    slug: "ca-firms",
    eyebrow: "CA firms",
    title: "A GST preparation desk for client-chasing and review-heavy work.",
    description:
      "Use JODO GST Desk for client workspaces, missing document lists, extraction review, reminder drafts, and CA-ready exports.",
    primaryCta: "Set up CA back office",
    service: "ca-firm-back-office",
    workflows: [
      "Client period -> missing document checklist",
      "Invoice upload -> extraction queue -> review table",
      "Missing files -> WhatsApp/email reminder draft",
    ],
    outcomes: [
      "Cleaner month-end packets",
      "Visible low-confidence rows",
      "Reusable reminders for every client",
    ],
  },
  {
    slug: "clinics-salons",
    eyebrow: "Clinics and salons",
    title: "Recover missed calls and keep customers moving on WhatsApp.",
    description:
      "For appointment-led local businesses, JODO can turn missed calls, payment confirmations, and follow-ups into simple workflows.",
    primaryCta: "Set up missed call recovery",
    service: "missed-call-recovery",
    workflows: [
      "Missed call -> WhatsApp menu",
      "Payment confirmation -> receipt message",
      "Daily report -> owner WhatsApp summary",
    ],
    outcomes: [
      "Fewer missed inquiries",
      "Faster appointment follow-up",
      "Less owner-dependent admin",
    ],
  },
  {
    slug: "local-services",
    eyebrow: "Local service businesses",
    title: "Recover missed inquiries and keep customers moving on WhatsApp.",
    description:
      "For salons, clinics, gyms, repair shops, and appointment-led teams, JODO turns missed calls, payments, and follow-ups into simple operator-ready workflows.",
    primaryCta: "Set up local service ops",
    service: "local-service-ops",
    workflows: [
      "Missed call -> WhatsApp menu",
      "Payment confirmation -> receipt message",
      "Appointment inquiry -> reminder draft",
    ],
    outcomes: [
      "Fewer missed inquiries",
      "Faster customer follow-up",
      "Less owner-dependent admin",
    ],
  },
];

export function generateStaticParams() {
  return industries.map((industry) => ({ slug: industry.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const industry = industries.find((item) => item.slug === params.slug);
  return {
    title: industry ? `${industry.eyebrow} automation | JODO` : "JODO",
    description: industry?.description ?? "JODO industry automation pages.",
  };
}

export default function IndustryPage({
  params,
}: {
  params: { slug: string };
}) {
  const industry = industries.find((item) => item.slug === params.slug);
  if (!industry) notFound();

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
              <Sparkles className="size-4 text-[#c7d2fe]" />
              {industry.eyebrow}
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              {industry.title}
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-400">
              {industry.description}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={`/done-for-you?service=${industry.service}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#6366f1] px-6 text-sm font-semibold text-white transition hover:bg-[#5558e3]"
              >
                {industry.primaryCta}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/solutions/razorpay-gst-whatsapp"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 px-6 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.03] hover:text-white"
              >
                View flagship workflow
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto grid gap-6 px-6 pb-24 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-[#1a1f2e] p-6 md:p-8">
          <div className="mb-5 flex items-center gap-3">
            <ReceiptText className="size-6 text-[#c7d2fe]" />
            <h2 className="text-2xl font-bold">Recommended workflows</h2>
          </div>
          <div className="grid gap-3">
            {industry.workflows.map((workflow) => (
              <div
                key={workflow}
                className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
              >
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#818cf8]" />
                <p className="text-sm leading-6 text-slate-300">{workflow}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#1a1f2e] p-6 md:p-8">
          <div className="mb-5 flex items-center gap-3">
            <Users className="size-6 text-[#c7d2fe]" />
            <h2 className="text-2xl font-bold">What changes for the team</h2>
          </div>
          <div className="grid gap-3">
            {industry.outcomes.map((outcome) => (
              <div
                key={outcome}
                className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
              >
                <MessageCircle className="mt-0.5 size-5 shrink-0 text-[#818cf8]" />
                <p className="text-sm leading-6 text-slate-300">{outcome}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
