"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

type TelemetryProviderProps = {
  children: React.ReactNode;
};

let initialized = false;

function getPostHogConfig() {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  const apiHost =
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ?? "https://app.posthog.com";

  return {
    apiKey: apiKey && apiKey.length > 0 ? apiKey : null,
    apiHost,
  };
}

export function TelemetryProvider({ children }: TelemetryProviderProps) {
  const pathname = usePathname();
  const { apiKey, apiHost } = useMemo(getPostHogConfig, []);

  useEffect(() => {
    if (!apiKey || initialized) {
      return;
    }

    posthog.init(apiKey, {
      api_host: apiHost,
      person_profiles: "identified_only",
      capture_pageview: false,
      autocapture: true,
    });

    initialized = true;
  }, [apiHost, apiKey]);

  useEffect(() => {
    if (!apiKey || !initialized) {
      return;
    }

    const search =
      typeof window === "undefined" ? "" : window.location.search || "";
    const url = search ? `${pathname}${search}` : pathname;
    posthog.capture("$pageview", {
      $current_url: url,
    });
  }, [apiKey, pathname]);

  if (!apiKey) {
    return <>{children}</>;
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
