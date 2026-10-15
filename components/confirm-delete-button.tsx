"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDict } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  title: string;
  description: string;
  disabled?: boolean;
  onConfirm: () => Promise<{ error?: string }>;
};

export function ConfirmDeleteButton({ label, title, description, disabled, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { t } = useDict();

  const confirm = () =>
    startTransition(async () => {
      const result = await onConfirm();
      if (result.error) setError(result.error);
      else setOpen(false);
    });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <AlertDialogTrigger
        disabled={disabled}
        render={<Button type="button" variant="ghost" size="icon-sm" className="text-destructive" aria-label={label} />}
      >
        <Trash2 />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t.common.cancel}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={confirm}>
            {pending ? t.common.deleting : t.common.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
