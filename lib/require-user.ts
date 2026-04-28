import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null | undefined;
  plan: string;
};

export async function requireUser(): Promise<AuthenticatedUser> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.email) {
    redirect("/auth/signin");
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    plan: session.user.plan,
  };
}
