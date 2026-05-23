import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const workspace = process.cwd();
const runtimeDir = join(workspace, ".codex", "runtime");
const lockPath = join(runtimeDir, "next-dev.json");
const nextDir = join(workspace, ".next");

function pidIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readActiveLock() {
  if (!existsSync(lockPath)) {
    return null;
  }

  try {
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    if (lock.cwd === workspace && pidIsAlive(lock.pid)) {
      return lock;
    }
  } catch {
    // Bad lock files should not block development startup.
  }

  rmSync(lockPath, { force: true });
  return null;
}

function removeNextCache() {
  const resolvedNext = resolve(nextDir);
  const resolvedWorkspace = resolve(workspace);

  if (!resolvedNext.startsWith(resolvedWorkspace)) {
    throw new Error(`Refusing to remove cache outside workspace: ${resolvedNext}`);
  }

  rmSync(resolvedNext, { recursive: true, force: true });
}

const existing = readActiveLock();
if (existing) {
  console.error(
    `A JODO dev server is already running on PID ${existing.pid}. Stop it before starting another one so Next.js CSS chunks do not go stale.`,
  );
  process.exit(1);
}

mkdirSync(dirname(lockPath), { recursive: true });
removeNextCache();

const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  cwd: workspace,
  env: process.env,
  stdio: "inherit",
});

writeFileSync(
  lockPath,
  JSON.stringify(
    {
      cwd: workspace,
      pid: child.pid,
      startedAt: new Date().toISOString(),
      command: `next dev ${process.argv.slice(2).join(" ")}`.trim(),
    },
    null,
    2,
  ),
);

function cleanup() {
  rmSync(lockPath, { force: true });
}

child.on("exit", (code, signal) => {
  cleanup();
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
    cleanup();
  });
}
