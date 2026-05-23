import { Plan } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      plan: Plan;
      language?: string;
    };
  }

  interface User {
    plan: Plan;
    language?: string;
  }
}
