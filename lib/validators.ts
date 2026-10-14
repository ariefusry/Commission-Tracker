import { z } from "zod";

const email = z.email("Email tidak valid").trim().toLowerCase();
const password = z.string().min(8, "Password minimal 8 karakter").max(72, "Password terlalu panjang");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password wajib diisi"),
});

export const signupSchema = z
  .object({ email, password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Password tidak sama", path: ["confirm"] });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Password tidak sama", path: ["confirm"] });
