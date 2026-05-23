# Production Deployment and Recovery Runbook

## Required runtime layout

- Vercel runs the Next.js app and API routes.
- A separate always-on worker must run `npm run worker:workflow` for BullMQ jobs.
- Redis must be a socket URL (`redis://` or `rediss://`), not only an Upstash REST URL.
- `npm run build` refuses to run while `npm run dev` is active to prevent stale Next.js CSS/JS chunks.

## Pre-deploy checks

```bash
npm run type-check
npm run lint
npm run build
npm run audit:stack
```

Run strict audit only when all production credentials are present:

```bash
npm run audit:stack -- --strict
```

## Health checks

- App readiness: `GET /api/health`
- Healthy: HTTP 200
- Degraded because credentials/worker are missing: HTTP 207
- Failed configured dependency: HTTP 503

## Worker recovery

1. Check worker heartbeat in `/api/health`.
2. Start or restart the worker:

```bash
npm run worker:workflow
```

3. Inspect failed executions and dead-letter queue:

```bash
npm run recovery:inspect
```

4. Replay a failed execution:

```bash
npm run recovery:replay -- <execution_id>
```

## Database recovery

Create a backup with `pg_dump` using `DIRECT_URL`:

```bash
pg_dump "$DIRECT_URL" --format=custom --file=jodo-backup.dump
```

Restore to a clean database:

```bash
pg_restore --clean --if-exists --dbname="$DIRECT_URL" jodo-backup.dump
npm run db:push
```

## RLS policy rollout

`prisma/rls.sql` is provided as a production template. Apply it only after the app sets `app.current_user_id` for every DB request or after moving direct user reads/writes to Supabase Auth-aware clients. Until then, API ownership checks remain the active permission boundary.

## Incident checklist

- Confirm `/api/health` status and failed checks.
- Check Vercel function logs for API errors.
- Check worker logs for retry/dead-letter entries.
- Run `npm run recovery:inspect`.
- Replay only idempotent failed executions after confirming downstream side effects.
