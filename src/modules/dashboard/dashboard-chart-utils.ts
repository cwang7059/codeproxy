import type { ECBasicOption } from "echarts/types/dist/shared";
import type { DashboardThroughputPoint, DashboardTrendPoint } from "@/lib/http/apis/usage";

export const formatNumber = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}m`
    : n >= 10_000
      ? `${(n / 1000).toFixed(1)}k`
      : n.toLocaleString();

export const formatCompactNumber = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}b`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
};

const throughputNumberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

export const formatThroughputValue = (value: number) =>
  throughputNumberFormatter.format(Number.isFinite(value) ? value : 0);

export const formatRate = (rate: number) => `${rate.toFixed(2)}%`;
export const formatCurrency = (value: number) => `$${value.toFixed(4)}`;

export const hasTrendData = (points: DashboardTrendPoint[] | undefined) =>
  Array.isArray(points) && points.length >= 2 && points.some((point) => point.value > 0);

export const formatThroughputTooltip = (params: unknown) => {
  const items = Array.isArray(params) ? params : [params];
  const first = items[0] as { axisValueLabel?: string } | undefined;
  const title = first?.axisValueLabel ?? "";
  const lines = items.map((item) => {
    const entry = item as { marker?: string; seriesName?: string; data?: number };
    return `${entry?.marker ?? ""}${entry?.seriesName ?? ""} ${formatThroughputValue(Number(entry?.data ?? 0))}`;
  });
  return [title, ...lines].join("<br/>");
};

export function createSparklineOption(points: DashboardTrendPoint[], color: string): ECBasicOption {
  const labels = points.map((point) => point.label);
  const values = points.map((point) => point.value);

  return {
    animationDuration: 320,
    animationDurationUpdate: 240,
    grid: { left: 0, right: 0, top: 6, bottom: 0 },
    tooltip: {
      trigger: "axis",
      borderWidth: 0,
      backgroundColor: "rgba(15, 23, 42, 0.9)",
      textStyle: { color: "#fff", fontSize: 11 },
      formatter: (params: unknown) => {
        const first = Array.isArray(params) ? params[0] : params;
        const entry = first as { axisValueLabel?: string; data?: number } | undefined;
        return `${entry?.axisValueLabel ?? ""}<br/>${formatNumber(Number(entry?.data ?? 0))}`;
      },
    },
    xAxis: {
      type: "category",
      data: labels,
      show: false,
      boundaryGap: false,
    },
    yAxis: {
      type: "value",
      show: false,
      min: (value: { min: number }) => Math.min(0, value.min),
    },
    series: [
      {
        id: "sparkline",
        name: "trend",
        type: "line",
        data: values,
        smooth: true,
        symbol: "none",
        lineStyle: { color, width: 2.5 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${color}33` },
              { offset: 1, color: `${color}00` },
            ],
          },
        },
      },
    ],
  };
}

export function createThroughputOption(
  points: DashboardThroughputPoint[],
  showRPM: boolean,
  showTPM: boolean,
): ECBasicOption {
  const labels = points.map((point) => point.label);
  const rpmValues = points.map((point) => point.rpm);
  const tpmValues = points.map((point) => point.tpm);

  return {
    animationDuration: 360,
    animationDurationUpdate: 80,
    tooltip: {
      trigger: "axis",
      borderWidth: 0,
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      textStyle: { color: "#fff" },
      formatter: formatThroughputTooltip,
    },
    grid: { left: 12, right: 12, top: 12, bottom: 22, containLabel: true },
    xAxis: {
      type: "category",
      data: labels,
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "rgba(148,163,184,0.45)" } },
      axisLabel: { color: "#64748b", fontSize: 10, hideOverlap: true },
    },
    yAxis: [
      {
        type: "value",
        splitNumber: 4,
        axisLabel: {
          color: "#64748b",
          fontSize: 10,
          formatter: (value: number) => formatThroughputValue(value),
        },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.16)" } },
      },
      {
        type: "value",
        splitNumber: 4,
        axisLabel: {
          color: "#64748b",
          fontSize: 10,
          formatter: (value: number) => formatThroughputValue(value),
        },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        id: "rpm",
        name: "RPM",
        type: "line",
        yAxisIndex: 0,
        data: showRPM ? rpmValues : [],
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3, color: "#2563eb" },
        itemStyle: { color: "#2563eb" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(37,99,235,0.18)" },
              { offset: 1, color: "rgba(37,99,235,0.02)" },
            ],
          },
        },
      },
      {
        id: "tpm",
        name: "TPM",
        type: "line",
        yAxisIndex: 1,
        data: showTPM ? tpmValues : [],
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3, color: "#7c3aed" },
        itemStyle: { color: "#7c3aed" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(124,58,237,0.14)" },
              { offset: 1, color: "rgba(124,58,237,0.02)" },
            ],
          },
        },
      },
    ],
  };
}
