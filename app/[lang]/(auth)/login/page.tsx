import Link from "next/link";
import { Suspense } from "react";
import { login } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { getDict } from "@/lib/i18n/server";
import type { Dict } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const fields = (t: Dict) => [
  { name: "email", label: t.auth.email, type: "email" as const, autoComplete: "email" },
  { name: "password", label: t.auth.password, type: "password" as const, autoComplete: "current-password" },
];

// searchParams = data request: dibaca di dalam <Suspense> (Cache Components).
async function LoginForm({ searchParams }: { searchParams: PageProps<"/[lang]/login">["searchParams"] }) {
  const [{ error }, { t }] = await Promise.all([searchParams, getDict()]);
  return (
    <AuthForm
      action={login}
      submitLabel={t.auth.login}
      fields={fields(t)}
      initialError={error === "link" ? t.auth.linkInvalid : undefined}
    />
  );
}

export default async function LoginPage({ searchParams }: PageProps<"/[lang]/login">) {
  const { t } = await getDict();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>{t.auth.login}</h1>
        </CardTitle>
        <CardDescription>{t.auth.loginDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<AuthForm action={login} submitLabel={t.auth.login} fields={fields(t)} />}>
          <LoginForm searchParams={searchParams} />
        </Suspense>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <Link href="/forgot-password" className="text-muted-foreground underline underline-offset-4">
          {t.auth.forgot}
        </Link>
        <p className="text-muted-foreground">
          {t.auth.noAccount}{" "}
          <Link href="/signup" className="text-foreground underline underline-offset-4">
            {t.auth.signupFree}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
