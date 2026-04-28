import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VerifyRequestPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription>
            We sent a secure magic link. Open it on this device to finish
            signing in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            If you don&apos;t see the message, check spam or retry from the sign
            in page.
          </p>
          <Link
            href="/auth/signin"
            className="text-sm text-primary-600 hover:underline"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
