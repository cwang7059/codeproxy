import { Activity, ChartSpline, Coins, DatabaseZap, ShieldCheck, TriangleAlert } from "lucide-react";
import type { HourWindow } from "@/modules/monitor/monitor-constants";
import { formatCompact } from "@/modules/monitor/monitor-format";
import { formatRate } from "@/modules/monitor/monitor-utils";
import { AnimatedNumber } from "@/modules/ui/AnimatedNumber";
import { Reveal } from "@/modules/ui/Reveal";
import { EChart } from "@/modules/ui/charts/EChart";
import { ChartLegend } from "@/modules/ui/charts/ChartLegend";
import { Tabs, TabsList, TabsTrigger } from "@/modules/ui/Tabs";
import {
  CompactDistributionList,
  DistributionLegendList,
  HourWindowSelector,
  KpiCard,
  MonitorCard as Card,
  MonitorSectionHeader,
  type DistributionLegendItem,
} from "@/modules/monitor/MonitorPagePieces";

const formatKpiNumber = (value: number) => formatCompact(value);

export function MonitorRecordingNotice({
  t,
  requestLogEnabled,
  usageStatisticsEnabled,
  isEnabling,
  onEnable,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  requestLogEnabled: boolean;
  usageStatisticsEnabled: boolean;
  isEnabling: boolean;
  onEnable: () => void;
}) {
  const missing = [
    requestLogEnabled ? null : t("monitor.recording_request_log"),
    usageStatisticsEnabled ? null : t("monitor.recording_usage_stats"),
  ].filter(Boolean);

  return (
    <Reveal>
      <section className="mx-5 mb-4 overflow-hidden rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 shadow-sm dark:border-amber-400/20 dark:bg-amber-400/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-700 dark:bg-amber-300/15 dark:text-amber-200">
              <DatabaseZap size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                {t("monitor.recording_disabled_title")}
              </p>
              <p className="mt-1 text-sm text-amber-800/85 dark:text-amber-100/70">
                {t("monitor.recording_disabled_desc", {
                  items: missing.join(" / "),
                })}
              </p>
              <p className="mt-1 text-xs text-amber-700/75 dark:text-amber-100/55">
                {t("monitor.recording_waiting_for_traffic")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onEnable}
            disabled={isEnabling}
            aria-busy={isEnabling}
            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-65 dark:bg-amber-300 dark:hover:bg-amber-200"
          >
            {isEnabling ? t("monitor.enabling_recording") : t("monitor.enable_recording")}
          </button>
        </div>
      </section>
    </Reveal>
  );
}

export function MonitorKpiSection({
  t,
  metrics,
  hasData,
  isLoading,
  refreshData,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  metrics: {
    totalRequests: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  hasData: boolean;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}) {
  return (
    <>
      <MonitorSectionHeader title={t("monitor.section_overview")} />
      <Reveal>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={t("monitor.total_requests")}
            value={
              <AnimatedNumber value={metrics.totalRequests} format={formatKpiNumber} />
            }
            hint={t("monitor.filtered_by_time")}
            icon={Activity}
            to="/monitor/request-logs"
          />
          <KpiCard
            title={t("monitor.success_rate")}
            value={<AnimatedNumber value={metrics.successRate} format={formatRate} />}
            hint={t("monitor.success_count", {
              success: formatKpiNumber(metrics.successCount),
              failed: formatKpiNumber(metrics.failureCount),
            })}
            icon={ShieldCheck}
            to="/monitor/request-logs"
          />
          <KpiCard
            title={t("monitor.total_token")}
            value={<AnimatedNumber value={metrics.totalTokens} format={formatKpiNumber} />}
            hint={t("monitor.token_io_hint", {
              input: formatKpiNumber(metrics.inputTokens),
              output: formatKpiNumber(metrics.outputTokens),
            })}
            icon={Coins}
          />
          <KpiCard
            title={t("monitor.failed_requests")}
            value={<AnimatedNumber value={metrics.failureCount} format={formatKpiNumber} />}
            hint={t("monitor.failed_hint")}
            icon={TriangleAlert}
            to="/monitor/request-logs?status=failed"
          />
        </section>
      </Reveal>

      {!hasData && !isLoading ? (
        <Reveal>
          <section className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60">
            <div className="mx-auto flex max-w-md flex-col items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-700 dark:bg-white/10 dark:text-white/70">
                <ChartSpline size={20} />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {t("monitor.no_data")}
              </p>
              <p className="text-sm text-slate-600 dark:text-white/65">{t("monitor.no_data_hint")}</p>
              <button
                type="button"
                onClick={() => void refreshData()}
                className="inline-flex min-w-[96px] items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-slate-200"
              >
                {t("monitor.refresh")}
              </button>
            </div>
          </section>
        </Reveal>
      ) : null}
    </>
  );
}

function DistributionPanel({
  title,
  description,
  actions,
  loading,
  legend,
  onToggleLegend,
  chartOption,
  noDataLabel,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  loading: boolean;
  legend: DistributionLegendItem[];
  onToggleLegend: (name: string) => void;
  chartOption: Record<string, unknown>;
  noDataLabel: string;
}) {
  const useCompactList = legend.length > 0 && legend.length <= 2;

  return (
    <Card title={title} description={description} actions={actions} loading={loading}>
      {legend.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200/80 text-sm text-slate-500 dark:border-white/10 dark:text-white/45">
          {noDataLabel}
        </div>
      ) : useCompactList ? (
        <CompactDistributionList items={legend} />
      ) : (
        <div className="flex h-auto flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] md:items-center">
          <EChart option={chartOption} className="h-56 min-w-0 md:h-[22rem]" />
          <DistributionLegendList items={legend} onToggle={onToggleLegend} />
        </div>
      )}
    </Card>
  );
}

