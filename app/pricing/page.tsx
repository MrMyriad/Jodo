import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles, Zap } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AuthNav } from "@/components/layout/auth-nav";
import { cn } from "@/lib/utils";

type Plan = {
  name: "FREE" | "PRO" | "BUSINESS";
  price: string;
  period: string;
  cta: string;
  href: string;
  highlighted?: boolean;
  badge?: string;
  features: string[];
};

const plans: Plan[] = [
  {
    name: "FREE",
    price: "Rs 0",
    period: "forever",
    cta: "Start free",
    href: "/auth/signin",
    features: [
      "500 tasks/month",
      "Multi-step workflows",
      "All Indian integrations",
      "10 pre-built templates",
      "Email support",
    ],
  },
  {
    name: "PRO",
    price: "Rs 299",
    period: "/month",
    cta: "Start 14-day trial",
    href: "/auth/signin",
    highlighted: true,
    badge: "Most popular",
    features: [
      "10,000 tasks/month",
      "Everything in FREE",
      "WhatsApp Business API support",
      "50+ templates",
      "Priority support",
      "Custom integrations",
    ],
  },
  {
    name: "BUSINESS",
    price: "Rs 999",
    period: "/month",
    cta: "Contact sales",
    href: "/settings",
    features: [
      "Unlimited tasks",
      "Everything in PRO",
      "Dedicated account manager",
      "Custom workflow development",
      "SLA guarantee",
      "Team collaboration",
    ],
  },
];

const faqs = [
  {
    question: "What counts as a task?",
    answer:
      "Every action step counts as one task. Example: create invoice plus send WhatsApp message equals 2 tasks.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. You can cancel from settings anytime and continue until your billing cycle ends.",
  },
  {
    question: "Do you support Indian integrations?",
    answer:
      "Yes. JODO is optimized for Razorpay, WhatsApp Business, Zoho Books, Exotel, and Indian small business workflows.",
  },
];

function PricingHeader() {
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
          <Link href="/#templates" prefetch className="text-slate-400 transition hover:text-white">
            Templates
          </Link>
          <Link href="/#integrations" prefetch className="text-slate-400 transition hover:text-white">
            Integrations
          </Link>
          <Link href="/pricing" prefetch={false} className="text-white">
            Pricing
          </Link>
        </div>

        <AuthNav />
      </div>
    </nav>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-2xl border bg-[#1a1f2e] p-6 transition-all duration-300 md:p-8",
        plan.highlighted
          ? "border-[#6366f1]/60 shadow-2xl shadow-[#6366f1]/10"
          : "border-white/[0.06]",
      )}
    >
      {plan.highlighted ? (
        <div className="absolute -inset-px -z-10 rounded-2xl bg-[#6366f1]/25 blur-xl" />
      ) : null}

      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">{plan.name}</h2>
          <div className="mt-5">
            <span className="text-4xl font-bold tracking-tight text-white">
              {plan.price}
            </span>
            <span className="ml-2 text-sm text-slate-400">{plan.period}</span>
          </div>
        </div>

        {plan.badge ? (
          <span className="rounded-full bg-[#6366f1]/10 px-3 py-1 text-xs font-semibold text-[#c7d2fe]">
            {plan.badge}
          </span>
        ) : null}
      </div>

      <ul className="mb-8 space-y-3 text-sm text-slate-300">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#6366f1]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={plan.href}
        prefetch
        className={cn(
          "mt-auto inline-flex min-h-11 w-full items-center justify-center rounded-lg text-sm font-medium transition-all",
          plan.highlighted
            ? "bg-[#6366f1] text-white shadow-lg shadow-[#6366f1]/20 hover:bg-[#5558e3]"
            : "border border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white",
        )}
      >
        {plan.cta}
      </Link>
    </article>
  );
}

export default function PricingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0f1419] text-white">
      <PricingHeader />

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

        <div className="container relative mx-auto px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-slate-300">
              <Sparkles className="size-4 text-[#6366f1]" />
              Built for Indian SMB teams
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400 md:text-xl">
              Start free. Upgrade when you are ready. Cancel anytime.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 pt-4 md:pt-8">
        <div className="container mx-auto">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-white md:text-4xl">
              Frequently asked questions
            </h2>

            <Accordion
              type="single"
              collapsible
              className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#1a1f2e]"
            >
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={faq.question}
                  value={`item-${index}`}
                  className="border-white/[0.06] px-5 last:border-b-0"
                >
                  <AccordionTrigger className="text-sm font-medium text-white hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="leading-7 text-slate-400">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-10 flex justify-center">
              <Link
                href="/auth/signin"
                prefetch
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#6366f1] px-6 text-sm font-medium text-white shadow-lg shadow-[#6366f1]/20 transition hover:bg-[#5558e3]"
              >
                Start free
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
