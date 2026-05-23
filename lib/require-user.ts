import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizeLanguage } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null | undefined;
  plan: string;
  language: string;
  tasksUsedThisMonth: number;
};

export async function requireUser(): Promise<AuthenticatedUser> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.email) {
    redirect("/auth/signin");
  }

  if (!process.env.DATABASE_URL || session.user.id.startsWith("dev:")) {
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      plan: session.user.plan,
      language: "en",
      tasksUsedThisMonth: 0,
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      language: true,
      tasksUsedThisMonth: true,
    },
  });

  if (!dbUser) {
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      plan: session.user.plan,
      language: "en",
      tasksUsedThisMonth: 0,
    };
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    plan: dbUser.plan,
    language: normalizeLanguage(dbUser.language),
    tasksUsedThisMonth: dbUser.tasksUsedThisMonth,
  };
}
