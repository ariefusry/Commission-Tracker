import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { getDict } from "@/lib/i18n/server";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SignupPage() {
  const { t } = await getDict();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>{t.auth.signup}</h1>
        </CardTitle>
        <CardDescription>{t.auth.signupDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm
          action={signup}
          submitLabel={t.auth.signup}
          fields={[
            { name: "email", label: t.auth.email, type: "email", autoComplete: "email" },
            { name: "password", label: t.auth.password, type: "password", autoComplete: "new-password" },
            { name: "confirm", label: t.auth.repeatPassword, type: "password", autoComplete: "new-password" },
          ]}
        />
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        {t.auth.haveAccount}&nbsp;
        <Link href="/login" className="text-foreground underline underline-offset-4">
          {t.auth.loginLink}
        </Link>
      </CardFooter>
    </Card>
  );
}
