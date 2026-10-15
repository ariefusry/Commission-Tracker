"use client";

import { LayoutList, SquareKanban } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CommissionBoard } from "@/components/commissions/commission-board";
import { CommissionList, type CommissionRow } from "@/components/commissions/commission-list";
import { useDict } from "@/components/i18n-provider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StageOption } from "@/lib/commission";

type View = "list" | "board";

/** Pilihan tampilan Daftar / Board; tersimpan di URL (?view=board). */
export function CommissionViews({ slotLimit, ...props }: { data: CommissionRow[]; today: string; stages: StageOption[]; slotLimit: number }) {
  const initial: View = useSearchParams().get("view") === "board" ? "board" : "list";
  const [view, setView] = useState<View>(initial);
  const { t } = useDict();

  return (
    <div className="grid min-w-0 gap-3">
      <Tabs
        value={view}
        onValueChange={(v) => {
          setView(v as View);
          window.history.replaceState(null, "", v === "board" ? "?view=board" : location.pathname);
        }}
      >
        <TabsList aria-label={t.commissions.views}>
          <TabsTrigger value="list" className="px-3">
            <LayoutList /> {t.commissions.list}
          </TabsTrigger>
          <TabsTrigger value="board" className="px-3">
            <SquareKanban /> {t.commissions.board}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {view === "board" ? <CommissionBoard {...props} slotLimit={slotLimit} /> : <CommissionList {...props} />}
    </div>
  );
}
