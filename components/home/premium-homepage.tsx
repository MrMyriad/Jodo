"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  IndianRupee,
  MessageCircle,
  PhoneMissed,
  ReceiptText,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Template = {
  icon: string;
  title: string;
  description: string;
  usageCount: string;
  href: string;
};

const hindiHeadline =
  "\u0905\u092a\u0928\u0947 \u0935\u094d\u092f\u093e\u092a\u093e\u0930 \u0915\u094b \u0938\u094d\u0935\u091a\u093e\u0932\u093f\u0924 \u0915\u0930\u0947\u0902";

const heroPhrases = [hindiHeadline, "Automate your business"];

const templates: Template[] = [
  {
    icon: "Rs",
    title: "Payment to WhatsApp Receipt",
    description:
      "Capture Razorpay payments, create a GST invoice, and send the receipt on WhatsApp automatically.",
    usageCount: "1,243",
    href: "/onboarding?template=razorpay_whatsapp_invoice",
  },
  {
    icon: "DM",
    title: "Instagram DM Follow-up",
    description:
      "Reply to high-intent Instagram DMs, move buyers to WhatsApp, and save every lead to Sheets.",
    usageCount: "856",
    href: "/onboarding?template=instagram_dm_whatsapp_followup",
  },
  {
    icon: "CA",
    title: "Missed Call to WhatsApp",
    description:
      "Send a polished WhatsApp follow-up with catalog and next steps when a business call is missed.",
    usageCount: "672",
    href: "/onboarding?template=missed_call_whatsapp",
  },
];

const comparisonRows = [
  {
    name: "Starting price",
    ours: "Rs 299/month",
    zapier: "~Rs 2,800/month",
    highlight: true,
  },
  {
    name: "Tasks/month on paid plan",
    ours: "10,000",
    zapier: "750",
    highlight: true,
  },
  {
    name: "Indian integrations",
    ours: "Razorpay, WhatsApp, GST",
    zapier: "Mostly global defaults",
    highlight: true,
  },
  {
    name: "Execution speed",
    ours: "Instant webhooks",
    zapier: "Polling depends on tier",
    highlight: false,
  },
  {
    name: "Hindi support",
    ours: "Built in",
    zapier: "Not localized",
    highlight: false,
  },
];

function useTypedHeroText() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visibleLength, setVisibleLength] = useState(heroPhrases[0].length);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const phrase = heroPhrases[phraseIndex];
    const isComplete = visibleLength === phrase.length;
    const isAtMinimum = visibleLength <= 1;
    const delay = isComplete ? 1800 : isDeleting ? 24 : 36;

    const timeout = window.setTimeout(() => {
      if (!isDeleting && isComplete) {
        setIsDeleting(true);
        return;
      }

      if (isDeleting && isAtMinimum) {
        setIsDeleting(false);
        setPhraseIndex((current) => (current + 1) % heroPhrases.length);
        setVisibleLength(1);
        return;
      }

      setVisibleLength((current) => current + (isDeleting ? -1 : 1));
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [isDeleting, phraseIndex, visibleLength]);

  return heroPhrases[phraseIndex].slice(0, visibleLength);
}

