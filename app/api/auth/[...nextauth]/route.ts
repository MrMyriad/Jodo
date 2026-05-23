import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

const handler = NextAuth(authOptions) as (
  req: Request,
  context?: unknown,
) => Promise<Response>;

export async function GET(req: Request, context: unknown) {
  return handler(req, context);
}

export async function POST(req: Request, context: unknown) {
  const limited = await enforceRateLimit(req, rateLimitPolicies.auth);
  if (limited) return limited;
  return handler(req, context);
}
