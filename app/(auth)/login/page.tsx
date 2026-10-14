import Link from "next/link";
import { Suspense } from "react";
import { login } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const fields = [
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
] as const;

// searchParams = data request: dibaca di dalam <Suspense> (Cache Components).
async function LoginForm({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { error } = await searchParams;
  return (
    <AuthForm
      action={login}
      submitLabel="Masuk"
      fields={[...fields]}
      initialError={error === "link" ? "Link tidak valid atau sudah kedaluwarsa." : undefined}
    />
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Masuk</CardTitle>
        <CardDescription>Commission Tracker</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<AuthForm action={login} submitLabel="Masuk" fields={[...fields]} />}>
          <LoginForm searchParams={searchParams} />
        </Suspense>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <Link href="/forgot-password" className="text-muted-foreground underline underline-offset-4">
          Lupa password?
        </Link>
        <p className="text-muted-foreground">
          Belum punya akun?{" "}
          <Link href="/signup" className="text-foreground underline underline-offset-4">
            Daftar gratis
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