function Header() {
  return (
    <nav className="border-b border-white/[0.06] bg-[#0f1419]/80 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" prefetch className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#6366f1]">
            <Zap className="size-5 text-white" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">
            JODO
          </span>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium md:flex">
          <Link
            href="/assistant"
            prefetch
            className="text-slate-400 transition hover:text-white"
          >
            Assistant
          </Link>
          <a
            href="#templates"
            className="text-slate-400 transition hover:text-white"
          >
            Templates
          </a>
          <a
            href="#integrations"
            className="text-slate-400 transition hover:text-white"
          >
            Integrations
          </a>
          <Link
            href="/pricing"
            prefetch
            className="text-slate-400 transition hover:text-white"
          >
            Pricing
          </Link>
        </div>

        <Link
          href="/auth/signin"
          prefetch
          className="text-sm font-medium text-slate-400 transition hover:text-white"
        >
          Sign in
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  const typedText = useTypedHeroText();

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#6366f1]/8 via-transparent to-transparent" />
      <div
        className="absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="container relative mx-auto px-6 pb-20 pt-14 md:pb-24 md:pt-20">
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-slate-300">
            <span className="size-1.5 rounded-full bg-[#6366f1]" />
            For Indian businesses
          </div>
        </div>

        <h1 className="mx-auto mb-5 max-w-6xl px-2 py-3 text-center text-[clamp(2.6rem,7.2vw,5.8rem)] font-bold leading-[1.16] tracking-tight text-white">
          <span className="block pb-1 text-white">अपने व्यापार को</span>
          <span className="block pb-2 text-transparent [background-image:linear-gradient(135deg,#e5e7eb_0%,#6366f1_50%,#8b5cf6_100%)] bg-clip-text">
            स्वचालित करें
          </span>
        </h1>

        <div
          className="mx-auto mb-7 flex min-h-12 max-w-fit items-center justify-center rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-center text-sm font-medium text-slate-400 shadow-lg shadow-black/10 sm:text-base"
          aria-label="Typing headline translation"
        >
          <span className="mr-2 hidden text-slate-500 sm:inline">JODO:</span>
          <span className="inline-flex min-w-[16ch] justify-center text-transparent [background-image:linear-gradient(135deg,#c7d2fe_0%,#818cf8_100%)] bg-clip-text sm:min-w-[27ch]">
            {typedText}
            <span className="ml-1 inline-block h-[0.78em] w-[2px] translate-y-[0.08em] animate-pulse rounded-full bg-[#6366f1]" />
          </span>
        </div>

        <p className="mx-auto mb-4 max-w-3xl text-center text-xl font-light leading-8 text-slate-300 md:text-2xl md:leading-9">
          Automate WhatsApp, Instagram, payments, and GST workflows without
          coding.
        </p>

        <p className="mx-auto mb-10 max-w-2xl text-center text-base leading-7 text-slate-500">
          Built for D2C brands, shops, and local service businesses that need
          instant execution, not another complex ops tool.
        </p>

        <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/assistant"
            prefetch
            className="group inline-flex min-h-14 items-center justify-center rounded-xl bg-[#6366f1] px-8 py-4 text-base font-medium text-white shadow-lg shadow-[#6366f1]/20 transition-all hover:bg-[#5558e3] hover:shadow-[#6366f1]/35"
          >
            <span className="flex items-center gap-2">
              Find my automation
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          <a
            href="#live-demo"
            className="inline-flex min-h-14 items-center justify-center rounded-xl border border-white/10 px-8 py-4 text-base font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.03] hover:text-white"
          >
            Watch demo
          </a>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 text-sm text-slate-500 sm:flex-row sm:gap-6">
          <span className="flex items-center gap-2">
            <Users className="size-4" />
            1,000+ businesses
          </span>
          <span className="hidden size-1 rounded-full bg-slate-700 sm:block" />
          <span className="flex items-center gap-2">
            <Zap className="size-4" />
            50K+ automations
          </span>
        </div>
      </div>
    </section>
  );
}

