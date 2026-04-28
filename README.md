# AutomateDesi

AutomateDesi is a Zapier alternative focused on Indian businesses with workflows around WhatsApp, Razorpay, Instagram, and Google Sheets.

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
- `npm run lint` - lint checks
- `npm run type-check` - TypeScript checks
- `npm run db:push` - push schema to DB
- `npm run db:seed` - run seed script

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
