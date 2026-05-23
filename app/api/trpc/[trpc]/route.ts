import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/lib/trpc/context";
import { appRouter } from "@/lib/trpc/router";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ error, path }) {
      if (process.env.NODE_ENV !== "production") {
        console.error(`[tRPC] ${path ?? "<unknown>"}: ${error.message}`);
      }
    },
  });

export { handler as GET, handler as POST };
