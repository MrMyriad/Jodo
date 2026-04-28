"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const businessTypes = ["D2C", "Services", "Agency", "Other"] as const;
const automationGoals = [
  "Instagram leads",
  "WhatsApp notifications",
  "Payment tracking",
  "Order management",
] as const;
const firstConnections = ["WhatsApp Business", "Google Sheets"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [connection, setConnection] = useState<string | null>(null);

  const canProceed = useMemo(() => {
    if (step === 1) return Boolean(businessType);
    if (step === 2) return Boolean(goal);
    if (step === 3) return Boolean(connection);
    return false;
  }, [step, businessType, goal, connection]);

  const handleContinue = () => {
    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }

    const searchParams = useSearchParams();
    const templateKey = searchParams?.get("template");
    if (templateKey) {
      // map underscore template keys to hyphenated page slugs
      const slug = templateKey.replace(/_/g, "-");
      router.push(`/templates/${encodeURIComponent(slug)}?fromOnboarding=1`);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 md:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Welcome to AutomateDesi</h1>
        <p className="text-muted-foreground">
          Complete your 3-step setup. It takes less than two minutes.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Step {step} of 3</CardTitle>
          <CardDescription>
            {step === 1 && "What business do you run?"}
            {step === 2 && "What do you want to automate first?"}
            {step === 3 && "Connect your first account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {step === 1 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {businessTypes.map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={businessType === item ? "default" : "outline"}
                  onClick={() => setBusinessType(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {automationGoals.map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={goal === item ? "default" : "outline"}
                  onClick={() => setGoal(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {firstConnections.map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={connection === item ? "default" : "outline"}
                  onClick={() => setConnection(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          ) : null}

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((current) => Math.max(1, current - 1))}
              disabled={step === 1}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleContinue}
              disabled={!canProceed}
            >
              {step === 3 ? "Finish Setup" : "Continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
