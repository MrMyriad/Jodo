"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-lg rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The issue has been logged. You can retry now.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

