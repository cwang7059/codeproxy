import type { Dispatch, SetStateAction } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDown,
  Clock3,
  RefreshCw,
  ScrollText,
  TriangleAlert,
} from "lucide-react";
import type { LiveLogsEmptyKind, LogLevelStats } from "@/modules/logs/logs-page-utils";
import type { ParsedLogLine } from "@/modules/logs/logsHelpers";
import { getLevelStyles, getStatusStyles } from "@/modules/logs/logsHelpers";
import { MonitorSectionHeader } from "@/modules/monitor/MonitorPagePieces";
import { Button } from "@/modules/ui/Button";
import { EmptyState } from "@/modules/ui/EmptyState";
import { TextInput } from "@/modules/ui/Input";
import { Card } from "@/modules/ui/Card";

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function FilterToggleChip({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "border-blue-200/80 bg-blue-50/80 text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-950/60 dark:text-white/65 dark:hover:bg-white/5",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function levelBorderClass(level?: ParsedLogLine["level"]): string {
  switch (level) {
    case "error":
    case "fatal":
      return "border-l-rose-400 dark:border-l-rose-500/70";
    case "warn":
      return "border-l-amber-400 dark:border-l-amber-500/70";
    case "info":
      return "border-l-sky-400 dark:border-l-sky-500/70";
    case "debug":
      return "border-l-slate-300 dark:border-l-white/20";
    default:
      return "border-l-transparent";
  }
}

function LiveLogsEmptyPanel({
  t,
  kind,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  kind: LiveLogsEmptyKind;
}) {
  if (kind === "loading") {
    return (
      <div className="px-1 py-8 text-center text-sm text-slate-600 dark:text-white/65">
        {t("logs_page.loading")}
      </div>
    );
  }

  if (kind === "logging_disabled") {
    return (
      <EmptyState
        title={t("logs_page.empty_logging_disabled_title")}
        description={t("logs_page.empty_logging_disabled_desc")}
        action={
          <Link
            to="/config"
            viewTransition
            className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-950/60 dark:text-white/80 dark:hover:bg-white/5"
          >
            {t("logs_page.open_runtime_config")}
          </Link>
        }
      />
    );
  }

  if (kind === "filtered") {
    return (
      <EmptyState
        title={t("logs_page.empty_filtered_title")}
        description={t("logs_page.empty_filtered_desc")}
      />
    );
  }

  return (
    <EmptyState
      title={t("logs_page.empty_waiting_title")}
      description={t("logs_page.empty_waiting_desc")}
    />
  );
}

export function LiveLogsTab({
  t,
  loading,
  refreshing,
  filteredLines,
  visibleLines,
  parsedVisibleLines,
  canLoadMore,
  latestLabel,
  levelStats,
  loggingToFile,
  emptyStateKind,
  handleRefresh,
  handleDownloadLogs,
  setConfirmClearOpen,
  search,
  setSearch,
  autoRefresh,
  setAutoRefresh,
  hideManagement,
  setHideManagement,
  showRawLogs,
  setShowRawLogs,
  scrollToBottom,
  isAtBottom,
  hasPendingLogs,
  containerRef,
  onScroll,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  loading: boolean;
  refreshing: boolean;
  filteredLines: string[];
  visibleLines: string[];
  parsedVisibleLines: ParsedLogLine[];
  canLoadMore: boolean;
  latestLabel: string;
  levelStats: LogLevelStats;
  loggingToFile: boolean | null;
  emptyStateKind: LiveLogsEmptyKind | null;
  handleRefresh: () => void;
  handleDownloadLogs: () => void;
  setConfirmClearOpen: Dispatch<SetStateAction<boolean>>;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  autoRefresh: boolean;
  setAutoRefresh: Dispatch<SetStateAction<boolean>>;
  hideManagement: boolean;
  setHideManagement: Dispatch<SetStateAction<boolean>>;
  showRawLogs: boolean;
  setShowRawLogs: Dispatch<SetStateAction<boolean>>;
  scrollToBottom: () => void;
  isAtBottom: boolean;
  hasPendingLogs: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
}) {
  const overviewCards = [
    {
      key: "buffer",
      label: t("logs_page.kpi_buffer"),
      value: levelStats.total.toLocaleString(),
      hint: t("logs_page.kpi_buffer_hint"),
      icon: ScrollText,
      valueClass: "text-slate-900 dark:text-white",
    },
    {
      key: "latest",
      label: t("logs_page.kpi_latest"),
      value: latestLabel,
      hint:
        loggingToFile === false
          ? t("logs_page.kpi_latest_disabled_hint")
          : t("logs_page.kpi_latest_hint"),
      icon: Clock3,
      valueClass: "text-base text-slate-900 dark:text-white",
    },
    {
      key: "warn",
      label: t("logs_page.kpi_warn"),
      value: levelStats.warn.toLocaleString(),
      hint: t("logs_page.kpi_warn_hint"),
      icon: AlertTriangle,
      valueClass: "text-amber-700 dark:text-amber-300",
    },
    {
      key: "error",
      label: t("logs_page.kpi_error"),
      value: levelStats.error.toLocaleString(),
      hint: t("logs_page.kpi_error_hint"),
      icon: TriangleAlert,
      valueClass: "text-rose-700 dark:text-rose-300",
    },
  ];

  return (
    <Card
      title={t("logs_page.live_logs")}
      description={t("logs_page.page_intro")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="gap-1.5"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
            {t("logs_page.refresh")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadLogs}
            disabled={loading || filteredLines.length === 0}
          >
            {t("logs_page.download")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmClearOpen(true)}
            disabled={loading || refreshing || loggingToFile === false}
          >
            {t("logs_page.clear")}
          </Button>
        </div>
      }
      loading={loading}
    >
      <div className="mb-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-3 text-sm text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white/65">
        {t("logs_page.page_hint")}{" "}
        <Link
          to="/monitor/request-logs"
          viewTransition
          className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-300"
        >
          {t("logs_page.request_logs_link")}
        </Link>
      </div>

      <MonitorSectionHeader title={t("logs_page.section_overview")} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => {
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
                className={`mt-2 truncate text-right font-mono text-2xl font-semibold tabular-nums tracking-tight ${card.valueClass}`}
                title={card.key === "latest" ? latestLabel : undefined}
              >
                {card.value}
              </p>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-white/45">{card.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-100 pt-4 dark:border-neutral-800/60">
        <MonitorSectionHeader
          title={t("logs_page.section_filters")}
          description={t("logs_page.section_filters_desc")}
        />
        <div className="space-y-3">
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder={t("logs_page.search_placeholder")}
            type="search"
            name="log_search"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="flex flex-wrap gap-2">
            <FilterToggleChip
              label={
                autoRefresh
                  ? t("logs_page.chip_auto_refresh_on")
                  : t("logs_page.chip_auto_refresh_off")
              }
              active={autoRefresh}
              onClick={() => setAutoRefresh((prev) => !prev)}
              disabled={loading}
            />
            <FilterToggleChip
              label={
                hideManagement
                  ? t("logs_page.chip_hide_mgmt_on")
                  : t("logs_page.chip_hide_mgmt_off")
              }
              active={hideManagement}
              onClick={() => setHideManagement((prev) => !prev)}
              disabled={loading}
            />
            <FilterToggleChip
              label={showRawLogs ? t("logs_page.chip_raw_on") : t("logs_page.chip_raw_off")}
              active={showRawLogs}
              onClick={() => setShowRawLogs((prev) => !prev)}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-neutral-800/60">
        <MonitorSectionHeader title={t("logs_page.section_details")} />
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/70 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60">
          <div className="flex min-h-11 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-xs text-slate-600 dark:border-neutral-800 dark:text-white/65">
            <div className="min-w-0">
              <span className="block whitespace-pre-wrap break-words tabular-nums">
                {t("logs_page.showing_lines", {
                  visible: visibleLines.length.toLocaleString(),
                  total: filteredLines.length.toLocaleString(),
                })}
                {canLoadMore ? ` ${t("logs_page.scroll_up_hint")}` : ""}
              </span>
            </div>
            <div className="shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={scrollToBottom}
                disabled={visibleLines.length === 0 || isAtBottom}
                className={visibleLines.length === 0 || isAtBottom ? "pointer-events-none opacity-0" : ""}
              >
                {t("logs_page.jump_to_latest")}
              </Button>
            </div>
          </div>
          <div className="relative">
            <div
              ref={containerRef}
              onScroll={onScroll}
              className="max-h-[60vh] overflow-y-auto bg-slate-50 px-4 py-3 text-slate-900 dark:bg-neutral-950/60 dark:text-slate-100"
            >
              {visibleLines.length === 0 && emptyStateKind ? (
                <div className="px-1 py-4">
                  <LiveLogsEmptyPanel t={t} kind={emptyStateKind} />
                </div>
              ) : showRawLogs ? (
                <pre
                  spellCheck={false}
                  className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed"
                >
                  {visibleLines.join("\n")}
                </pre>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[640px] divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white/70 dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-950/40">
                    {parsedVisibleLines.map((line, index) => {
                      const levelStyles = line.level ? getLevelStyles(line.level) : null;
                      const message = line.message.trim();
                      const isCompactAccessLog = !message;
                      const rowClassName = [
                        "border-l-2 px-3",
                        isCompactAccessLog ? "py-1.5" : "py-2",
                        levelBorderClass(line.level),
                        "hover:bg-slate-50 dark:hover:bg-white/5",
                        levelStyles?.row,
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <div
                          key={`${filteredLines.length - visibleLines.length + index}`}
                          className={rowClassName}
                        >
                          <div
                            className={[
                              "flex gap-3",
                              isCompactAccessLog ? "items-center" : "items-start",
                            ].join(" ")}
                          >
                            <div className="w-36 shrink-0 tabular-nums text-[11px] text-slate-500 dark:text-white/55">
                              {line.timestamp ?? ""}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {line.level ? (
                                  <Badge className={levelStyles?.badge ?? ""}>
                                    {line.level.toUpperCase()}
                                  </Badge>
                                ) : null}
                                {line.source ? (
                                  <Badge className="border-slate-200 bg-white text-slate-700 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-white/70">
                                    {line.source}
                                  </Badge>
                                ) : null}
                                {line.requestId ? (
                                  <Badge className="border-slate-200 bg-slate-50 font-mono text-slate-700 dark:border-neutral-800 dark:bg-white/5 dark:text-white/70">
                                    {line.requestId}
                                  </Badge>
                                ) : null}
                                {typeof line.statusCode === "number" ? (
                                  <Badge className={getStatusStyles(line.statusCode)}>
                                    {line.statusCode}
                                  </Badge>
                                ) : null}
                                {line.latency ? (
                                  <Badge className="border-slate-200 bg-white text-slate-700 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-white/70">
                                    {line.latency}
                                  </Badge>
                                ) : null}
                                {line.ip ? (
                                  <Badge className="border-slate-200 bg-white font-mono text-slate-700 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-white/70">
                                    {line.ip}
                                  </Badge>
                                ) : null}
                                {line.method ? (
                                  <Badge className="border-slate-200 bg-white text-slate-700 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-white/70">
                                    {line.method}
                                  </Badge>
                                ) : null}
                                {line.path ? (
                                  <Badge className="border-slate-200 bg-white font-mono text-slate-700 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-white/70">
                                    <span className="break-all">{line.path}</span>
                                  </Badge>
                                ) : null}
                              </div>
                              {message ? (
                                <div className="mt-1 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-900 dark:text-slate-100">
                                  {message}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {hasPendingLogs && !isAtBottom ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/95 px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm backdrop-blur dark:border-blue-500/25 dark:bg-blue-500/20 dark:text-blue-200"
                >
                  <ArrowDown size={14} aria-hidden="true" />
                  {t("logs_page.new_logs_available")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
