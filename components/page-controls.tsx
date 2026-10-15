import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

/** Pilihan bahasa + tema di pojok kanan atas halaman publik (parent harus `relative`). */
export function PageControls() {
  return (
    <div className="absolute top-4 right-4 flex items-center">
      <LanguageToggle />
      <ThemeToggle />
    </div>
  );
}
