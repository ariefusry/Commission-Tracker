"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/auth/actions";
import { useDict } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { translateError } from "@/lib/i18n";

type Field = {
  name: string;
  label: string;
  type: "email" | "password";
  autoComplete: string;
};

type Props = {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  fields: Field[];
  submitLabel: string;
  initialError?: string;
};

export function AuthForm({ action, fields, submitLabel, initialError }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: initialError });
  const { t } = useDict();

  if (state.message) {
    return <p className="text-sm text-muted-foreground" role="status">{state.message}</p>;
  }

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {fields.map((f) => {
        const errors = state.fieldErrors?.[f.name];
        return (
          <div key={f.name} className="grid gap-2">
            <Label htmlFor={f.name}>{f.label}</Label>
            <Input
              id={f.name}
              name={f.name}
              type={f.type}
              autoComplete={f.autoComplete}
              required
              aria-invalid={Boolean(errors)}
              aria-describedby={errors ? `${f.name}-error` : undefined}
            />
            {errors && (
              <p id={`${f.name}-error`} className="text-sm text-destructive">
                {translateError(t, errors[0])}
              </p>
            )}
          </div>
        );
      })}
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.auth.processing : submitLabel}
      </Button>
    </form>
  );
}
