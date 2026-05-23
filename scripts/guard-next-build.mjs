import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const workspace = process.cwd();
const lockPath = join(workspace, ".codex", "runtime", "next-dev.json");

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

if (!existsSync(lockPath)) {
  process.exit(0);
}

try {
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  if (lock.cwd === workspace && pidIsAlive(lock.pid)) {
    console.error(
      [
        "Refusing to run `next build` while `next dev` is active.",
        `Active dev PID: ${lock.pid}`,
        "Stop the dev server first, then run `npm run build`.",
        "This protects JODO from stale CSS/JS chunks and raw unstyled HTML in the browser.",
      ].join("\n"),
    );
    process.exit(1);
  }
} catch {
  // Invalid lock file, clean it below.
}

rmSync(lockPath, { force: true });
