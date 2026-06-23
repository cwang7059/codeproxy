import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import type { ModelStatusFilter } from "@/modules/models/models-page-utils";
import { Button } from "@/modules/ui/Button";
import { TextInput } from "@/modules/ui/Input";

export type ModelsFilterToolbarProps = {
  searchFilter: string;
  statusFilter: ModelStatusFilter;
  loading: boolean;
  readOnly?: boolean;
  selectionToolbar: ReactNode;
  onSearchFilterChange: (value: string) => void;
  onStatusFilterChange: (value: ModelStatusFilter) => void;
  onAddModel: () => void;
  onRefresh: () => void;
};
export function ModelsFilterToolbar({
  searchFilter,
  statusFilter,
  loading,
  readOnly = false,
  selectionToolbar,
  onSearchFilterChange,
  onStatusFilterChange,
  onAddModel,
  onRefresh,
}: ModelsFilterToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="min-w-0 flex-1">
          <TextInput
            value={searchFilter}
            onChange={(event) => onSearchFilterChange(event.currentTarget.value)}
            placeholder={t("models_page.search")}
            type="search"
            name="model_search"
            autoComplete="off"
            spellCheck={false}
            startAdornment={<Search size={14} className="text-slate-400 dark:text-white/35" />}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {selectionToolbar}
          {!readOnly ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onAddModel}
              aria-label={t("models_page.add_model")}
              title={t("models_page.add_model")}
              className="gap-1.5"
            >
              <Plus size={14} aria-hidden="true" />
              {t("models_page.add_model")}
            </Button>
          ) : null}
          <Button
            variant="primary"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            title={t("models_page.refresh")}
            aria-label={t("models_page.refresh")}
            className="gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
            {t("models_page.refresh")}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {([
          ["", t("models_page.filter_all")],
          ["priced", t("models_page.filter_priced")],
          ["unpriced", t("models_page.filter_unpriced")],
          ["disabled", t("models_page.filter_disabled")],
        ] as const).map(([value, label]) => (
          <button
            key={value || "all"}
            type="button"
            onClick={() => onStatusFilterChange(value)}
            className={[
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition",
              statusFilter === value
                ? "border-blue-200/80 bg-blue-50/80 text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-950/60 dark:text-white/65 dark:hover:bg-white/5",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ModelsSelectionToolbar({
  selectedModelCount,
  deleting,
  onBulkDelete,
}: {
  selectedModelCount: number;
  deleting: boolean;
  onBulkDelete: () => void;
}) {
  const { t } = useTranslation();

  if (selectedModelCount <= 0) return null;

  return (
    <>
      <span className="inline-flex h-8 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600 dark:bg-white/[0.08] dark:text-white/65">
        {t("models_page.selected_models_count", { count: selectedModelCount })}
      </span>
      <Button variant="danger" size="sm" onClick={onBulkDelete} disabled={deleting}>
        <Trash2 size={14} />
        {t("models_page.delete_selected_models", { count: selectedModelCount })}
      </Button>
    </>
  );
}
