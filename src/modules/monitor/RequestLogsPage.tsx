import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LoaderCircle, MoreHorizontal, RefreshCw, ScrollText, ShieldCheck, Sigma, DollarSign } from "lucide-react";
import { formatCompact } from "@/modules/monitor/monitor-format";
import { usageApi } from "@/lib/http/apis";
import type { ClearUsageLogsPayload, UsageLogItem, UsageLogsResponse } from "@/lib/http/apis/usage";
import { Button } from "@/modules/ui/Button";
import { Checkbox } from "@/modules/ui/Checkbox";
import { Modal } from "@/modules/ui/Modal";
import { useToast } from "@/modules/ui/ToastProvider";
import { Select } from "@/modules/ui/Select";
import { SearchableSelect } from "@/modules/ui/SearchableSelect";
import { VirtualTable } from "@/modules/ui/VirtualTable";
import { LogContentModal } from "@/modules/monitor/LogContentModal";
import { ErrorDetailModal } from "@/modules/monitor/ErrorDetailModal";
import {
  buildRequestLogKeyOptions,
  buildRequestLogsColumns,
  DEFAULT_REQUEST_LOG_PAGE_SIZE,
  RequestLogsPaginationBar,
  RequestLogsTimeRangeSelector,
  toRequestLogsRow,
  type RequestLogsRow as LogRow,
  type TimeRange,
} from "@/modules/monitor/requestLogsShared";
import { MonitorSectionHeader } from "@/modules/monitor/MonitorPagePieces";
type StatusFilter = "" | "success" | "failed";
const DEFAULT_LOG_STATS = { total: 0, success_rate: 0, total_tokens: 0, total_cost: 0 };
const DEFAULT_CLEAR_OPTIONS: ClearUsageLogsPayload = {
  clear_body_content: true,
  clear_detail_content: true,
  clear_request_records: false,
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function RequestLogsPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [searchParams] = useSearchParams();

  // Content modal state
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [contentModalLogId, setContentModalLogId] = useState<number | null>(null);
  const [contentModalTab, setContentModalTab] = useState<"input" | "output">("input");

  const handleContentClick = useCallback((logId: number, tab: "input" | "output") => {
    setContentModalLogId(logId);
    setContentModalTab(tab);
    setContentModalOpen(true);
  }, []);

  // Error modal state
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalLogId, setErrorModalLogId] = useState<number | null>(null);
  const [errorModalModel, setErrorModalModel] = useState("");

  const handleErrorClick = useCallback((logId: number, model: string) => {
    setErrorModalLogId(logId);
    setErrorModalModel(model);
    setErrorModalOpen(true);
  }, []);

  // Build columns with content click handler
  const logColumns = useMemo(
    () => buildRequestLogsColumns(t, handleContentClick, handleErrorClick),
    [t, handleContentClick, handleErrorClick],
  );

  // Data state (page-based, no accumulation)
  const [rawItems, setRawItems] = useState<UsageLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  // Pagination state
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_REQUEST_LOG_PAGE_SIZE);

  // Backend-provided metadata
  const [filterOptions, setFilterOptions] = useState<{
    api_keys: string[];
    api_key_names: Record<string, string>;
    models: string[];
    channels: string[];
  }>({
    api_keys: [],
    api_key_names: {},
    models: [],
    channels: [],
  });
  const [stats, setStats] = useState<{
    total: number;
    success_rate: number;
    total_tokens: number;
    total_cost: number;
  }>(DEFAULT_LOG_STATS);

  // Filters
  const [timeRange, setTimeRange] = useState<TimeRange>(7);
  const [apiQuery, setApiQuery] = useState("");
  const [modelQuery, setModelQuery] = useState("");
  const [channelQuery, setChannelQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const requestedStatus = searchParams.get("status");

  useEffect(() => {
    if (requestedStatus === "success" || requestedStatus === "failed") {
      setStatusFilter(requestedStatus);
    }
  }, [requestedStatus]);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [clearOptions, setClearOptions] = useState<ClearUsageLogsPayload>(DEFAULT_CLEAR_OPTIONS);
  const [actionsOpen, setActionsOpen] = useState(false);

  const fetchInFlightRef = useRef(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  // Fetch logs from backend (server-side pagination)
  const fetchLogs = useCallback(
    async (page: number, size: number) => {
      if (fetchInFlightRef.current) return;
      fetchInFlightRef.current = true;
      setLoading(true);

      try {
        const resp: UsageLogsResponse = await usageApi.getUsageLogs({
          page,
          size,
          days: timeRange,
          api_key: apiQuery || undefined,
          model: modelQuery || undefined,
          channel: channelQuery || undefined,
          status: statusFilter || undefined,
        });

        setRawItems(resp.items ?? []);
        setTotalCount(resp.total ?? 0);
        setCurrentPage(page);
        const filtersCandidate =
          resp.filters && typeof resp.filters === "object" ? (resp.filters as any) : null;
        setFilterOptions({
          api_keys: Array.isArray(filtersCandidate?.api_keys) ? filtersCandidate.api_keys : [],
          api_key_names:
            filtersCandidate?.api_key_names &&
            typeof filtersCandidate.api_key_names === "object" &&
            !Array.isArray(filtersCandidate.api_key_names)
              ? (filtersCandidate.api_key_names as Record<string, string>)
              : {},
          models: Array.isArray(filtersCandidate?.models) ? filtersCandidate.models : [],
          channels: Array.isArray(filtersCandidate?.channels) ? filtersCandidate.channels : [],
        });
        setStats({
          ...DEFAULT_LOG_STATS,
          ...resp.stats,
        });
        setLastUpdatedAt(Date.now());
      } catch (err) {
        const message = err instanceof Error ? err.message : t("request_logs.refresh_failed");
        notify({ type: "error", message });
      } finally {
        fetchInFlightRef.current = false;
        setLoading(false);
      }
    },
    [timeRange, apiQuery, modelQuery, channelQuery, statusFilter, notify, t],
  );

  // Derive display rows from raw items
  const rows = useMemo<LogRow[]>(
    () => (rawItems ?? []).map((item) => toRequestLogsRow(item)),
    [rawItems],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handlePageChange = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, totalPages));
      fetchLogs(clamped, pageSize);
    },
    [fetchLogs, pageSize, totalPages],
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      fetchLogs(1, newSize);
    },
    [fetchLogs],
  );

  // Fetch page 1 when filters change
  useEffect(() => {
    fetchLogs(1, pageSize);
  }, [timeRange, apiQuery, modelQuery, channelQuery, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build options from backend filter data
  const keyOptions = useMemo(() => {
    return buildRequestLogKeyOptions(filterOptions.api_keys, filterOptions.api_key_names ?? {}, {
      allKeys: t("request_logs.all_keys"),
      systemCall: t("request_logs.system_call"),
    });
  }, [filterOptions.api_keys, filterOptions.api_key_names, t]);

  const modelOptions = useMemo(() => {
    return [
      { value: "", label: t("request_logs.all_models") },
      ...filterOptions.models.map((m) => ({ value: m, label: m })),
    ];
  }, [filterOptions.models, t]);

  const channelOptions = useMemo(() => {
    return [
      { value: "", label: t("request_logs.all_channels") },
      ...filterOptions.channels.map((ch) => ({ value: ch, label: ch })),
    ];
  }, [filterOptions.channels, t]);

  const lastUpdatedText = useMemo(() => {
    if (loading) return t("request_logs.refreshing");
    if (!lastUpdatedAt) return t("request_logs.not_refreshed");
    return t("request_logs.updated_at", {
      time: new Date(lastUpdatedAt).toLocaleTimeString(),
    });
  }, [lastUpdatedAt, loading, t]);

  const statCards = useMemo(
    () => [
      {
        key: "records",
        label: t("request_logs.records_short"),
        value: stats.total.toLocaleString(),
        hint: t("request_logs.stats_scope_time"),
        icon: ScrollText,
        valueClass: "text-slate-900 dark:text-white",
      },
      {
        key: "success-rate",
        label: t("common.success_rate"),
        value: `${stats.success_rate.toFixed(1)}%`,
        hint: t("request_logs.stats_success_hint"),
        icon: ShieldCheck,
        valueClass: "text-emerald-600 dark:text-emerald-400",
      },
      {
        key: "tokens",
        label: t("request_logs.col_total_token"),
        value: formatCompact(stats.total_tokens),
        valueTitle: stats.total_tokens.toLocaleString(),
        hint: t("request_logs.stats_tokens_hint"),
        icon: Sigma,
        valueClass: "text-sky-600 dark:text-sky-400",
      },
      {
        key: "cost",
        label: t("request_logs.col_cost"),
        value: `$${stats.total_cost >= 100 ? stats.total_cost.toFixed(2) : stats.total_cost.toFixed(4)}`,
        hint: t("request_logs.stats_cost_hint"),
        icon: DollarSign,
        valueClass: "text-violet-600 dark:text-violet-400",
      },
    ],
    [stats.success_rate, stats.total, stats.total_cost, stats.total_tokens, t],
  );

  const hasActiveFilters = Boolean(apiQuery || modelQuery || channelQuery || statusFilter);

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> = [];
    if (apiQuery) {
      const keyLabel =
        keyOptions.find((option) => option.value === apiQuery)?.label ?? apiQuery;
      chips.push({
        key: "api",
        label: `${t("request_logs.filter_key")}: ${keyLabel}`,
        onClear: () => setApiQuery(""),
      });
    }
    if (modelQuery) {
      chips.push({
        key: "model",
        label: `${t("request_logs.filter_model")}: ${modelQuery}`,
        onClear: () => setModelQuery(""),
      });
    }
    if (channelQuery) {
      chips.push({
        key: "channel",
        label: `${t("request_logs.filter_channel")}: ${channelQuery}`,
        onClear: () => setChannelQuery(""),
      });
    }
    if (statusFilter) {
      chips.push({
        key: "status",
        label: `${t("request_logs.filter_status")}: ${
          statusFilter === "failed"
            ? t("request_logs.status_failed")
            : t("request_logs.status_success")
        }`,
        onClear: () => setStatusFilter(""),
      });
    }
    return chips;
  }, [apiQuery, channelQuery, keyOptions, modelQuery, statusFilter, t]);

  const clearAllFilters = useCallback(() => {
    setApiQuery("");
    setModelQuery("");
    setChannelQuery("");
    setStatusFilter("");
  }, []);

  useEffect(() => {
    if (!actionsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setActionsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [actionsOpen]);

  const handleOpenClearDialog = useCallback(() => {
    setClearOptions(DEFAULT_CLEAR_OPTIONS);
    setConfirmClearOpen(true);
    setActionsOpen(false);
  }, []);

  const handleClearBodyContentChange = useCallback((checked: boolean) => {
    setClearOptions((prev) => {
      if (prev.clear_request_records) return prev;
      return { ...prev, clear_body_content: checked };
    });
  }, []);

  const handleClearDetailContentChange = useCallback((checked: boolean) => {
    setClearOptions((prev) => {
      if (prev.clear_request_records) return prev;
      return { ...prev, clear_detail_content: checked };
    });
  }, []);

  const handleClearRequestRecordsChange = useCallback((checked: boolean) => {
    setClearOptions((prev) =>
      checked
        ? {
            ...prev,
            clear_body_content: true,
            clear_detail_content: true,
            clear_request_records: true,
          }
        : {
            ...prev,
            clear_request_records: false,
          },
    );
  }, []);

  const canSubmitCleanup =
    clearOptions.clear_body_content ||
    clearOptions.clear_detail_content ||
    clearOptions.clear_request_records;

  const handleClearDatabaseLogs = useCallback(async () => {
    setClearingLogs(true);
    try {
      const result = await usageApi.clearUsageLogs(clearOptions);
      await fetchLogs(1, pageSize);
      const successMessage = clearOptions.clear_request_records
        ? t("request_logs.clear_database_logs_success_records", {
            count: result.deleted_logs,
          })
        : t("request_logs.clear_database_logs_success_content");
      notify({
        type: "success",
        message: successMessage,
      });
      setConfirmClearOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("request_logs.clear_database_logs_failed");
      notify({ type: "error", message });
    } finally {
      setClearingLogs(false);
    }
  }, [clearOptions, fetchLogs, notify, pageSize, t]);

  return (
    <section className="flex flex-1 flex-col">
      <h1 className="sr-only">{t("request_logs.title")}</h1>

      {/* 单层卡片：标题 + 筛选 + 统计 + 表格 + 分页 */}
      <div className="flex flex-1 flex-col rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgb(15_23_42_/_0.035)] dark:border-white/[0.06] dark:bg-neutral-950/70 dark:shadow-[0_1px_2px_rgb(0_0_0_/_0.22)]">
        {/* 标题栏 */}
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <ScrollText
                size={18}
                className="text-slate-900 dark:text-white"
                aria-hidden="true"
              />
              {t("request_logs.heading")}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-white/45">{lastUpdatedText}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RequestLogsTimeRangeSelector value={timeRange} onChange={setTimeRange} />
            <Button
              variant="primary"
              size="sm"
              onClick={() => fetchLogs(currentPage, pageSize)}
              disabled={loading}
              aria-busy={loading}
              title={t("request_logs.refresh")}
            >
              <RefreshCw
                size={14}
                className={loading ? "motion-reduce:animate-none motion-safe:animate-spin" : ""}
                aria-hidden="true"
              />
              {t("request_logs.refresh")}
            </Button>
            <div className="relative" ref={actionsRef}>
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={actionsOpen}
                aria-haspopup="menu"
                aria-label={t("request_logs.more_actions")}
                title={t("request_logs.more_actions")}
                onClick={() => setActionsOpen((prev) => !prev)}
              >
                <MoreHorizontal size={14} aria-hidden="true" />
                {t("request_logs.more_actions")}
              </Button>
              {actionsOpen ? (
                <div
                  role="menu"
                  aria-label={t("request_logs.more_actions")}
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.14)] dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleOpenClearDialog}
                    disabled={loading || clearingLogs}
                    className="flex w-full flex-col items-start rounded-xl px-3 py-2.5 text-left transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-rose-500/10"
                  >
                    <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                      {t("request_logs.clear_database_logs")}
                    </span>
                    <span className="mt-0.5 text-xs text-slate-500 dark:text-white/45">
                      {t("request_logs.high_risk_action_hint")}
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-5 pb-4">
          <MonitorSectionHeader title={t("request_logs.section_overview")} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.key}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3.5 dark:border-white/[0.08] dark:bg-white/[0.02]"
                >
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                    <Icon size={14} className="text-slate-700 dark:text-white/75" aria-hidden="true" />
                    <span>{card.label}</span>
                  </p>
                  <p
                    className={`mt-2 text-right font-mono text-2xl font-semibold tabular-nums tracking-tight ${card.valueClass}`}
                    title={"valueTitle" in card ? card.valueTitle : undefined}
                  >
                    {card.value}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-white/45">
                    {hasActiveFilters ? t("request_logs.stats_scope_filtered") : card.hint}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

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
                onClick={clearAllFilters}
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
                onChange={setApiQuery}
                options={keyOptions}
                placeholder={t("request_logs.all_keys_placeholder")}
                searchPlaceholder={t("request_logs.search_keys")}
                aria-label={t("request_logs.filter_key")}
                className="w-full sm:w-auto"
              />
              <SearchableSelect
                value={modelQuery}
                onChange={setModelQuery}
                options={modelOptions}
                placeholder={t("request_logs.all_models_placeholder")}
                searchPlaceholder={t("request_logs.search_models")}
                aria-label={t("request_logs.filter_model")}
                className="w-full sm:w-auto"
              />
              <SearchableSelect
                value={channelQuery}
                onChange={setChannelQuery}
                options={channelOptions}
                placeholder={t("request_logs.all_channels_placeholder")}
                searchPlaceholder={t("request_logs.search_channels")}
                aria-label={t("request_logs.filter_channel")}
                className="w-full sm:w-auto"
              />
              <Select
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as StatusFilter)}
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

        <div className="border-t border-slate-100 px-5 pt-3 pb-1 dark:border-neutral-800/60">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/50">
            {t("request_logs.section_table")}
          </h3>
        </div>

        {/* 表格区域 — 自适应视口高度，内部滚动 */}
        <div className="relative min-h-[360px] h-[calc(100dvh-300px)] overflow-hidden px-5">
          <VirtualTable
            rows={rows}
            columns={logColumns}
            rowKey={(row) => row.id}
            loading={loading}
            virtualize={false}
            minWidth="min-w-[1320px]"
            height="h-full"
            minHeight="min-h-full"
            caption={t("request_logs.table_caption")}
            emptyText={t("request_logs.no_data")}
            showAllLoadedMessage={false}
          />

          {/* Loading overlay */}
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-b-2xl bg-white/70 backdrop-blur-sm dark:bg-neutral-950/55">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/70 dark:text-white/75">
                <span
                  className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-900 motion-reduce:animate-none motion-safe:animate-spin dark:border-white/20 dark:border-t-white/80"
                  aria-hidden="true"
                />
                <span role="status">{t("common.loading_ellipsis")}</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* 分页控件 — flex-shrink-0 固定在底部 */}
        <RequestLogsPaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      <LogContentModal
        open={contentModalOpen}
        logId={contentModalLogId}
        initialTab={contentModalTab}
        onClose={() => setContentModalOpen(false)}
        showRequestDetails
      />
      <ErrorDetailModal
        open={errorModalOpen}
        logId={errorModalLogId}
        model={errorModalModel}
        onClose={() => setErrorModalOpen(false)}
      />
      <Modal
        open={confirmClearOpen}
        title={t("request_logs.clear_database_logs")}
        description={t("request_logs.clear_database_logs_modal_desc")}
        maxWidth="max-w-xl"
        onClose={() => {
          if (!clearingLogs) setConfirmClearOpen(false);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmClearOpen(false)}
              disabled={clearingLogs}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleClearDatabaseLogs()}
              disabled={clearingLogs || !canSubmitCleanup}
              aria-busy={clearingLogs}
            >
              {clearingLogs ? (
                <LoaderCircle
                  size={14}
                  className="motion-reduce:animate-none motion-safe:animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              {t("request_logs.clear_database_logs_confirm_button")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
            {t("request_logs.high_risk_action_hint")}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-white/65">
            {t("request_logs.clear_database_logs_keep_records_hint")}
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-neutral-800">
            <Checkbox
              checked={clearOptions.clear_body_content}
              onCheckedChange={handleClearBodyContentChange}
              disabled={clearingLogs || clearOptions.clear_request_records}
              aria-label={t("request_logs.clear_option_body")}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900 dark:text-white">
                {t("request_logs.clear_option_body")}
              </span>
              <span className="mt-1 block text-sm text-slate-500 dark:text-white/55">
                {t("request_logs.clear_option_body_desc")}
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-neutral-800">
            <Checkbox
              checked={clearOptions.clear_detail_content}
              onCheckedChange={handleClearDetailContentChange}
              disabled={clearingLogs || clearOptions.clear_request_records}
              aria-label={t("request_logs.clear_option_details")}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900 dark:text-white">
                {t("request_logs.clear_option_details")}
              </span>
              <span className="mt-1 block text-sm text-slate-500 dark:text-white/55">
                {t("request_logs.clear_option_details_desc")}
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
            <Checkbox
              checked={clearOptions.clear_request_records}
              onCheckedChange={handleClearRequestRecordsChange}
              disabled={clearingLogs}
              aria-label={t("request_logs.clear_option_records")}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-rose-700 dark:text-rose-300">
                {t("request_logs.clear_option_records")}
              </span>
              <span className="mt-1 block text-sm text-rose-600/90 dark:text-rose-200/70">
                {t("request_logs.clear_option_records_desc")}
              </span>
            </span>
          </label>
        </div>
      </Modal>
    </section>
  );
}
