"use client";

import { useState } from "react";
import type { CatalogKind } from "@/app/[lang]/(admin)/settings/actions";
import { useDict } from "@/components/i18n-provider";
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
  const { t } = useDict();

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
        {SETTINGS_TABS.map((kind) => (
          <TabsTrigger key={kind} value={kind} className="px-3">
            {t.settings.tabs[kind].title}
          </TabsTrigger>
        ))}
      </TabsList>
      {SETTINGS_TABS.map((kind) => (
        <TabsContent key={kind} value={kind}>
          <section className="grid gap-3 rounded-xl border bg-card p-4 sm:p-5">
            <div className="grid gap-1">
              <h2 className="font-semibold">{t.settings.tabs[kind].title}</h2>
              <p className="text-sm text-muted-foreground">{t.settings.tabs[kind].description}</p>
            </div>
            {kind === "general" ? (
              <GeneralSettings initial={preferences} />
            ) : (
              <CatalogEditor kind={kind} label={t.settings.tabs[kind].label} items={items[kind]} />
            )}
          </section>
        </TabsContent>
      ))}
    </Tabs>
  );
}
