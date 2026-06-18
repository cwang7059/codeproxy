import { CHART_COLORS } from "@/modules/monitor/monitor-constants";
import { formatCompact } from "@/modules/monitor/monitor-format";
import type { ModelDistributionDatum } from "@/modules/monitor/chart-options/types";

export const createModelDistributionOption = (input: {
  isDark: boolean;
  data: ModelDistributionDatum[];
  centerLabel?: string;
  centerValue?: string;
}): Record<string, unknown> => {
  const centerGraphic =
    input.centerLabel && input.centerValue
      ? [
          {
            type: "text",
            left: "center",
            top: "44%",
            style: {
              text: input.centerValue,
              textAlign: "center",
              fill: input.isDark ? "rgba(255,255,255,0.92)" : "#0f172a",
              fontSize: 20,
              fontWeight: 700,
            },
          },
          {
            type: "text",
            left: "center",
            top: "54%",
            style: {
              text: input.centerLabel,
              textAlign: "center",
              fill: input.isDark ? "rgba(255,255,255,0.55)" : "#64748b",
              fontSize: 11,
              fontWeight: 500,
            },
          },
        ]
      : [];

  return {
    backgroundColor: "transparent",
    color: [...CHART_COLORS, "#94a3b8"],
    graphic: centerGraphic,
    tooltip: {
      trigger: "item",
      renderMode: "html",
      appendToBody: false,
      confine: true,
      borderWidth: 0,
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      textStyle: { color: "#fff" },
      extraCssText: "z-index: 10000;",
      formatter: (params: { name: string; value: number; percent: number }) => {
        const valueLabel = formatCompact(params.value ?? 0);
        return `${params.name}<br/>${valueLabel}（${(params.percent ?? 0).toFixed(1)}%）`;
      },
    },
    series: [
      {
        name: "Model",
        type: "pie",
        radius: ["52%", "74%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: {
          borderRadius: 3,
          borderWidth: 2,
          borderColor: input.isDark ? "rgba(10,10,10,0.75)" : "rgba(255,255,255,0.92)",
        },
        emphasis: { scale: true, scaleSize: 6 },
        data: input.data,
      },
    ],
    animationEasing: "cubicOut" as const,
    animationDuration: 520,
    animationDurationUpdate: 360,
  };
};
