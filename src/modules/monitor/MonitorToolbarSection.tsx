import { ChartSpline, RefreshCw, Search } from "lucide-react";
import { TextInput } from "@/modules/ui/Input";
import { Button } from "@/modules/ui/Button";
import { PageToolbar } from "@/modules/ui/PageToolbar";
import { FilterClearButton, TimeRangeSelector } from "@/modules/monitor/MonitorPagePieces";
import type { TimeRange } from "@/modules/monitor/monitor-constants";

export function MonitorToolbarSection({
  t,
  timeRange,
  setTimeRange,
  apiFilterInput,
  setApiFilterInput,
  applyFilter,
  clearFilter,
  apiFilter,
  refreshData,
  isLoading,
  error,
  lastUpdatedText,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  timeRange: TimeRange;
  setTimeRange: (value: TimeRange) => void;
  apiFilterInput: string;
  setApiFilterInput: (value: string) => void;
  applyFilter: () => void;
  clearFilter: () => void;
  apiFilter: string;
  refreshData: () => void;
  isLoading: boolean;
  error: string | null;
  lastUpdatedText: string;
}) {
  return (
    <div className="px-5 pt-5 pb-4">
      <PageToolbar
        title={t("monitor.title")}
        description={lastUpdatedText}
        icon={
          <ChartSpline size={18} className="text-slate-900 dark:text-white" aria-hidden="true" />
        }
        actions={
          <>
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            <div className="flex items-center gap-1">
              <TextInput
                value={apiFilterInput}
                onChange={(event) => setApiFilterInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyFilter();
                  }
                }}
                startAdornment={<Search size={14} className="text-[#71717A] dark:text-[#A1A1AA]" />}
                className="w-44"
                placeholder={t("monitor.filter_placeholder")}
              />
              {apiFilterInput ? <FilterClearButton onClick={clearFilter} /> : null}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={refreshData}
              disabled={isLoading}
              aria-busy={isLoading}
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              {isLoading ? t("monitor.refreshing") : t("monitor.refresh")}
            </Button>
          </>
        }
        after={
          <>
            {apiFilter ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300">
                {t("monitor.filter_active")}: {apiFilter}
                <button
                  type="button"
                  onClick={clearFilter}
                  className="rounded-full px-1 text-blue-600/80 transition hover:text-blue-900 dark:text-blue-200/80 dark:hover:text-blue-100"
                >
                  ×
                </button>
              </span>
            ) : null}
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            ) : null}
          </>
        }
      />
    </div>
  );
}