function AssistantTeaser() {
  const cards = [
    {
      title: "Tell us your business",
      body: "D2C, service, e-commerce or agency. No app directory hunting.",
    },
    {
      title: "Get the right workflow",
      body: "We recommend the best WhatsApp, Razorpay, GST or Sheets flow.",
    },
    {
      title: "Launch with a test run",
      body: "Connect accounts, run sample data and activate after success.",
    },
  ];

  return (
    <section className="px-6 pb-14 pt-2">
      <div className="container mx-auto">
        <div className="mx-auto max-w-5xl rounded-3xl border border-[#6366f1]/20 bg-[#1a1f2e] p-5 shadow-2xl shadow-[#6366f1]/10 md:p-6">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#6366f1]/10 px-3 py-1 text-xs font-semibold text-[#c7d2fe]">
                <Sparkles className="size-4" />
                New assistant layer
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                Stop browsing templates. Let JODO choose the workflow.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-400 md:text-base">
                Zapier starts with apps. JODO starts with your Indian
                business problem: payments, WhatsApp replies, Instagram leads,
                missed calls, GST invoices and order sheets.
              </p>
              <Link
                href="/assistant"
                prefetch
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#6366f1] px-5 text-sm font-semibold text-white transition hover:bg-[#5558e3]"
              >
                Open automation assistant
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {cards.map((card, index) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
                >
                  <div className="mb-3 flex size-8 items-center justify-center rounded-full bg-[#6366f1]/15 text-sm font-bold text-[#c7d2fe]">
                    {index + 1}
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {card.title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveDemo() {
  const steps = useMemo(
    () => [
      {
        icon: IndianRupee,
        title: "Customer pays Rs 1,499",
        subtitle: "Razorpay payment captured",
      },
      {
        icon: ReceiptText,
        title: "GST invoice created",
        subtitle: "Zoho Books",
      },
      {
        icon: MessageCircle,
        title: "WhatsApp sent to customer",
        subtitle: "With invoice PDF attached",
      },
    ],
    [],
  );
  const [stage, setStage] = useState(0);
  const activeStep = stage < steps.length ? stage : null;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStage((current) => (current + 1) % (steps.length + 1));
    }, 1600);

    return () => window.clearInterval(interval);
  }, [steps.length]);

  return (
    <section id="live-demo" className="relative pb-20 pt-8 md:pb-24 md:pt-12">
      <div className="container mx-auto px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            See it in action
          </h2>
          <p className="text-xl text-slate-400">
            Watch how one payment triggers the entire workflow.
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-white/10 bg-[#1a1f2e] p-5 md:p-8">
            <div className="space-y-3">
              {steps.map((item, index) => {
                const Icon = item.icon;
                const completed = index < stage;
                const isActive = activeStep === index;

                return (
                  <div
                    key={item.title}
                    className={cn(
                      "rounded-xl border p-5 transition-all duration-500 md:p-6",
                      isActive
                        ? "border-[#6366f1]/30 bg-[#6366f1]/10"
                        : "border-white/[0.06] bg-white/[0.035]",
                      completed && !isActive && "border-[#6366f1]/20",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-200">
                        <Icon className="size-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-white">
                          {item.title}
                        </div>
                        <div className="mt-1 text-sm text-slate-400">
                          {item.subtitle}
                        </div>
                      </div>
                      {completed ? (
                        <motion.div
                          initial={{ scale: 0.72, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#6366f1] text-white"
                        >
                          <Check className="size-4" />
                        </motion.div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TemplateCard({ template }: { template: Template }) {
  return (
    <Link
      href={template.href}
      prefetch
      className="group relative block h-full focus:outline-none"
      aria-label={`Use ${template.title} template`}
    >
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#6366f1]/20 to-transparent opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex h-full flex-col rounded-2xl border border-white/[0.06] bg-[#1a1f2e] p-6 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/10 group-hover:bg-[#1d2333] group-focus-visible:border-[#6366f1]/70 group-focus-visible:ring-2 group-focus-visible:ring-[#6366f1]/30 md:p-8">
        <div className="mb-6">
          <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-sm font-semibold text-white">
            {template.icon}
          </div>
        </div>

        <h3 className="mb-3 text-xl font-semibold text-white">
          {template.title}
        </h3>
        <p className="mb-6 flex-1 text-sm leading-7 text-slate-400">
          {template.description}
        </p>

        <div className="mb-6 flex items-center gap-3 text-xs text-slate-500">
          <span>{template.usageCount} users</span>
          <span>|</span>
          <span>2 min setup</span>
        </div>

        <span
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-sm font-medium text-slate-300 transition-all group-hover:border-white/20 group-hover:bg-white/10 group-hover:text-white"
        >
          Use template
        </span>
      </div>
    </Link>
  );
}

function TemplatesSection() {
  return (
    <section id="templates" className="relative py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="max-w-2xl text-4xl font-bold tracking-tight text-white md:text-5xl">
              Start with workflows Indian teams already use.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-400">
              Prebuilt flows for payments, DMs, WhatsApp follow-ups, invoices,
              sheets, and missed calls.
            </p>
          </div>
          <Link
            href="/templates"
            prefetch
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 px-4 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.03] hover:text-white"
          >
            Browse all templates
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard key={template.title} template={template} />
          ))}
        </div>
      </div>
    </section>
  );
}

function IntegrationsStrip() {
  const items = [
    { icon: IndianRupee, label: "Razorpay" },
    { icon: MessageCircle, label: "WhatsApp" },
    { icon: ReceiptText, label: "Zoho Books" },
    { icon: PhoneMissed, label: "Exotel" },
  ];

  return (
    <section id="integrations" className="border-y border-white/[0.06] py-12">
      <div className="container mx-auto px-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4"
              >
                <Icon className="size-5 text-[#6366f1]" />
                <span className="text-sm font-medium text-slate-300">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ComparisonTable() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            Why switch from Zapier?
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-400">
            A simpler automation layer for the Indian tools your business
            already runs on.
          </p>
        </div>

        <div className="mx-auto grid max-w-2xl gap-3 md:hidden">
          {comparisonRows.map((feature) => (
            <div
              key={feature.name}
              className={cn(
                "rounded-2xl border border-white/[0.06] bg-[#1a1f2e] p-4",
                feature.highlight && "border-[#6366f1]/20 bg-[#6366f1]/[0.06]",
              )}
            >
              <div className="text-sm font-semibold text-white">
                {feature.name}
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-3">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#c7d2fe]">
                    JODO
                  </div>
                  <div className="mt-1 break-words text-sm font-semibold text-[#c7d2fe]">
                    {feature.ours}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    Zapier
                  </div>
                  <div className="mt-1 break-words text-sm text-slate-400">
                    {feature.zapier}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto hidden max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#1a1f2e] md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="p-5 text-sm font-medium text-slate-500">
                    Feature
                  </th>
                  <th className="p-5 text-center text-sm font-semibold text-white">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#6366f1]/10 px-3 py-1.5 text-[#c7d2fe]">
                      <Sparkles className="size-4" />
                      JODO
                    </span>
                  </th>
                  <th className="p-5 text-center text-sm font-medium text-slate-500">
                    Zapier
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((feature) => (
                  <tr
                    key={feature.name}
                    className={cn(
                      "border-b border-white/[0.05] last:border-b-0",
                      feature.highlight && "bg-[#6366f1]/[0.035]",
                    )}
                  >
                    <td className="p-5 text-sm font-medium text-white md:text-base">
                      {feature.name}
                    </td>
                    <td className="p-5 text-center text-sm font-semibold text-[#c7d2fe] md:text-base">
                      {feature.ours}
                    </td>
                    <td className="p-5 text-center text-sm text-slate-500 md:text-base">
                      {feature.zapier}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-6 pb-24 pt-4">
      <div className="container mx-auto">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-[#1a1f2e] p-8 text-center md:p-12">
          <h2 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight text-white md:text-5xl">
            Run your first automation before your next order arrives.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">
            Pick a template, connect Razorpay or WhatsApp, and ship your first
            live workflow in minutes.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/signin"
              prefetch
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#6366f1] px-6 text-sm font-medium text-white transition hover:bg-[#5558e3]"
            >
              Start free
            </Link>
            <Link
              href="/templates"
              prefetch
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 px-6 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.03] hover:text-white"
            >
              View templates
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PremiumHomepage() {
  return (
    <main
      data-homepage
      className="min-h-screen overflow-x-hidden bg-[#0f1419] text-white selection:bg-[#6366f1] selection:text-white"
    >
      <Header />
      <Hero />
      <AssistantTeaser />
      <LiveDemo />
      <TemplatesSection />
      <IntegrationsStrip />
      <ComparisonTable />
      <FinalCta />
    </main>
  );
}
