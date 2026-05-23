# JODO

JODO is a Zapier alternative focused on Indian businesses with workflows around WhatsApp, Razorpay, Instagram, and Google Sheets.

## Current Implementation Status

- Day 1-2 foundation: Next.js 14, Prisma, NextAuth, auth pages, onboarding.
- Day 3-4 UX: dashboard, workflow builder, templates, connections, settings.
- Day 5-7 live path:
  - workflow save API and active workflow creation from builder
  - Razorpay webhook verification + trigger routing
  - automation engine execution + execution logs
- Day 8-10 started:
  - workflow control API (list/update/delete/test)
  - workflow operations UI (`/workflows`) with run test, pause/activate, delete
  - trigger orchestration helper for multi-workflow execution
  - BullMQ queue execution with retries + exponential backoff
  - dead-letter queue policy for exhausted jobs
  - dedicated workflow worker runtime (`npm run worker:workflow`)
  - visual builder route (`/workflows/[id]/builder`) with test polling
  - webhook routes for Razorpay, Instagram, Exotel, WhatsApp, Zoho
  - dashboard analytics with usage charts (Recharts)
  - pricing page (`/pricing`)
  - language preference API + sidebar language switcher
  - tRPC endpoint scaffold (`/api/trpc`)

## Connection Setup (No Manual DB Work)

You can connect these directly from UI at `/connections`:

- WhatsApp Business
- Razorpay
- Google Sheets

Features:

- credential form input
- verification before save
- secure credential encryption at rest
- test existing connection
- enable/disable/remove connection

## JODO GST Desk

JODO GST Desk is a separate vertical module inside the same app for CA-ready GST preparation. It reuses existing auth, Prisma/Postgres, BullMQ/Redis, audit logs, app shell, and rate-limit/security patterns.

Routes:

- `/gst-desk` - GST Desk dashboard
- `/gst-desk/clients` - GST client management and demo workspace creation
- `/gst-desk/periods/[periodId]` - monthly GST period workspace
- `/gst-desk/upload` - document upload and extraction queue entry
- `/gst-desk/review` - low-confidence invoice review and correction
- `/gst-desk/export` - CSV / Excel-compatible export for CA review

What it can do today:

- manage GST clients and monthly GST periods
- track missing sales invoices, purchase bills, credit/debit notes, bank statements, and supporting documents
- store uploaded documents in Supabase Storage when storage env keys are configured
- queue invoice extraction jobs through the existing worker command
- create review-gated extracted invoice rows with audit logs
- let users approve/correct rows before export
- generate WhatsApp/email reminder drafts without sending automatically
- export CA-review CSV and Excel-compatible files

Important MVP limits:

- no direct GSTN filing is implemented in this phase
- OCR/AI extraction is intentionally a provider stub until a real OCR/AI service is configured
- real file upload is blocked gracefully until `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` are set

Feature flags:

- `GST_DESK_ENABLED=true` enables the module
- `GST_EXTRACTION_QUEUE_NAME=gst-invoice-extraction` customizes the extraction queue name

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and fill required values, including
   `REDIS_URL` or `UPSTASH_REDIS_URL` for queue processing.

3. Set a credential encryption key:

```bash
# 32-byte base64 or 64-char hex
CREDENTIALS_ENCRYPTION_KEY=""
```

4. Push Prisma schema:

```bash
npm run db:push
```

5. Run development server:

```bash
npm run dev
```

6. Run workflow worker (separate terminal):

```bash
npm run worker:workflow
```

## Scripts

- `npm run dev` - start local app
- `npm run build` - prisma generate + production build
- `npm run start` - run production server
- `npm run worker:workflow` - run BullMQ workflow worker
- `npm run audit:stack` - run the production stack audit with `PASS / FAIL / BLOCKED` evidence
- `npm run audit:stack -- --strict` - fail on both `FAIL` and `BLOCKED` checks for production readiness gates
- `npm run recovery:inspect` - inspect failed/retrying executions and dead-letter queue state
- `npm run recovery:replay -- <execution_id>` - replay a failed execution through the workflow queue
- `npm run lint` - lint checks
- `npm run type-check` - TypeScript checks
- `npm run db:push` - push schema to DB
- `npm run db:seed` - run seed script

## Production Stack Audit

Run the audit with the app and worker running:

```bash
npm run dev
npm run worker:workflow
npm run audit:stack
```

The audit intentionally uses real services only. Missing external credentials are reported as `BLOCKED`, not as passing mocks. Current hardening covers:

- frontend CSS/chunk guardrails for the JODO homepage and core routes
- protected API/auth checks
- PostgreSQL, Supabase Storage env readiness, Redis queue, and worker heartbeat
- credential encryption, RLS policy inspection, security headers, and rate limiting
- Vercel deployment config, GitHub Actions CI, health endpoint, recovery runbook, and observability envs

For production, use strict mode after all service credentials are configured:

```bash
npm run audit:stack -- --strict
```

Recovery commands and operational steps are documented in `docs/production-recovery.md`.

## Razorpay End-to-End Test

1. Connect Razorpay from `/connections` with key ID, key secret, and webhook secret.
2. Create a workflow in `/workflows/new` with trigger type `razorpay_payment` or `razorpay_refund`.
3. Add actions and save as active.
4. Configure Razorpay webhook URL:

```
https://<your-domain>/api/webhooks/razorpay
```

5. Send `payment.captured` or `refund.created` event from Razorpay test tools.
6. Check execution logs in `/dashboard` and `/dashboard/executions/<id>`.
