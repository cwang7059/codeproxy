import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { configApi, usageApi } from "@/lib/http/apis";
import { useTheme } from "@/modules/ui/ThemeProvider";
import { CHART_COLOR_CLASSES, HOURLY_MODEL_COLORS } from "@/modules/monitor/monitor-constants";
import { formatCompact, formatMonthDay } from "@/modules/monitor/monitor-format";
import {
  formatHourAxisLabel,
  sortHourKeys,
} from "@/modules/monitor/monitor-hourly-utils";
import {
  createDailyTrendOption,
  createHourlyModelOption,
  createHourlyTokenOption,
  createModelDistributionOption,
} from "@/modules/monitor/monitor-chart-options";
import {
  MonitorDistributionSections,
  MonitorHourlySections,
  MonitorKpiSection,
  MonitorRecordingNotice,
} from "@/modules/monitor/MonitorDashboardSections";
import { useMonitorDashboardState } from "@/modules/monitor/hooks/useMonitorDashboardState";
import { MonitorToolbarSection } from "@/modules/monitor/MonitorToolbarSection";
import { useTranslation } from "react-i18next";

const DAILY_LEGEND_KEYS = {
  input: "daily_input",
  output: "daily_output",
  requests: "daily_requests",
} as const;
const HOURLY_MODEL_OTHER_KEY = "__other__";
const HOURLY_MODEL_TOTAL_KEY = "__total_requests__";
const HOURLY_TOKEN_KEYS = {
  input: "hourly_input",
  output: "hourly_output",
  reasoning: "hourly_reasoning",
  cached: "hourly_cached",
  total: "__total_token__",
} as const;

const readRuntimeFlag = (record: Record<string, unknown>, ...keys: string[]): boolean => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }
    if (typeof value === "number") return value !== 0;
  }
  return false;
};

