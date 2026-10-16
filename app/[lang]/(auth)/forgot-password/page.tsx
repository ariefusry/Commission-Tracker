import Link from "next/link";
import { forgotPassword } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { getDict } from "@/lib/i18n/server";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ForgotPasswordPage() {
  const { t } = await getDict();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>{t.auth.forgotTitle}</h1>
        </CardTitle>
        <CardDescription>{t.auth.forgotDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm
          action={forgotPassword}
          submitLabel={t.auth.sendLink}
          fields={[{ name: "email", label: t.auth.email, type: "email", autoComplete: "email" }]}
        />
      </CardContent>
      <CardFooter className="text-sm">
        <Link href="/login" className="text-muted-foreground underline underline-offset-4">
          {t.auth.backToLogin}
        </Link>
      </CardFooter>
    </Card>
  );
}
