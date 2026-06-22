import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { ModelOwnerSidebar, type ModelOwnerSidebarProps } from "@/modules/models/components/ModelOwnerSidebar";
import {
  OpenRouterSyncSection,
  type OpenRouterSyncSectionProps,
} from "@/modules/models/components/OpenRouterSyncSection";
import { MonitorSectionHeader } from "@/modules/monitor/MonitorPagePieces";
import { Card } from "@/modules/ui/Card";

type ModelsLibraryTabProps = {
  filterToolbar: ReactNode;
  modelTable: ReactNode;
  showingModelsFooter: ReactNode | null;
  ownerSidebar: ModelOwnerSidebarProps;
  openRouterSync: OpenRouterSyncSectionProps;
};

export function ModelsLibraryTab({
  filterToolbar,
  modelTable,
  showingModelsFooter,
  ownerSidebar,
  openRouterSync,
}: ModelsLibraryTabProps) {
  const { t } = useTranslation();
  const compactViewport = useCompactViewport();
  const [ownersPanelOpen, setOwnersPanelOpen] = useState(false);

  useEffect(() => {
    if (!compactViewport) {
      setOwnersPanelOpen(true);
    }
  }, [compactViewport]);

  const selectedOwnerLabel = useMemo(() => {
    if (!ownerSidebar.ownerFilter) {
      return t("models_page.all_owners");
    }
    const selected = ownerSidebar.libraryOwners.find(
      (owner) => owner.value === ownerSidebar.ownerFilter,
    );
    return selected?.label || ownerSidebar.ownerFilter;
  }, [ownerSidebar.libraryOwners, ownerSidebar.ownerFilter, t]);

  return (
    <div
      data-testid="owner-library-layout"
      className={[
        "grid gap-4 border-t border-slate-100 px-5 pb-5 pt-4 dark:border-neutral-800/60",
        compactViewport
          ? "grid-cols-1"
          : "lg:grid-cols-[18rem_minmax(0,1fr)] lg:h-[calc(100dvh-380px)] lg:min-h-[28rem]",
      ].join(" ")}
    >
      {compactViewport ? (
        <div className="space-y-2" data-testid="owner-sidebar-drawer">
          <button
            type="button"
            onClick={() => setOwnersPanelOpen((open) => !open)}
            aria-expanded={ownersPanelOpen}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left transition hover:bg-slate-100 dark:border-neutral-800 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Users size={16} className="shrink-0 text-slate-500 dark:text-white/55" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                  {t("models_page.owner_panel_toggle")}
                </span>
                <span className="block truncate text-xs text-slate-500 dark:text-white/45">
                  {selectedOwnerLabel}
                </span>
              </span>
            </span>
            {ownersPanelOpen ? (
              <ChevronUp size={16} className="shrink-0 text-slate-500" aria-hidden="true" />
            ) : (
              <ChevronDown size={16} className="shrink-0 text-slate-500" aria-hidden="true" />
            )}
          </button>
          {ownersPanelOpen ? (
            <div className="max-h-80 min-h-0 overflow-hidden">
              <ModelOwnerSidebar {...ownerSidebar} compact />
            </div>
          ) : null}
        </div>
      ) : (
        <ModelOwnerSidebar {...ownerSidebar} />
      )}

      <div data-testid="model-library-card" className="flex h-full min-h-0 min-w-0 flex-col gap-4">
        <div>
          <MonitorSectionHeader
            title={t("models_page.section_filters")}
            description={t("models_page.section_filters_desc")}
          />
          {filterToolbar}
        </div>

        <Card
          title={t("models_page.model_library")}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          bodyClassName="relative flex min-h-0 flex-1 flex-col"
        >
          <OpenRouterSyncSection {...openRouterSync} />

          <div className="mb-3 min-h-0 flex-1 overflow-x-auto">{modelTable}</div>
        </Card>
        {showingModelsFooter}
      </div>
    </div>
  );
}
