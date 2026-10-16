"use client";

import { useEffect, useRef } from "react";
import { useDict } from "@/components/i18n-provider";
import { Input } from "@/components/ui/input";
import { formatThousands } from "@/lib/format";

/**
 * Input rupiah dengan awalan "Rp" dan pemisah ribuan saat mengetik ("50.000").
 * Nilai di input berupa teks berformat: baca dengan `parseRupiah` dari lib/format.
 */
export function PriceInput({ className = "", onChange, ref, ...props }: Omit<React.ComponentProps<typeof Input>, "type">) {
  const { t } = useDict();
  const inner = useRef<HTMLInputElement | null>(null);

  // Nilai awal (defaultValues React Hook Form) masuk sebagai angka mentah: format sekali saat terpasang.
  useEffect(() => {
    const el = inner.current;
    if (el?.value) el.value = formatThousands(el.value, t.intl);
  }, [t.intl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const digitsBefore = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, "").length;
    const formatted = formatThousands(el.value, t.intl);
    el.value = formatted;
    // Kursor tetap di belakang digit yang sama walau titik ribuan bertambah/berkurang.
    let pos = 0;
    for (let seen = 0; pos < formatted.length && seen < digitsBefore; pos++) if (/\d/.test(formatted[pos])) seen++;
    el.setSelectionRange(pos, pos);
    onChange?.(e);
  };

  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
        Rp
      </span>
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="pl-8 tabular-nums"
        {...props}
        ref={(el) => {
          inner.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        onChange={handleChange}
      />
    </div>
  );
}
