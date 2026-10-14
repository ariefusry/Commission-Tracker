"use client";

import { useState } from "react";
import type { CatalogKind } from "@/app/(admin)/settings/actions";
import { GeneralSettings } from "@/components/settings/general-settings";
import { CatalogEditor, type CatalogItem } from "@/components/settings/catalog-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Preferences } from "@/lib/data/settings";
import { SETTINGS_TABS, type SettingsTab } from "@/lib/settings-tabs";

/** Pindah tab di browser (tanpa memuat ulang data); URL ikut diperbarui. */
export function SettingsTabs({
  initial,
  items,
  preferences,
}: {
  initial: SettingsTab;
  items: Record<CatalogKind, CatalogItem[]>;
  preferences: Preferences;
}) {
  const [tab, setTab] = useState<SettingsTab>(initial);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        setTab(value as SettingsTab);
        window.history.replaceState(null, "", `?tab=${value}`);
      }}
      className="grid gap-4"
    >
      <TabsList>
        {SETTINGS_TABS.map((t) => (
          <TabsTrigger key={t.kind} value={t.kind} className="px-3">
            {t.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {SETTINGS_TABS.map((t) => (
        <TabsContent key={t.kind} value={t.kind}>
          <section className="grid gap-3 rounded-xl border bg-card p-4 sm:p-5">
            <div className="grid gap-1">
              <h2 className="font-semibold">{t.title}</h2>
              <p className="text-sm text-muted-foreground">{t.description}</p>
            </div>
            {t.kind === "general" ? (
              <GeneralSettings initial={preferences} />
            ) : (
              <CatalogEditor kind={t.kind} label={t.label} items={items[t.kind]} />
            )}
          </section>
        </TabsContent>
      ))}
    </Tabs>
  );
}
