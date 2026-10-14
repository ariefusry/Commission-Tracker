import { Input } from "@/components/ui/input";

/** Input angka rupiah dengan awalan "Rp". */
export function PriceInput({ className = "", ...props }: Omit<React.ComponentProps<typeof Input>, "type">) {
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
        Rp
      </span>
      <Input type="number" inputMode="numeric" min={0} className="pl-8" {...props} />
    </div>
  );
}
