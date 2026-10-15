import { notFound } from "next/navigation";

// URL yang tidak cocok route mana pun → not-found.tsx di app/[lang] (berbahasa sesuai pilihan).
export default function Missing() {
  notFound();
}
