"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SelectOption = { value: string; label: string };

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  size?: "sm" | "default";
  className?: string;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  triggerRef?: React.Ref<HTMLButtonElement>;
  onBlur?: () => void;
  "aria-label"?: string;
};

/**
 * Dropdown yang dirender di halaman (bukan picker OS), jadi font dan tema
 * selalu sama di semua browser.
 */
export function AppSelect({ value, onValueChange, options, placeholder, size, className = "", invalid, triggerRef, onBlur, ...rest }: Props) {
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]));
  return (
    <Select
      items={items}
      // Nilai di luar daftar (mis. "" sebelum memilih) → tampilkan placeholder.
      value={options.some((o) => o.value === value) ? value : null}
      onValueChange={(v) => onValueChange(v ?? "")}
      disabled={rest.disabled}
      onOpenChange={(open) => !open && onBlur?.()}
    >
      <SelectTrigger
        ref={triggerRef}
        id={rest.id}
        size={size}
        aria-label={rest["aria-label"]}
        aria-invalid={invalid || undefined}
        className={`w-full min-w-0 ${className}`}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
