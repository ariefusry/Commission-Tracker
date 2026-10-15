"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/[lang]/(admin)/settings/actions";
import { useDict } from "@/components/i18n-provider";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Hapus akun permanen; harus mengetik kata konfirmasi (dicek ulang di server). */
export function DeleteAccount() {
  const { t } = useDict();
  const s = t.settings;
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ready = word.trim() === s.deleteAccountWord;

  const confirm = () =>
    startTransition(async () => {
      const result = await deleteAccount(word);
      // Berhasil → server redirect ke landing; sampai sini hanya jika gagal.
      if (result?.error) setError(result.error);
    });

  return (
    <div className="grid gap-2 rounded-lg border border-destructive/30 p-3">
      <div className="grid gap-1">
        <span className="text-sm font-medium">{s.deleteAccount}</span>
        <span className="text-sm text-muted-foreground">{s.deleteAccountHint}</span>
      </div>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setWord("");
            setError(null);
          }
        }}
      >
        <AlertDialogTrigger render={<Button type="button" variant="destructive" className="w-fit" />}>
          {s.deleteAccount}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{s.deleteAccountTitle}</AlertDialogTitle>
            <AlertDialogDescription>{s.deleteAccountBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <label className="grid gap-1.5 text-sm">
            {s.deleteAccountConfirm(s.deleteAccountWord)}
            <Input value={word} autoComplete="off" onChange={(e) => setWord(e.target.value)} disabled={pending} />
          </label>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={!ready || pending} onClick={confirm}>
              {pending ? t.common.deleting : s.deleteAccountButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
