import { useTranslation } from "react-i18next";
import { SearchableSelect } from "@/modules/ui/SearchableSelect";
import { Select } from "@/modules/ui/Select";

export type RequestLogsStatusFilter = "" | "success" | "failed";

export type RequestLogsFilterOption = {
  value: string;
  label: string;
};

export type RequestLogsActiveFilterChip = {
  key: string;
  label: string;
  onClear: () => void;
};

interface RequestLogsFiltersProps {
  apiQuery: string;
  modelQuery: string;
  channelQuery: string;
  statusFilter: RequestLogsStatusFilter;
  onApiQueryChange: (value: string) => void;
  onModelQueryChange: (value: string) => void;
  onChannelQueryChange: (value: string) => void;
  onStatusFilterChange: (value: RequestLogsStatusFilter) => void;
  keyOptions: RequestLogsFilterOption[];
  modelOptions: RequestLogsFilterOption[];
  channelOptions: RequestLogsFilterOption[];
  activeFilterChips: RequestLogsActiveFilterChip[];
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
}

export function RequestLogsFilters({
  apiQuery,
  modelQuery,
  channelQuery,
  statusFilter,
  onApiQueryChange,
  onModelQueryChange,
  onChannelQueryChange,
  onStatusFilterChange,
  keyOptions,
  modelOptions,
  channelOptions,
  activeFilterChips,
  hasActiveFilters,
  onClearAllFilters,
}: RequestLogsFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="border-t border-slate-100 px-5 pt-4 pb-3 dark:border-neutral-800/60">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/50">
            {t("request_logs.section_filters")}
          </h3>
          {hasActiveFilters ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-white/45">
              {t("request_logs.filters_active", { count: activeFilterChips.length })}
            </p>
          ) : null}
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearAllFilters}
            className="shrink-0 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-white/65 dark:hover:bg-white/5"
          >
            {t("request_logs.clear_filters")}
          </button>
        ) : null}
      </div>
      {activeFilterChips.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {activeFilterChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/80 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300"
            >
              <span className="max-w-[240px] truncate">{chip.label}</span>
              <button
                type="button"
                onClick={chip.onClear}
                className="rounded-full px-1 text-blue-600/80 transition hover:text-blue-900 dark:text-blue-200/80 dark:hover:text-blue-100"
                aria-label={t("request_logs.clear_filter")}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
        <SearchableSelect
          value={apiQuery}
          onChange={onApiQueryChange}
          options={keyOptions}
          placeholder={t("request_logs.all_keys_placeholder")}
          searchPlaceholder={t("request_logs.search_keys")}
          aria-label={t("request_logs.filter_key")}
          className="w-full sm:w-auto"
        />
        <SearchableSelect
          value={modelQuery}
          onChange={onModelQueryChange}
          options={modelOptions}
          placeholder={t("request_logs.all_models_placeholder")}
          searchPlaceholder={t("request_logs.search_models")}
          aria-label={t("request_logs.filter_model")}
          className="w-full sm:w-auto"
        />
        <SearchableSelect
          value={channelQuery}
          onChange={onChannelQueryChange}
          options={channelOptions}
          placeholder={t("request_logs.all_channels_placeholder")}
          searchPlaceholder={t("request_logs.search_channels")}
          aria-label={t("request_logs.filter_channel")}
          className="w-full sm:w-auto"
        />
        <Select
          value={statusFilter}
          onChange={(value) => onStatusFilterChange(value as RequestLogsStatusFilter)}
          options={[
            { value: "", label: t("request_logs.all_status") },
            { value: "success", label: t("request_logs.status_success") },
            { value: "failed", label: t("request_logs.status_failed") },
          ]}
          aria-label={t("request_logs.filter_status")}
          name="statusFilter"
          className="w-full sm:w-auto"
        />
      </div>
    </div>
  );
}
