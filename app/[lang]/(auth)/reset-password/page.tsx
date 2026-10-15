import { resetPassword } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { getDict } from "@/lib/i18n/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Butuh sesi dari link reset (proxy mewajibkan login).
export default async function ResetPasswordPage() {
  const { t } = await getDict();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.auth.resetTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <AuthForm
          action={resetPassword}
          submitLabel={t.auth.savePassword}
          fields={[
            { name: "password", label: t.auth.newPassword, type: "password", autoComplete: "new-password" },
            { name: "confirm", label: t.auth.repeatPassword, type: "password", autoComplete: "new-password" },
          ]}
        />
      </CardContent>
    </Card>
  );
}