export function MonitorDistributionSections({
  t,
  timeRange,
  modelMetric,
  setModelMetric,
  modelDistributionOption,
  modelDistributionLegend,
  toggleModelDistributionLegend,
  dailyTrendOption,
  dailyLegendAvailability,
  dailyLegendSelected,
  toggleDailyLegend,
  hasDailyTrend,
  apikeyDistributionData,
  apikeyMetric,
  setApikeyMetric,
  apikeyDistributionOption,
  apikeyDistributionLegend,
  toggleApikeyDistributionLegend,
  isRefreshing,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  timeRange: number;
  modelMetric: "requests" | "tokens";
  setModelMetric: (value: "requests" | "tokens") => void;
  modelDistributionOption: Record<string, unknown>;
  modelDistributionLegend: DistributionLegendItem[];
  toggleModelDistributionLegend: (name: string) => void;
  dailyTrendOption: Record<string, unknown>;
  dailyLegendAvailability: { hasInput: boolean; hasOutput: boolean; hasRequests: boolean };
  dailyLegendSelected: Record<string, boolean>;
  toggleDailyLegend: (key: string) => void;
  hasDailyTrend: boolean;
  apikeyDistributionData: Array<{ name: string; value: number }>;
  apikeyMetric: "requests" | "tokens";
  setApikeyMetric: (value: "requests" | "tokens") => void;
  apikeyDistributionOption: Record<string, unknown>;
  apikeyDistributionLegend: DistributionLegendItem[];
  toggleApikeyDistributionLegend: (name: string) => void;
  isRefreshing: boolean;
}) {
  const modelActions = (
    <Tabs value={modelMetric} onValueChange={(next) => setModelMetric(next as typeof modelMetric)}>
      <TabsList>
        <TabsTrigger value="requests">{t("monitor.requests")}</TabsTrigger>
        <TabsTrigger value="tokens">{t("monitor.token")}</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  const apikeyActions = (
    <Tabs
      value={apikeyMetric}
      onValueChange={(next) => setApikeyMetric(next as typeof apikeyMetric)}
    >
      <TabsList>
        <TabsTrigger value="requests">{t("monitor.requests")}</TabsTrigger>
        <TabsTrigger value="tokens">{t("monitor.token")}</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <>
      <MonitorSectionHeader title={t("monitor.section_distribution")} />
      <Reveal>
        <section className="grid gap-4 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
          <DistributionPanel
            title={t("monitor.model_distribution")}
            description={t("monitor.last_days_desc", {
              days: timeRange,
              metric: modelMetric === "requests" ? t("monitor.requests") : t("monitor.token"),
            })}
            actions={modelActions}
            loading={isRefreshing}
            legend={modelDistributionLegend}
            onToggleLegend={toggleModelDistributionLegend}
            chartOption={modelDistributionOption}
            noDataLabel={t("monitor.no_data")}
          />

          <Card
            title={t("monitor.daily_usage_trend")}
            description={t("monitor.daily_desc", { days: timeRange })}
            loading={isRefreshing}
          >
            {hasDailyTrend ? (
              <div className="flex h-72 min-w-0 flex-col overflow-hidden">
                <EChart
                  option={dailyTrendOption}
                  className="min-h-0 min-w-0 flex-1"
                  replaceMerge="series"
                />
                <ChartLegend
                  className="shrink-0 pt-4"
                  items={[
                    ...(dailyLegendAvailability.hasInput
                      ? [
                          {
                            key: "daily_input",
                            label: t("monitor.input_token"),
                            colorClass: "bg-violet-400",
                            enabled: dailyLegendSelected["daily_input"] ?? true,
                            onToggle: toggleDailyLegend,
                          },
                        ]
                      : []),
                    ...(dailyLegendAvailability.hasOutput
                      ? [
                          {
                            key: "daily_output",
                            label: t("monitor.output_token_legend"),
                            colorClass: "bg-emerald-400",
                            enabled: dailyLegendSelected["daily_output"] ?? true,
                            onToggle: toggleDailyLegend,
                          },
                        ]
                      : []),
                    ...(dailyLegendAvailability.hasRequests
                      ? [
                          {
                            key: "daily_requests",
                            label: t("monitor.requests"),
                            colorClass: "bg-blue-500",
                            enabled: dailyLegendSelected["daily_requests"] ?? true,
                            onToggle: toggleDailyLegend,
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-200/80 bg-slate-50/50 text-center dark:border-white/10 dark:bg-white/[0.02]">
                <div className="max-w-sm px-4">
                  <p className="text-sm font-semibold text-slate-700 dark:text-white/80">
                    {t("monitor.daily_empty_title")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-white/55">
                    {t("monitor.daily_empty_desc")}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </section>
      </Reveal>

      {apikeyDistributionData.length > 0 ? (
        <Reveal>
          <DistributionPanel
            title={t("monitor.apikey_distribution")}
            description={t("monitor.apikey_distribution_desc", {
              days: timeRange,
              metric: apikeyMetric === "requests" ? t("monitor.requests") : t("monitor.token"),
            })}
            actions={apikeyActions}
            loading={isRefreshing}
            legend={apikeyDistributionLegend}
            onToggleLegend={toggleApikeyDistributionLegend}
            chartOption={apikeyDistributionOption}
            noDataLabel={t("monitor.no_data")}
          />
        </Reveal>
      ) : null}
    </>
  );
}

export function MonitorHourlySections({
  t,
  isRefreshing,
  modelHourWindow,
  setModelHourWindow,
  hourlyModelLegendKeys,
  hourlyModelOption,
  hourlySeries,
  getHourlyModelSeriesLabel,
  hourlyModelPalette,
  hourlyModelSelected,
  toggleHourlyModelLegend,
  tokenHourWindow,
  setTokenHourWindow,
  hourlyTokenOption,
  hourlyTokenLabels,
  hourlyTokenPalette,
  hourlyTokenSelected,
  toggleHourlyTokenLegend,
  hasHourlyData,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  isRefreshing: boolean;
  modelHourWindow: HourWindow;
  setModelHourWindow: (value: HourWindow) => void;
  hourlyModelLegendKeys: string[];
  hourlyModelOption: Record<string, unknown>;
  hourlySeries: {
    modelKeys: string[];
    tokenKeys: string[];
  };
  getHourlyModelSeriesLabel: (key: string) => string;
  hourlyModelPalette: { classByKey: Record<string, string> };
  hourlyModelSelected: Record<string, boolean>;
  toggleHourlyModelLegend: (key: string) => void;
  tokenHourWindow: HourWindow;
  setTokenHourWindow: (value: HourWindow) => void;
  hourlyTokenOption: Record<string, unknown>;
  hourlyTokenLabels: Record<string, string>;
  hourlyTokenPalette: { classByKey: Record<string, string> };
  hourlyTokenSelected: Record<string, boolean>;
  toggleHourlyTokenLegend: (key: string) => void;
  hasHourlyData: boolean;
}) {
  if (!hasHourlyData) {
    return (
      <>
        <MonitorSectionHeader title={t("monitor.section_realtime")} />
        <Reveal>
          <section className="rounded-2xl border border-dashed border-slate-200/80 bg-white p-8 text-center dark:border-white/10 dark:bg-neutral-950/60">
            <p className="text-sm font-semibold text-slate-700 dark:text-white/80">
              {t("monitor.hourly_empty_title")}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-white/55">
              {t("monitor.hourly_empty_desc")}
            </p>
          </section>
        </Reveal>
      </>
    );
  }

  return (
    <>
      <MonitorSectionHeader title={t("monitor.section_realtime")} />
      <section className="grid gap-4 xl:grid-cols-2">
        <Reveal>
          <Card
            title={t("monitor.hourly_model.title")}
            description={t("monitor.hourly_model_desc")}
            actions={
              <HourWindowSelector value={modelHourWindow as HourWindow} onChange={setModelHourWindow} />
            }
            loading={isRefreshing}
          >
            <EChart option={hourlyModelOption} className="h-64 sm:h-72" replaceMerge="series" />
            <ChartLegend
              className="max-h-32 justify-start overflow-y-auto pt-4 sm:max-h-none sm:justify-center"
              items={hourlyModelLegendKeys.map((key) => ({
                key,
                label: getHourlyModelSeriesLabel(key),
                colorClass: hourlyModelPalette.classByKey[key] ?? "bg-slate-400",
                enabled: hourlyModelSelected[key] ?? true,
                onToggle: toggleHourlyModelLegend,
              }))}
            />
          </Card>
        </Reveal>

        <Reveal>
          <Card
            title={t("monitor.hourly_token.title")}
            description={t("monitor.hourly_token_desc")}
            actions={
              <HourWindowSelector value={tokenHourWindow as HourWindow} onChange={setTokenHourWindow} />
            }
            loading={isRefreshing}
          >
            <EChart option={hourlyTokenOption} className="h-64 sm:h-72" replaceMerge="series" />
            <ChartLegend
              className="max-h-32 justify-start overflow-y-auto pt-4 sm:max-h-none sm:justify-center"
              items={hourlySeries.tokenKeys.map((key) => ({
                key,
                label: hourlyTokenLabels[key] ?? key,
                colorClass: hourlyTokenPalette.classByKey[key] ?? "bg-slate-400",
                enabled: hourlyTokenSelected[key] ?? true,
                onToggle: toggleHourlyTokenLegend,
              }))}
            />
          </Card>
        </Reveal>
      </section>
    </>
  );
}
