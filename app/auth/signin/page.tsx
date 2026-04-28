import { AuthForm } from "@/components/auth/auth-form";

type SignInPageProps = {
  searchParams?: {
    callbackUrl?: string;
  };
};

export default function SignInPage({ searchParams }: SignInPageProps) {
  const callbackUrl = searchParams?.callbackUrl ?? "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <AuthForm mode="signin" callbackUrl={callbackUrl} />
    </main>
  );
}
