import { Suspense } from "react";
import { CatalogEditor } from "@/components/settings/catalog-editor";
import { SkeletonBlock } from "@/components/skeleton-block";
import { getCatalog } from "@/lib/data/settings";

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 rounded-xl border bg-card p-4 sm:p-5">
      <div className="grid gap-1">
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

async function Catalog() {
  const { types, addons } = await getCatalog();
  return (
    <>
      <Section
        title="Tipe pesanan"
        description="Harga dasar per tipe. Urutan di sini menjadi urutan pilihan di form commission."
      >
        <CatalogEditor kind="type" label="tipe" items={types} />
      </Section>
      <Section title="Add-on" description="Tambahan harga yang bisa dicentang di form commission.">
        <CatalogEditor kind="addon" label="add-on" items={addons} />
      </Section>
    </>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Ubah harga kapan saja. Commission lama tetap memakai harga saat dipesan. Item yang tidak aktif disembunyikan dari form baru.
        </p>
      </div>
      <Suspense fallback={<SkeletonBlock className="h-96" />}>
        <Catalog />
      </Suspense>
    </div>
  );
}
