import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LiveAutomationDemo } from "@/components/live-automation-demo";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-16 md:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
            AutomateDesi • Zapier for Indian businesses
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
            Instant automations for WhatsApp + Razorpay + GST
          </h1>
          <p className="max-w-2xl text-lg text-slate-600 md:text-xl">
            1/10th Zapier’s price. 10x simpler. Built for D2C, services, and
            local businesses in India.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/templates" className={buttonVariants({ size: "lg" })}>
              Use a template
            </Link>
            <Link
              href="/auth/signin"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Sign in
            </Link>
          </div>
          <p className="text-sm text-slate-500">
            You’re 2 steps away from your first automation.
          </p>
        </div>

        <Card className="mx-auto w-full max-w-3xl shadow-xl">
          <CardHeader>
            <CardTitle>Live demo</CardTitle>
            <CardDescription>
              See how “payment → invoice → WhatsApp” runs instantly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LiveAutomationDemo />
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 md:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Start in 2 minutes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pick a template, connect accounts, go live.
            </p>
          </div>
          <Link
            href="/templates"
            className={buttonVariants({ variant: "outline" })}
          >
            Browse templates
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                💰 Payment → WhatsApp Receipt
              </CardTitle>
              <CardDescription>
                Auto-send receipt when customer pays.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/onboarding?template=razorpay_whatsapp_invoice"
                className={buttonVariants({ className: "w-full" })}
              >
                Use this template
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                📸 Instagram → WhatsApp Follow-up
              </CardTitle>
              <CardDescription>
                Reply to DMs and follow up on WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/onboarding?template=instagram_dm_whatsapp_followup"
                className={buttonVariants({ className: "w-full" })}
              >
                Use this template
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                📞 Missed Call → WhatsApp
              </CardTitle>
              <CardDescription>Never miss a customer again.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/onboarding?template=missed_call_whatsapp"
                className={buttonVariants({ className: "w-full" })}
              >
                Use this template
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
