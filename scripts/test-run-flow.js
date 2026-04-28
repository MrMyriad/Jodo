// scripts/test-run-flow.js
// Lightweight automated test for workflow test-run flows.
// Run: node scripts/test-run-flow.js

const base = process.env.BASE || "http://localhost:3000";
const email = process.env.EMAIL || "dev+test@example.com";
const { PrismaClient } = require("@prisma/client");

function mergeSetCookie(raw, jar) {
  if (!raw) return jar;
  // split on commas that start a new cookie (approximate)
  const parts = raw.split(/,(?=\s*[^;]+=)/g);
  for (const p of parts) {
    const kv = (p.split(";")[0] || "").trim();
    if (!kv) continue;
    const eq = kv.indexOf("=");
    if (eq < 0) continue;
    const name = kv.slice(0, eq);
    const value = kv.slice(eq + 1);
    const items = jar ? jar.split("; ").filter(Boolean) : [];
    const filtered = items.filter((i) => !i.startsWith(name + "="));
    filtered.push(`${name}=${value}`);
    jar = filtered.join("; ");
  }
  return jar;
}

async function signInDev() {
  let cookieJar = "";

  // GET CSRF
  const r = await fetch(`${base}/api/auth/csrf`, { method: "GET" });
  if (!r.ok) throw new Error(`GET /api/auth/csrf failed: ${r.status}`);
  const csrfJson = await r.json();
  cookieJar = mergeSetCookie(r.headers.get("set-cookie"), cookieJar);

  // POST credentials
  const params = new URLSearchParams();
  params.append("csrfToken", csrfJson.csrfToken);
  params.append("email", email);
  params.append("callbackUrl", base + "/");

  let post = await fetch(`${base}/api/auth/callback/dev-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      cookie: cookieJar,
    },
    body: params.toString(),
    redirect: "manual",
  });

  cookieJar = mergeSetCookie(post.headers.get("set-cookie"), cookieJar);

  if (post.status >= 300 && post.headers.get("location")) {
    const loc = new URL(post.headers.get("location"), base).toString();
    const r2 = await fetch(loc, { method: "GET", headers: { cookie: cookieJar } });
    cookieJar = mergeSetCookie(r2.headers.get("set-cookie"), cookieJar);
  }

  // verify session
  const s = await fetch(`${base}/api/auth/session`, { method: "GET", headers: { cookie: cookieJar } });
  if (!s.ok) throw new Error(`GET /api/auth/session failed: ${s.status}`);
  const sjson = await s.json();
  if (!sjson.user || !sjson.user.email) {
    throw new Error(`Sign-in failed, session missing user: ${JSON.stringify(sjson)}`);
  }

  return cookieJar;
}

async function createWorkflow(cookieJar, steps) {
  const wf = {
    name: `Automated Test Workflow ${Date.now()}`,
    trigger: { type: "manual_test" },
    steps,
    isActive: true,
  };

  const r = await fetch(`${base}/api/workflows`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookieJar },
    body: JSON.stringify(wf),
  });

  if (r.status !== 201) {
    const txt = await r.text();
    throw new Error(`Failed to create workflow: ${r.status} ${txt}`);
  }

  const j = await r.json();
  if (!j.workflow || !j.workflow.id) throw new Error(`Unexpected create workflow response: ${JSON.stringify(j)}`);
  return { id: j.workflow.id, expectedSteps: steps.length };
}

async function triggerTest(cookieJar, workflowId) {
  const r = await fetch(`${base}/api/workflows/${workflowId}/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookieJar },
  });

  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Failed to start test: ${r.status} ${txt}`);
  }

  const j = await r.json();
  const execId = j.execution?.id;
  if (!execId) throw new Error(`No execution id returned: ${JSON.stringify(j)}`);
  return execId;
}

async function pollExecution(cookieJar, executionId, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await fetch(`${base}/api/executions/${executionId}`, { method: "GET", headers: { cookie: cookieJar } });
    if (!r.ok) {
      await new Promise((res) => setTimeout(res, 1000));
      continue;
    }
    const j = await r.json();
    const exe = j.execution;
    if (!exe) {
      await new Promise((res) => setTimeout(res, 1000));
      continue;
    }
    const status = String(exe.status || "").toUpperCase();
    if (status === "SUCCESS" || status === "FAILED") return exe;
    await new Promise((res) => setTimeout(res, 1000));
  }
  throw new Error("Timed out waiting for execution to complete");
}

async function assertStepResultsInDb(executionId, expectedSteps) {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const ex = await prisma.execution.findUnique({ where: { id: executionId } });
    if (!ex) throw new Error("Execution not found in DB");
    const stepResults = ex.stepResults || [];
    if (!Array.isArray(stepResults)) throw new Error("stepResults in DB is not an array");
    if (stepResults.length !== expectedSteps) {
      throw new Error(`Expected ${expectedSteps} stepResults, found ${stepResults.length}`);
    }
    return true;
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupExecutionAndWorkflow(executionId, workflowId) {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    try {
      await prisma.execution.delete({ where: { id: executionId } });
    } catch (e) {
      // ignore
    }
    try {
      await prisma.workflow.delete({ where: { id: workflowId } });
    } catch (e) {
      // ignore
    }
  } finally {
    await prisma.$disconnect();
  }
}

(async () => {
  console.log("Test-run flow script starting...");

  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL not set. This test requires a configured database.");
    process.exit(2);
  }

  try {
    const queueConfigured = Boolean(process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || process.env.UPSTASH_REDIS_REST_URL);
    if (queueConfigured) {
      console.log("Warning: Queue appears configured (REDIS_URL/UPSTASH_*). Ensure a worker is running for queued jobs.");
    }

    const cookieJar = await signInDev();
    console.log("Signed in (cookie jar set).");

    const steps = [
      { type: "delay", config: { seconds: 0 } },
      { type: "delay", config: { seconds: 0 } },
    ];

    const { id: workflowId, expectedSteps } = await createWorkflow(cookieJar, steps);
    console.log("Workflow created:", workflowId, `(expectedSteps=${expectedSteps})`);

    const executionId = await triggerTest(cookieJar, workflowId);
    console.log("Execution started:", executionId);

    const exe = await pollExecution(cookieJar, executionId, 120000);
    console.log("Execution completed with status:", exe.status);

    if (String(exe.status).toUpperCase() !== "SUCCESS") {
      console.error("FAIL: execution did not succeed", exe);
      process.exit(1);
    }

    // DB assertion
    await assertStepResultsInDb(executionId, expectedSteps);

    console.log("PASS: execution succeeded and stepResults stored in DB");

    // cleanup created records to keep test environment tidy
    try {
      await cleanupExecutionAndWorkflow(executionId, workflowId);
      console.log("Cleaned up test execution and workflow.");
    } catch (e) {
      console.warn("Cleanup failed:", e && e.message ? e.message : e);
    }

    process.exit(0);
  } catch (err) {
    console.error("FAIL:", err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
