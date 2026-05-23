"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  IndianRupee,
  ListChecks,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import {
  assistantDefaultInput,
  automationGoalOptions,
  businessTypeOptions,
  getAutomationRecommendation,
  monthlyVolumeOptions,
  type AssistantInput,
  type AssistantOption,
} from "@/lib/automation-assistant";
import { cn } from "@/lib/utils";

type OptionGridProps<T extends string> = {
  title: string;
  value: T;
  options: AssistantOption<T>[];
  onChange: (value: T) => void;
};

function OptionGrid<T extends string>({
  title,
  value,
  options,
  onChange,
}: OptionGridProps<T>) {
  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {title}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = option.id === value;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all",
                "hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.04]",
                selected
                  ? "border-[#6366f1]/60 bg-[#6366f1]/10 shadow-lg shadow-[#6366f1]/10"
                  : "border-white/[0.06] bg-white/[0.025]",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">
                    {option.label}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {option.description}
                  </p>
                </div>
                {selected ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#818cf8]" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
      <Icon className="mb-3 size-5 text-[#818cf8]" />
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold leading-6 text-white">
        {value}
      </div>
    </div>
  );
}

export function AutomationAssistant() {
  const [input, setInput] = useState<AssistantInput>(assistantDefaultInput);
  const recommendation = useMemo(
    () => getAutomationRecommendation(input),
    [input],
  );

  return (
    <section className="relative overflow-hidden bg-[#0f1419] text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-[#6366f1]/10 via-transparent to-transparent" />
      <div
        className="absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="container relative mx-auto px-6 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-slate-300">
            <Sparkles className="size-4 text-[#818cf8]" />
            Indian Business Automation Assistant
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">
            Tell us your business. We will choose the automation.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-400 md:text-xl">
            Instead of making you browse thousands of apps, JODO
            recommends the fastest workflow for WhatsApp, Razorpay, GST,
            Instagram, calls and Sheets.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-white/10 bg-[#151b28] p-5 shadow-2xl shadow-black/20 md:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#6366f1]">
                <Workflow className="size-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-white">
                  Business context
                </div>
                <div className="text-sm text-slate-500">
                  Three choices. One recommended automation.
                </div>
              </div>
            </div>

            <div className="space-y-7">
              <OptionGrid
                title="What do you run?"
                value={input.businessType}
                options={businessTypeOptions}
                onChange={(businessType) =>
                  setInput((current) => ({ ...current, businessType }))
                }
              />
              <OptionGrid
                title="Biggest bottleneck"
                value={input.goal}
                options={automationGoalOptions}
                onChange={(goal) =>
                  setInput((current) => ({ ...current, goal }))
                }
              />
              <OptionGrid
                title="Monthly volume"
                value={input.volume}
                options={monthlyVolumeOptions}
                onChange={(volume) =>
                  setInput((current) => ({ ...current, volume }))
                }
              />
            </div>
          </div>

          <div className="rounded-3xl border border-[#6366f1]/25 bg-[#1a1f2e] p-5 shadow-2xl shadow-[#6366f1]/10 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#6366f1]/10 px-3 py-1 text-xs font-semibold text-[#c7d2fe]">
                  <ShieldCheck className="size-4" />
                  {recommendation.confidence} confidence recommendation
                </div>
                <h2 className="text-2xl font-bold leading-tight text-white md:text-3xl">
                  {recommendation.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-400 md:text-base">
                  {recommendation.subtitle}
                </p>
              </div>
              <Link
                href={recommendation.templateHref}
                prefetch
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#6366f1] px-5 text-sm font-semibold text-white transition hover:bg-[#5558e3]"
              >
                Build this
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <MetricCard
                icon={Clock3}
                label="Setup"
                value={recommendation.setupTime}
              />
              <MetricCard
                icon={IndianRupee}
                label="Impact"
                value={recommendation.monthlyImpact}
              />
              <MetricCard
                icon={Zap}
                label="Usage"
                value={recommendation.taskEstimate}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                <ListChecks className="size-4 text-[#818cf8]" />
                Recommended workflow
              </div>
              <div className="space-y-3">
                {recommendation.workflow.map((step, index) => (
                  <div key={step.label} className="flex gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#6366f1]/15 text-xs font-bold text-[#c7d2fe]">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {step.label}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-slate-400">
                        {step.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
                <div className="mb-4 text-sm font-semibold text-white">
                  Required integrations
                </div>
                <div className="flex flex-wrap gap-2">
                  {recommendation.requiredIntegrations.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                  <MessageCircle className="size-4 text-[#818cf8]" />
                  Message preview
                </div>
                <p className="text-sm leading-6 text-slate-400">
                  {recommendation.messagePreview}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/[0.06] bg-[#101622] p-5">
              <div className="mb-4 text-sm font-semibold text-white">
                Why this can beat Zapier for this workflow
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {recommendation.zapierGap.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-sm leading-6 text-slate-400"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#6366f1]/20 bg-[#6366f1]/[0.06] p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  Next best action
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Launch the template, connect accounts, run one test event,
                  then activate only after the first successful run.
                </p>
              </div>
              <Link
                href={recommendation.templateHref}
                prefetch
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
              >
                Start guided setup
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
