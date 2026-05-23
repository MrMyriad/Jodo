import type { Metadata } from "next";
import Link from "next/link";
import { Zap } from "lucide-react";
import { AutomationAssistant } from "@/components/assistant/automation-assistant";

export const metadata: Metadata = {
  title: "Indian Business Automation Assistant | JODO",
  description:
    "Get a recommended WhatsApp, Razorpay, Instagram, GST or Google Sheets automation for your Indian business.",
};

function AssistantHeader() {
  return (
    <nav className="border-b border-white/[0.06] bg-[#0f1419]/80 text-white backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" prefetch className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#6366f1]">
            <Zap className="size-5 text-white" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            JODO
          </span>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium md:flex">
          <Link href="/assistant" className="text-white">
            Assistant
          </Link>
          <Link
            href="/#templates"
            prefetch
            className="text-slate-400 transition hover:text-white"
          >
            Templates
          </Link>
          <Link
            href="/#integrations"
            prefetch
            className="text-slate-400 transition hover:text-white"
          >
            Integrations
          </Link>
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

export default function AssistantPage() {
  return (
    <main className="min-h-screen bg-[#0f1419]">
      <AssistantHeader />
      <AutomationAssistant />
    </main>
  );
}
