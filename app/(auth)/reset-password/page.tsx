import { resetPassword } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Butuh sesi dari link reset (proxy mewajibkan login).
export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Password baru</CardTitle>
      </CardHeader>
      <CardContent>
        <AuthForm
          action={resetPassword}
          submitLabel="Simpan password"
          fields={[
            { name: "password", label: "Password baru", type: "password", autoComplete: "new-password" },
            { name: "confirm", label: "Ulangi password", type: "password", autoComplete: "new-password" },
          ]}
        />
      </CardContent>
    </Card>
  );
}
