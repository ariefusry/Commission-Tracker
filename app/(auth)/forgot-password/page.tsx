import Link from "next/link";
import { forgotPassword } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lupa password</CardTitle>
        <CardDescription>Kami kirim link untuk membuat password baru.</CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm
          action={forgotPassword}
          submitLabel="Kirim link"
          fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
        />
      </CardContent>
      <CardFooter className="text-sm">
        <Link href="/login" className="text-muted-foreground underline underline-offset-4">
          Kembali ke login
        </Link>
      </CardFooter>
    </Card>
  );
}
