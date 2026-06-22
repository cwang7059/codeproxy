import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { MonitorSectionHeader } from "@/modules/monitor/MonitorPagePieces";

type ModelsActiveTabProps = {
  filterToolbar: ReactNode;
  modelTable: ReactNode;
  showingModelsFooter: ReactNode;
};

export function ModelsActiveTab({
  filterToolbar,
  modelTable,
  showingModelsFooter,
}: ModelsActiveTabProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="border-t border-slate-100 px-5 pt-4 pb-3 dark:border-neutral-800/60">
        <MonitorSectionHeader
          title={t("models_page.section_filters")}
          description={t("models_page.section_filters_desc")}
        />
        {filterToolbar}
      </div>

      <div className="border-t border-slate-100 px-5 pt-3 pb-1 dark:border-neutral-800/60">
        <MonitorSectionHeader
          title={t("models_page.section_table")}
          description={t("models_page.section_table_desc")}
        />
      </div>

      <div className="px-5 pb-4">{modelTable}</div>
      {showingModelsFooter}
    </>
  );
}
