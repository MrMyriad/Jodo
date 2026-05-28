import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AuthForm } from "@/components/auth/auth-form";
import { authOptions } from "@/lib/auth";

type SignUpPageProps = {
  searchParams?: {
    callbackUrl?: string;
  };
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const callbackUrl = searchParams?.callbackUrl ?? "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <AuthForm mode="signup" callbackUrl={callbackUrl} />
    </main>
  );
}
