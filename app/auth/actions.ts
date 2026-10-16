"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionDict } from "@/lib/i18n/action";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validators";

export type AuthState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function parse<T extends z.ZodType>(schema: T, formData: FormData) {
  return schema.safeParse(Object.fromEntries(formData));
}

const fieldErrors = (error: z.ZodError) => z.flattenError(error).fieldErrors;

/** Error Supabase Auth → pesan kamus (error.message mentah selalu berbahasa Inggris). */
async function authError(code: string | undefined) {
  const d = await actionDict();
  const t = d.auth;
  if (code === "email_address_invalid") return d.errors.invalidEmail;
  if (code === "weak_password") return t.weakPassword;
  if (code === "same_password") return t.samePassword;
  if (code?.startsWith("over_") && code.endsWith("_rate_limit")) return t.rateLimited;
  return t.authFailed;
}

async function origin() {
  return (await headers()).get("origin") ?? "";
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = parse(loginSchema, formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const t = await actionDict();
    return { error: error.code === "email_not_confirmed" ? t.auth.emailNotConfirmed : t.auth.wrongCredentials };
  }
  redirect("/dashboard");
}

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = parse(signupSchema, formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${await origin()}/auth/confirm?next=/dashboard` },
  });
  if (error) {
    console.error("signup", error);
    return { error: await authError(error.code) };
  }
  return { message: (await actionDict()).auth.checkEmail };
}

export async function forgotPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = parse(forgotPasswordSchema, formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/confirm?next=/reset-password`,
  });
  // Pesan sama apa pun hasilnya, agar tidak membocorkan email terdaftar.
  return { message: (await actionDict()).auth.resetSent };
}

export async function resetPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = parse(resetPasswordSchema, formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error("resetPassword", error);
    return { error: await authError(error.code) };
  }
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  // Lokal: keluar di perangkat ini saja, sesi di HP/perangkat lain tetap jalan.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
