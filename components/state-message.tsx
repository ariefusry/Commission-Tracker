import type { LucideIcon } from "lucide-react";

/** Pesan kosong / error / tidak ditemukan dengan gaya yang sama di semua halaman. */
export function StateMessage({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <div className="grid gap-1">
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
