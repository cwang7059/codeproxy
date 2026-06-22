import { useTranslation } from "react-i18next";
import { Button } from "@/modules/ui/Button";

export type AuthFilesBatchActionsBarProps = {
  selectedCount: number;
  allPageSelected: boolean;
  allFilteredSelected: boolean;
  selectablePageNames: string[];
  selectableFilteredFilesLength: number;
  deletingAll: boolean;
  selectCurrentPage: (checked: boolean) => void;
  selectFilteredFiles: (checked: boolean) => void;
  onClearSelection: () => void;
  onDeleteSelection: () => void;
};

export function AuthFilesBatchActionsBar({
  selectedCount,
  allPageSelected,
  allFilteredSelected,
  selectablePageNames,
  selectableFilteredFilesLength,
  deletingAll,
  selectCurrentPage,
  selectFilteredFiles,
  onClearSelection,
  onDeleteSelection,
}: AuthFilesBatchActionsBarProps) {
  const { t } = useTranslation();

  if (selectedCount <= 0) return null;

  return (
    <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-950/95">
      <span className="text-sm font-medium text-slate-700 dark:text-white/80">
        {t("auth_files.batch_selected", { count: selectedCount })}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          className="!h-8 px-2 text-xs"
          onClick={() => selectCurrentPage(!allPageSelected)}
          disabled={selectablePageNames.length === 0}
        >
          {allPageSelected
            ? t("auth_files.batch_deselect_page")
            : t("auth_files.batch_select_page")}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="!h-8 px-2 text-xs"
          onClick={() => selectFilteredFiles(!allFilteredSelected)}
          disabled={selectableFilteredFilesLength === 0}
        >
          {allFilteredSelected
            ? t("auth_files.batch_deselect_filtered")
            : t("auth_files.batch_select_filtered")}
        </Button>
        <Button variant="ghost" size="sm" className="!h-8 px-2 text-xs" onClick={onClearSelection}>
          {t("auth_files.batch_clear")}
        </Button>
        <Button
          variant="danger"
          size="sm"
          className="!h-8 px-2 text-xs"
          onClick={onDeleteSelection}
          disabled={deletingAll}
        >
          {t("auth_files.batch_delete_action", { count: selectedCount })}
        </Button>
      </div>
    </div>
  );
}

export type AuthFilesPaginationFooterProps = {
  filteredFilesCount: number;
  safePage: number;
  totalPages: number;
  setPage: (value: number | ((prev: number) => number)) => void;
  usageData: unknown;
};

export function AuthFilesPaginationFooter({
  filteredFilesCount,
  safePage,
  totalPages,
  setPage,
  usageData,
}: AuthFilesPaginationFooterProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-600 dark:text-white/65 tabular-nums">
          {t("auth_files.total_page", {
            total: filteredFilesCount,
            page: safePage,
            pages: totalPages,
          })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={safePage <= 1}
          >
            {t("auth_files.prev")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={safePage >= totalPages}
          >
            {t("auth_files.next")}
          </Button>
        </div>
      </div>

      {usageData ? null : (
        <p className="text-xs text-slate-500 dark:text-white/55">
          {t("auth_files.usage_stats_warning")}
        </p>
      )}
    </>
  );
}
