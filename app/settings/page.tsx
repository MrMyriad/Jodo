import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ReferralCard } from "@/components/settings/referral-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { normalizeLanguage } from "@/lib/i18n";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/require-user";

type SettingsPageProps = {
  searchParams?: {
    integration?: string;
    action?: string;
  };
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const user = await requireUser();
  const highlightedIntegration = searchParams?.integration
    ?.toUpperCase()
    .replaceAll("-", "_");
  const requestedAction = searchParams?.action;

  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="text-muted-foreground">
            Manage profile preferences, billing, and integration setup links.
          </p>
        </section>

        {highlightedIntegration ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle>Integration setup selected</CardTitle>
              <CardDescription>
                Continue setup for{" "}
                <Badge variant="secondary">{highlightedIntegration}</Badge> from
                this page.
              </CardDescription>
              {requestedAction === "connect" ? (
                <Link
                  href="/connections"
                  className={buttonVariants({ size: "sm" })}
                >
                  Open Connection Setup
                </Link>
              ) : null}
            </CardHeader>
          </Card>
        ) : null}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Your account identity and default language settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p>
                <span className="font-medium">Name:</span>{" "}
                {user.name ?? "Not set"}
              </p>
              <p>
                <span className="font-medium">Email:</span> {user.email}
              </p>
              <p>
                <span className="font-medium">Language:</span> English (Hindi UI
                / Hindi)
              </p>
              <p className="text-xs text-muted-foreground">
                Current:{" "}
                {normalizeLanguage(user.language) === "hi"
                  ? "Hindi"
                  : "English"}
                . Use the language switcher in the sidebar.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>Current plan and upgrade path.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm">
                Current plan: <Badge>{user.plan}</Badge>
              </p>
              <p className="text-sm text-muted-foreground">
                Pro plan unlocks unlimited workflows and 10,000 executions/month
                at Rs 299.
              </p>
              <Link
                href="/pricing"
                className={buttonVariants({ size: "sm" })}
              >
                Upgrade to Pro
              </Link>
            </CardContent>
          </Card>

          <ReferralCard />
        </section>
      </div>
    </AppShell>
  );
}