export function MonitorPage() {
  const { t } = useTranslation();
  const {
    state: { mode },
  } = useTheme();
  const isDark = mode === "dark";

  const {
    compact,
    timeRange,
    setTimeRange,
    apiFilterInput,
    setApiFilterInput,
    apiFilter,
    applyFilter,
    clearFilter,
    modelHourWindow,
    setModelHourWindow,
    tokenHourWindow,
    setTokenHourWindow,
    modelMetric,
    setModelMetric,
    apikeyMetric,
    setApikeyMetric,
  } = useMonitorDashboardState();

  const [dailyLegendSelected, setDailyLegendSelected] = useState<Record<string, boolean>>({
    [DAILY_LEGEND_KEYS.input]: true,
    [DAILY_LEGEND_KEYS.output]: true,
    [DAILY_LEGEND_KEYS.requests]: true,
  });

  const [hourlyModelSelected, setHourlyModelSelected] = useState<Record<string, boolean>>({
    [HOURLY_MODEL_TOTAL_KEY]: true,
  });

  const [hourlyTokenSelected, setHourlyTokenSelected] = useState<Record<string, boolean>>({
    [HOURLY_TOKEN_KEYS.input]: true,
    [HOURLY_TOKEN_KEYS.output]: true,
    [HOURLY_TOKEN_KEYS.reasoning]: true,
    [HOURLY_TOKEN_KEYS.cached]: true,
    [HOURLY_TOKEN_KEYS.total]: true,
  });

  const [chartData, setChartData] = useState<import("@/lib/http/types").ChartDataResponse | null>(
    null,
  );
  const [modelDistributionSelected, setModelDistributionSelected] = useState<
    Record<string, boolean>
  >({});
  const [apikeyDistributionSelected, setApikeyDistributionSelected] = useState<
    Record<string, boolean>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [requestLogEnabled, setRequestLogEnabled] = useState<boolean | null>(null);
  const [usageStatisticsEnabled, setUsageStatisticsEnabled] = useState<boolean | null>(null);
  const [isEnablingRecording, setIsEnablingRecording] = useState(false);

  const refreshRuntimeFlags = useCallback(async () => {
    const config = await configApi.getConfig();
    const record =
      config && typeof config === "object" && !Array.isArray(config)
        ? (config as Record<string, unknown>)
        : {};

    setRequestLogEnabled(readRuntimeFlag(record, "request-log", "requestLog"));
    setUsageStatisticsEnabled(
      readRuntimeFlag(record, "usage-statistics-enabled", "usageStatisticsEnabled"),
    );
  }, []);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const [chartResp] = await Promise.all([
        usageApi.getChartData(timeRange, apiFilter),
        refreshRuntimeFlags().catch(() => undefined),
      ]);
      startTransition(() => {
        setChartData(chartResp);
        setLastUpdatedAt(Date.now());
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : t("monitor.failed_fetch");
      setError(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [apiFilter, refreshRuntimeFlags, t, timeRange]);

  const enableRecording = useCallback(async () => {
    setIsEnablingRecording(true);
    setError(null);
    try {
      await Promise.all([configApi.updateUsageStatistics(true), configApi.updateRequestLog(true)]);
      setUsageStatisticsEnabled(true);
      setRequestLogEnabled(true);
      await refreshData();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : t("monitor.recording_enable_failed");
      setError(message);
    } finally {
      setIsEnablingRecording(false);
    }
  }, [refreshData, t]);

  const metrics = useMemo(() => {
    let requests = 0;
    let failed = 0;
    let inputTokens = 0;
    let outputTokens = 0;

    if (chartData?.daily_series) {
      for (const pt of chartData.daily_series) {
        requests += pt.requests || 0;
        failed += pt.failed_requests || 0;
        inputTokens += pt.input_tokens || 0;
        outputTokens += pt.output_tokens || 0;
      }
    }

    const success = requests - failed;
    const rate = requests > 0 ? (success / requests) * 100 : 0;

    return {
      totalRequests: requests,
      successCount: success,
      failureCount: failed,
      successRate: rate,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }, [chartData]);

  const toggleDailyLegend = useCallback((key: string) => {
    if (
      !Object.values(DAILY_LEGEND_KEYS).includes(
        key as (typeof DAILY_LEGEND_KEYS)[keyof typeof DAILY_LEGEND_KEYS],
      )
    ) {
      return;
    }
    setDailyLegendSelected((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }, []);

  const toggleHourlyModelLegend = useCallback((key: string) => {
    setHourlyModelSelected((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }, []);

  const toggleHourlyTokenLegend = useCallback((key: string) => {
    setHourlyTokenSelected((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }, []);

  const hasData = metrics.totalRequests > 0;
  const isLoading = isRefreshing || isPending;
  const shouldShowRecordingNotice = requestLogEnabled === false || usageStatisticsEnabled === false;

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const modelTotals = useMemo(() => {
    if (!chartData?.model_distribution) return [];
    return chartData.model_distribution.sort(
      (left, right) => right.requests - left.requests || left.model.localeCompare(right.model),
    );
  }, [chartData]);

  const sortedModelsByMetric = useMemo(() => {
    const list = [...modelTotals];
    list.sort((left, right) => {
      const leftValue = modelMetric === "requests" ? left.requests : left.tokens;
      const rightValue = modelMetric === "requests" ? right.requests : right.tokens;
      return rightValue - leftValue || left.model.localeCompare(right.model);
    });
    return list;
  }, [modelMetric, modelTotals]);

  const topModelKeys = useMemo(
    () => sortedModelsByMetric.slice(0, 5).map((item) => item.model),
    [sortedModelsByMetric],
  );

  const modelDistributionData = useMemo(() => {
    const top = sortedModelsByMetric.slice(0, 10);
    const otherValue = sortedModelsByMetric.slice(10).reduce((acc, item) => {
      return acc + (modelMetric === "requests" ? item.requests : item.tokens);
    }, 0);

    const data = top.map((item) => ({
      name: item.model,
      value: modelMetric === "requests" ? item.requests : item.tokens,
    }));

    if (otherValue > 0) {
      data.push({ name: t("common.other"), value: otherValue });
    }
    return data;
  }, [modelMetric, sortedModelsByMetric, t]);

  useEffect(() => {
    setModelDistributionSelected((prev) => {
      const next = { ...prev };
      for (const item of modelDistributionData) {
        if (!(item.name in next)) next[item.name] = true;
      }
      return next;
    });
  }, [modelDistributionData]);

  const visibleModelDistributionData = useMemo(
    () => modelDistributionData.filter((item) => modelDistributionSelected[item.name] ?? true),
    [modelDistributionData, modelDistributionSelected],
  );

  const dailySeries = useMemo(() => {
    if (!chartData?.daily_series) return [];

    // Parse backend date strings ("YYYY-MM-DD") to Date objects and format label
    // Using UTC parsing trick to match backend day strings consistently
    return chartData.daily_series.map((pt) => {
      // Create a date assuming noon UTC so boundary issues don't push it across
      // local day boundaries.
      const match = pt.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      let label = pt.date;
      if (match) {
        // Create local Date from the year, month, day
        const localD = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        label = formatMonthDay(localD);
      }
      return {
        label,
        requests: pt.requests,
        inputTokens: pt.input_tokens,
        outputTokens: pt.output_tokens,
        totalTokens: pt.input_tokens + pt.output_tokens,
      };
    });
  }, [chartData]);

  const hourlySeries = useMemo(() => {
    const modelKeys = [...topModelKeys, HOURLY_MODEL_OTHER_KEY];
    const modelBucketMap = new Map<string, Map<string, number>>();

    for (const point of chartData?.hourly_models || []) {
      if (!modelBucketMap.has(point.hour)) {
        modelBucketMap.set(point.hour, new Map());
      }
      const stacksMap = modelBucketMap.get(point.hour)!;
      stacksMap.set(point.model, (stacksMap.get(point.model) || 0) + point.requests);
    }

    const modelPoints = sortHourKeys([...modelBucketMap.keys()]).map((hourKey) => {
      const stacksMap = modelBucketMap.get(hourKey)!;
      const stacks = modelKeys.map((key) => {
        if (key === HOURLY_MODEL_OTHER_KEY) {
          let sum = 0;
          for (const [model, value] of stacksMap.entries()) {
            if (!topModelKeys.includes(model)) sum += value;
          }
          return { key, value: sum };
        }
        return { key, value: stacksMap.get(key) || 0 };
      });
      return { label: formatHourAxisLabel(hourKey), stacks };
    });

    const tokenByHour = new Map(
      (chartData?.hourly_tokens || []).map((point) => [point.hour, point] as const),
    );
    const tokenPoints = sortHourKeys([...tokenByHour.keys()]).map((hourKey) => {
      const point = tokenByHour.get(hourKey)!;
      return {
        label: formatHourAxisLabel(hourKey),
        stacks: [
          { key: HOURLY_TOKEN_KEYS.input, value: point.input_tokens },
          { key: HOURLY_TOKEN_KEYS.output, value: point.output_tokens },
          { key: HOURLY_TOKEN_KEYS.reasoning, value: point.reasoning_tokens },
          { key: HOURLY_TOKEN_KEYS.cached, value: point.cached_tokens },
          { key: HOURLY_TOKEN_KEYS.total, value: point.total_tokens },
        ],
      };
    });

    return {
      modelKeys,
      modelPoints,
      tokenKeys: [
        HOURLY_TOKEN_KEYS.input,
        HOURLY_TOKEN_KEYS.output,
        HOURLY_TOKEN_KEYS.reasoning,
        HOURLY_TOKEN_KEYS.cached,
        HOURLY_TOKEN_KEYS.total,
      ],
      tokenPoints,
    };
  }, [chartData, topModelKeys]);

  const hourlyModelPalette = useMemo(() => {
    const palette = [
      "bg-emerald-400",
      "bg-violet-400",
      "bg-amber-400",
      "bg-pink-300",
      "bg-teal-400",
    ];
    const colorByKey: Record<string, string> = {};
    const classByKey: Record<string, string> = {};

    hourlySeries.modelKeys.forEach((key, index) => {
      if (key === HOURLY_MODEL_OTHER_KEY) {
        colorByKey[key] = "rgba(148,163,184,0.58)";
        classByKey[key] = "bg-slate-400";
        return;
      }
      colorByKey[key] = HOURLY_MODEL_COLORS[index % HOURLY_MODEL_COLORS.length];
      classByKey[key] = palette[index % palette.length] ?? "bg-slate-400";
    });

    colorByKey[HOURLY_MODEL_TOTAL_KEY] = "#3b82f6";
    classByKey[HOURLY_MODEL_TOTAL_KEY] = "bg-blue-500";

    return { colorByKey, classByKey };
  }, [hourlySeries.modelKeys]);

  const hourlyTokenPalette = useMemo(() => {
    return {
      colorByKey: {
        [HOURLY_TOKEN_KEYS.input]: "rgba(110,231,183,0.88)",
        [HOURLY_TOKEN_KEYS.output]: "rgba(196,181,253,0.88)",
        [HOURLY_TOKEN_KEYS.reasoning]: "rgba(252,211,77,0.88)",
        [HOURLY_TOKEN_KEYS.cached]: "rgba(94,234,212,0.88)",
        [HOURLY_TOKEN_KEYS.total]: "#3b82f6",
      } as Record<string, string>,
      classByKey: {
        [HOURLY_TOKEN_KEYS.input]: "bg-emerald-400",
        [HOURLY_TOKEN_KEYS.output]: "bg-violet-400",
        [HOURLY_TOKEN_KEYS.reasoning]: "bg-amber-400",
        [HOURLY_TOKEN_KEYS.cached]: "bg-teal-400",
        [HOURLY_TOKEN_KEYS.total]: "bg-blue-500",
      } as Record<string, string>,
    };
  }, []);

  useEffect(() => {
    setHourlyModelSelected((prev) => {
      const next = { ...prev };
      for (const key of hourlySeries.modelKeys) {
        if (!(key in next)) next[key] = true;
      }
      if (!(HOURLY_MODEL_TOTAL_KEY in next)) next[HOURLY_MODEL_TOTAL_KEY] = true;
      return next;
    });
  }, [hourlySeries.modelKeys]);

  useEffect(() => {
    setHourlyTokenSelected((prev) => {
      const next = { ...prev };
      for (const key of hourlySeries.tokenKeys) {
        if (!(key in next)) next[key] = true;
      }
      if (!(HOURLY_TOKEN_KEYS.total in next)) next[HOURLY_TOKEN_KEYS.total] = true;
      return next;
    });
  }, [hourlySeries.tokenKeys]);

  const modelDistributionOption = useMemo(() => {
    const total = visibleModelDistributionData.reduce(
      (acc, item) => acc + (Number.isFinite(item.value) ? item.value : 0),
      0,
    );
    return createModelDistributionOption({
      isDark,
      data: visibleModelDistributionData,
      centerLabel: t("monitor.distribution_center_total"),
      centerValue: formatCompact(total),
    });
  }, [isDark, t, visibleModelDistributionData]);

  // --- API Key Distribution ---
  const apikeyDistributionData = useMemo(() => {
    if (!chartData?.apikey_distribution) return [];
    const sorted = [...chartData.apikey_distribution].sort((a, b) => {
      const av = apikeyMetric === "requests" ? a.requests : a.tokens;
      const bv = apikeyMetric === "requests" ? b.requests : b.tokens;
      return bv - av;
    });
    const top = sorted.slice(0, 10);
    const otherValue = sorted.slice(10).reduce((acc, item) => {
      return acc + (apikeyMetric === "requests" ? item.requests : item.tokens);
    }, 0);
    const data = top.map((item) => ({
      name: item.name || item.api_key.slice(0, 8) + "…",
      value: apikeyMetric === "requests" ? item.requests : item.tokens,
    }));
    if (otherValue > 0) {
      data.push({ name: t("common.other"), value: otherValue });
    }
    return data;
  }, [apikeyMetric, chartData, t]);

  useEffect(() => {
    setApikeyDistributionSelected((prev) => {
      const next = { ...prev };
      for (const item of apikeyDistributionData) {
        if (!(item.name in next)) next[item.name] = true;
      }
      return next;
    });
  }, [apikeyDistributionData]);

  const visibleApikeyDistributionData = useMemo(
    () => apikeyDistributionData.filter((item) => apikeyDistributionSelected[item.name] ?? true),
    [apikeyDistributionData, apikeyDistributionSelected],
  );

  const apikeyDistributionOption = useMemo(() => {
    const total = visibleApikeyDistributionData.reduce(
      (acc, item) => acc + (Number.isFinite(item.value) ? item.value : 0),
      0,
    );
    return createModelDistributionOption({
      isDark,
      data: visibleApikeyDistributionData,
      centerLabel: t("monitor.distribution_center_total"),
      centerValue: formatCompact(total),
    });
  }, [isDark, t, visibleApikeyDistributionData]);

  const apikeyDistributionLegend = useMemo(() => {
    const total = apikeyDistributionData.reduce(
      (acc, item) => acc + (Number.isFinite(item.value) ? item.value : 0),
      0,
    );
    return apikeyDistributionData.map((item, index) => {
      const colorClass =
        index < CHART_COLOR_CLASSES.length ? CHART_COLOR_CLASSES[index] : "bg-slate-400";
      const value = Number(item.value ?? 0);
      const percent = total > 0 ? (value / total) * 100 : 0;
      return {
        name: item.name,
        valueLabel: formatCompact(value),
        percentLabel: `${percent.toFixed(1)}%`,
        colorClass,
        enabled: apikeyDistributionSelected[item.name] ?? true,
      };
    });
  }, [apikeyDistributionData, apikeyDistributionSelected]);

  const dailyLegendAvailability = useMemo(() => {
    const points = dailySeries.filter(
      (item) => item.requests > 0 || item.inputTokens > 0 || item.outputTokens > 0,
    );
    const visiblePoints = points.length > 0 ? points : dailySeries;
    const requestY = visiblePoints.map((item) => item.requests);
    const inputY = visiblePoints.map((item) => item.inputTokens);
    const outputY = visiblePoints.map((item) => item.outputTokens);

    return {
      hasInput: inputY.some((value) => value > 0),
      hasOutput: outputY.some((value) => value > 0),
      hasRequests: requestY.some((value) => value > 0),
    };
  }, [dailySeries]);

  const modelDistributionLegend = useMemo(() => {
    const total = modelDistributionData.reduce(
      (acc, item) => acc + (Number.isFinite(item.value) ? item.value : 0),
      0,
    );

    return modelDistributionData.map((item, index) => {
      const colorClass =
        index < CHART_COLOR_CLASSES.length ? CHART_COLOR_CLASSES[index] : "bg-slate-400";
      const value = Number(item.value ?? 0);
      const percent = total > 0 ? (value / total) * 100 : 0;

      return {
        name: item.name,
        valueLabel: formatCompact(value),
        percentLabel: `${percent.toFixed(1)}%`,
        colorClass,
        enabled: modelDistributionSelected[item.name] ?? true,
      };
    });
  }, [modelDistributionData, modelDistributionSelected]);

  const toggleModelDistributionLegend = useCallback((name: string) => {
    setModelDistributionSelected((prev) => ({ ...prev, [name]: !(prev[name] ?? true) }));
  }, []);

  const toggleApikeyDistributionLegend = useCallback((name: string) => {
    setApikeyDistributionSelected((prev) => ({ ...prev, [name]: !(prev[name] ?? true) }));
  }, []);

  const dailyTrendOption = useMemo(
    () =>
      createDailyTrendOption({
        dailySeries,
        dailyLegendSelected,
        legendKeys: DAILY_LEGEND_KEYS,
        labels: {
          input: t("monitor.input_token"),
          output: t("monitor.output_token_legend"),
          requests: t("monitor.requests"),
          tokenAxis: t("monitor.token"),
          requestAxis: t("monitor.requests"),
        },
        isDark,
        compact,
      }),
    [compact, dailyLegendSelected, dailySeries, isDark, t],
  );

  const getHourlyModelSeriesLabel = useCallback(
    (key: string) => {
      if (key === HOURLY_MODEL_OTHER_KEY) return t("common.other");
      if (key === HOURLY_MODEL_TOTAL_KEY) return t("monitor.total_requests");
      return key;
    },
    [t],
  );

  const hourlyTokenLabels = useMemo(
    () => ({
      [HOURLY_TOKEN_KEYS.input]: t("monitor.hourly_token.input"),
      [HOURLY_TOKEN_KEYS.output]: t("monitor.hourly_token.output"),
      [HOURLY_TOKEN_KEYS.reasoning]: t("monitor.hourly_token.reasoning"),
      [HOURLY_TOKEN_KEYS.cached]: t("monitor.hourly_token.cached"),
      [HOURLY_TOKEN_KEYS.total]: t("monitor.hourly_token.total"),
    }),
    [t],
  );

  const hourlyModelOption = useMemo(
    () =>
      createHourlyModelOption({
        hourlySeries,
        modelHourWindow,
        hourlyModelSelected,
        paletteColorByKey: hourlyModelPalette.colorByKey,
        totalLineKey: HOURLY_MODEL_TOTAL_KEY,
        getSeriesLabel: getHourlyModelSeriesLabel,
        isDark,
        compact,
      }),
    [
      compact,
      getHourlyModelSeriesLabel,
      hourlyModelPalette.colorByKey,
      hourlyModelSelected,
      hourlySeries.modelKeys,
      hourlySeries.modelPoints,
      isDark,
      modelHourWindow,
    ],
  );

  const hourlyTokenOption = useMemo(
    () =>
      createHourlyTokenOption({
        hourlySeries,
        tokenHourWindow,
        hourlyTokenSelected,
        paletteColorByKey: hourlyTokenPalette.colorByKey,
        labelsByKey: hourlyTokenLabels,
        totalLineKey: HOURLY_TOKEN_KEYS.total,
        isDark,
        compact,
      }),
    [
      compact,
      hourlySeries.tokenKeys,
      hourlySeries.tokenPoints,
      hourlyTokenLabels,
      hourlyTokenPalette.colorByKey,
      hourlyTokenSelected,
      isDark,
      tokenHourWindow,
    ],
  );

  const hourlyModelLegendKeys = useMemo(
    () => [...hourlySeries.modelKeys, HOURLY_MODEL_TOTAL_KEY],
    [hourlySeries.modelKeys],
  );

  const hasDailyTrend = useMemo(
    () =>
      dailySeries.some(
        (point) => point.requests > 0 || point.inputTokens > 0 || point.outputTokens > 0,
      ),
    [dailySeries],
  );

  const hasHourlyData = useMemo(
    () => hourlySeries.modelPoints.length > 0 || hourlySeries.tokenPoints.length > 0,
    [hourlySeries.modelPoints.length, hourlySeries.tokenPoints.length],
  );

  const lastUpdatedText = useMemo(() => {
    if (!lastUpdatedAt) return t("monitor.updated_fallback");
    return t("monitor.updated_at", {
      time: new Date(lastUpdatedAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }, [lastUpdatedAt, t]);

  return (
    <section className="flex flex-1 flex-col">
      <h1 className="sr-only">{t("monitor.title")}</h1>
      <div className="flex flex-1 flex-col rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgb(15_23_42_/_0.035)] dark:border-white/[0.06] dark:bg-neutral-950/70 dark:shadow-[0_1px_2px_rgb(0_0_0_/_0.22)]">
        <MonitorToolbarSection
          t={t}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          apiFilterInput={apiFilterInput}
          setApiFilterInput={setApiFilterInput}
          applyFilter={applyFilter}
          clearFilter={clearFilter}
          apiFilter={apiFilter}
          refreshData={() => void refreshData()}
          isLoading={isLoading}
          error={error}
          lastUpdatedText={lastUpdatedText}
        />

        {shouldShowRecordingNotice ? (
          <MonitorRecordingNotice
            t={t}
            requestLogEnabled={Boolean(requestLogEnabled)}
            usageStatisticsEnabled={Boolean(usageStatisticsEnabled)}
            isEnabling={isEnablingRecording}
            onEnable={() => void enableRecording()}
          />
        ) : null}

        <div className="space-y-6 px-5 pb-5">
          <MonitorKpiSection
            t={t}
            metrics={metrics}
            hasData={hasData}
            isLoading={isLoading}
            refreshData={refreshData}
          />

          {hasData ? (
            <>
              <MonitorDistributionSections
                t={t}
                timeRange={timeRange}
                modelMetric={modelMetric}
                setModelMetric={setModelMetric}
                modelDistributionOption={modelDistributionOption}
                modelDistributionLegend={modelDistributionLegend}
                toggleModelDistributionLegend={toggleModelDistributionLegend}
                dailyTrendOption={dailyTrendOption}
                dailyLegendAvailability={dailyLegendAvailability}
                dailyLegendSelected={dailyLegendSelected}
                toggleDailyLegend={toggleDailyLegend}
                hasDailyTrend={hasDailyTrend}
                apikeyDistributionData={apikeyDistributionData}
                apikeyMetric={apikeyMetric}
                setApikeyMetric={setApikeyMetric}
                apikeyDistributionOption={apikeyDistributionOption}
                apikeyDistributionLegend={apikeyDistributionLegend}
                toggleApikeyDistributionLegend={toggleApikeyDistributionLegend}
                isRefreshing={isRefreshing}
              />

              <MonitorHourlySections
                t={t}
                isRefreshing={isRefreshing}
                modelHourWindow={modelHourWindow}
                setModelHourWindow={setModelHourWindow}
                hourlyModelLegendKeys={hourlyModelLegendKeys}
                hourlyModelOption={hourlyModelOption}
                hourlySeries={hourlySeries}
                getHourlyModelSeriesLabel={getHourlyModelSeriesLabel}
                hourlyModelPalette={hourlyModelPalette}
                hourlyModelSelected={hourlyModelSelected}
                toggleHourlyModelLegend={toggleHourlyModelLegend}
                tokenHourWindow={tokenHourWindow}
                setTokenHourWindow={setTokenHourWindow}
                hourlyTokenOption={hourlyTokenOption}
                hourlyTokenLabels={hourlyTokenLabels}
                hourlyTokenPalette={hourlyTokenPalette}
                hourlyTokenSelected={hourlyTokenSelected}
                toggleHourlyTokenLegend={toggleHourlyTokenLegend}
                hasHourlyData={hasHourlyData}
              />
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
