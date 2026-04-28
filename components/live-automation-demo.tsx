"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type DemoStep = 0 | 1 | 2 | 3;

export function LiveAutomationDemo() {
  const [step, setStep] = useState<DemoStep>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => ((prev + 1) % 4) as DemoStep);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-lg border p-4 transition-colors",
          step >= 0
            ? "border-emerald-300 bg-emerald-50"
            : "border-slate-200 bg-slate-50",
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <p className="font-semibold">Customer pays ₹1,499</p>
            <p className="text-sm text-slate-600">Razorpay payment captured</p>
          </div>
          <CheckCircle2 className="ml-auto size-5 text-emerald-600" />
        </div>
      </div>

      {step >= 1 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-sky-300 bg-sky-50 p-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <div>
              <p className="font-semibold">GST invoice created</p>
              <p className="text-sm text-slate-600">Zoho Books</p>
            </div>
            <CheckCircle2 className="ml-auto size-5 text-sky-600" />
          </div>
        </motion.div>
      ) : null}

      {step >= 2 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-violet-300 bg-violet-50 p-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <p className="font-semibold">WhatsApp receipt sent</p>
              <p className="text-sm text-slate-600">Invoice link included</p>
            </div>
            <CheckCircle2 className="ml-auto size-5 text-violet-600" />
          </div>
        </motion.div>
      ) : null}

      {step >= 3 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-lg border border-emerald-200 bg-white p-4 text-center"
        >
          <p className="text-lg font-semibold text-emerald-700">
            Automation complete
          </p>
          <p className="mt-1 text-sm text-slate-600">
            All this happened in seconds (webhook → instant run)
          </p>
        </motion.div>
      ) : null}
    </div>
  );
}
