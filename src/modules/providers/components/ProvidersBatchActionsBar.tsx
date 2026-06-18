import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Download, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/modules/ui/Button";

interface ProvidersBatchActionsBarProps {
  importInputRef: RefObject<HTMLInputElement | null>;
  currentImportKind: string | null;
  currentTabItemsCount: number;
  allCurrentSelected: boolean;
  currentSelectableKeysCount: number;
  selectedExportCount: number;
  loading: boolean;
  onImportFile: (file: File | null) => void;
  onExport: () => void;
  onSelectAll: (checked: boolean) => void;
  onClearSelection: () => void;
  onExportSelected: () => void;
  onRefresh: () => void;
}

export function ProvidersBatchActionsBar({
  importInputRef,
  currentImportKind,
  currentTabItemsCount,
  allCurrentSelected,
  currentSelectableKeysCount,
  selectedExportCount,
  loading,
  onImportFile,
  onExport,
  onSelectAll,
  onClearSelection,
  onExportSelected,
  onRefresh,
}: ProvidersBatchActionsBarProps) {
  const { t } = useTranslation();

  return (
    <div
      data-testid="providers-batch-actions"
      className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-50/80 px-2 py-1.5 transition-colors duration-200 ease-out dark:bg-white/3"
    >
      {currentImportKind ? (
        <>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            aria-label={t("providers.import_json")}
            className="sr-only"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              void onImportFile(file);
              event.currentTarget.value = "";
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            className="h-8! px-2 text-xs"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload size={14} />
            {t("providers.import_json")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-8! px-2 text-xs"
            onClick={onExport}
            disabled={currentTabItemsCount === 0}
          >
            <Download size={14} />
            {t("providers.export_json")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-8! px-2 text-xs"
            onClick={() => onSelectAll(!allCurrentSelected)}
            disabled={currentSelectableKeysCount === 0}
          >
            {allCurrentSelected
              ? t("providers.batch_deselect_all")
              : t("providers.batch_select_all")}
          </Button>
          <span className="ml-1 text-xs font-medium text-slate-600 dark:text-white/65">
            {t("providers.batch_selected", { count: selectedExportCount })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8! px-2 text-xs"
            onClick={onClearSelection}
            disabled={selectedExportCount === 0}
          >
            {t("providers.batch_clear")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-8! px-2 text-xs"
            onClick={onExportSelected}
            disabled={selectedExportCount === 0}
          >
            {t("providers.export_selected_json")}
          </Button>
        </>
      ) : null}
      <Button
        variant="secondary"
        size="sm"
        className="h-8! px-2 text-xs"
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        {t("providers.refresh")}
      </Button>
    </div>
  );
}
