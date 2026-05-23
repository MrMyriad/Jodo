import { getEmailFromAddress, getResendClient } from "@/lib/email/resend-client";

type WelcomeSequenceInput = {
  userId: string;
  email: string;
  name?: string | null;
};

type ScheduledSequenceEmail = {
  key: string;
  subject: string;
  html: string;
  scheduledAt?: string;
};

function addDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}

function safeName(name: string | null | undefined): string {
  if (!name || name.trim().length === 0) {
    return "there";
  }
  return name.trim();
}

function buildWelcomeSequenceEmails(input: WelcomeSequenceInput) {
  const displayName = safeName(input.name);
  const now = new Date();
  const day2 = addDays(now, 2).toISOString();
  const day5 = addDays(now, 5).toISOString();

  const emails: ScheduledSequenceEmail[] = [
    {
      key: "welcome-day0",
      subject: "Welcome to JODO",
      html: `<p>Hi ${displayName}, welcome to JODO.</p>
<p>Your first automation can be live in minutes. Start from a template in your dashboard and connect Razorpay + WhatsApp.</p>`,
    },
    {
      key: "tutorial-day2",
      subject: "Your first automation in 5 minutes",
      scheduledAt: day2,
      html: `<p>Hi ${displayName},</p>
<p>Need help getting started? Use the <strong>Razorpay Payment -&gt; WhatsApp Receipt</strong> template and activate it in under 5 clicks.</p>`,
    },
    {
      key: "upgrade-day5",
      subject: "Ready to unlock more automations?",
      scheduledAt: day5,
      html: `<p>Hi ${displayName},</p>
<p>You are close to maxing out the free tier. Upgrade to Pro to run more tasks and unlock premium templates.</p>`,
    },
  ];

  return emails;
}

async function sendOrScheduleEmail(
  to: string,
  email: ScheduledSequenceEmail,
): Promise<{
  key: string;
  scheduledAt: string | null;
  providerEmailId: string | null;
}> {
  const resend = getResendClient();
  if (!resend) {
    return {
      key: email.key,
      scheduledAt: email.scheduledAt ?? null,
      providerEmailId: null,
    };
  }

  const { data, error } = await resend.emails.send({
    from: getEmailFromAddress(),
    to: [to],
    subject: email.subject,
    html: email.html,
    ...(email.scheduledAt ? { scheduledAt: email.scheduledAt } : {}),
    tags: [
      { name: "sequence", value: "welcome" },
      { name: "sequence_key", value: email.key },
    ],
  });

  if (error) {
    throw new Error(error.message || `Failed sending ${email.key}`);
  }

  return {
    key: email.key,
    scheduledAt: email.scheduledAt ?? null,
    providerEmailId: data?.id ?? null,
  };
}

export async function sendWelcomeSequence(input: WelcomeSequenceInput) {
  const emails = buildWelcomeSequenceEmails(input);
  const results = [];

  for (const email of emails) {
    const delivery = await sendOrScheduleEmail(input.email, email);
    results.push(delivery);
  }

  return {
    userId: input.userId,
    email: input.email,
    deliveries: results,
    provider: getResendClient() ? "resend" : "disabled",
  };
}

