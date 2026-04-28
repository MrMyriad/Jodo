import { AuthForm } from "@/components/auth/auth-form";

type SignUpPageProps = {
  searchParams?: {
    callbackUrl?: string;
  };
};

export default function SignUpPage({ searchParams }: SignUpPageProps) {
  const callbackUrl = searchParams?.callbackUrl ?? "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <AuthForm mode="signup" callbackUrl={callbackUrl} />
    </main>
  );
}
