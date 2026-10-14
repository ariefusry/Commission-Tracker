import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar</CardTitle>
        <CardDescription>Gratis untuk semua artist.</CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm
          action={signup}
          submitLabel="Daftar"
          fields={[
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
            { name: "confirm", label: "Ulangi password", type: "password", autoComplete: "new-password" },
          ]}
        />
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        Sudah punya akun?&nbsp;
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Masuk
        </Link>
      </CardFooter>
    </Card>
  );
}
