import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const root = resolve(__dirname, "../../..");

const readModule = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("dashboard card composition", () => {
  test("uses the shared Card component for dashboard KPI cards", () => {
    const pageSource = readModule("modules/dashboard/DashboardPage.tsx");
    const kpiSource = readModule("modules/dashboard/components/DashboardKpiCard.tsx");
    const businessSource = readModule("modules/dashboard/components/DashboardBusinessSection.tsx");
    const throughputSource = readModule("modules/dashboard/components/ThroughputTrendChart.tsx");
    const constantsSource = readModule("modules/dashboard/dashboard-constants.ts");
    const chartUtilsSource = readModule("modules/dashboard/dashboard-chart-utils.ts");

    expect(pageSource).toContain('from "@/modules/dashboard/useSystemStats"');
    expect(pageSource).toContain("ThroughputTrendChart");
    expect(pageSource).toContain("DashboardBusinessSection");
    expect(pageSource).toContain("summary?.trends");
    expect(pageSource).toContain("const { stats, connected } = useSystemStats(5)");
    expect(pageSource).toContain("rpm={stats?.total_rpm ?? 0}");
    expect(pageSource).toContain("tpm={stats?.total_tpm ?? 0}");
    expect(pageSource).toContain("meta.generated_at");
    expect(pageSource).toContain("const autoRefreshMs = range > 30 ? 60_000 : 5_000");
    expect(pageSource).toContain("}, autoRefreshMs);");
    expect(pageSource).not.toContain('replaceMerge="series"');
    expect(pageSource).not.toContain('from "@/modules/monitor/MonitorPagePieces"');
    expect(pageSource).not.toContain("<KpiCard");

    expect(kpiSource).toContain('from "@/modules/ui/Card"');
    expect(kpiSource).toContain('from "@/modules/ui/charts/EChart"');
    expect(kpiSource).toContain('<EChart option={option} className="h-10" overflowVisible />');
    expect(kpiSource).toContain('from "react-router-dom"');

    expect(businessSource).toContain("createSparklineOption");
    expect(businessSource).toContain('"dashboard.section_business"');
    expect(kpiSource).toContain('"dashboard.sparkline_empty"');

    expect(throughputSource).toContain("ChartLegend");
    expect(throughputSource).toContain('from "@/modules/ui/Card"');

    expect(constantsSource).toContain("const DASHBOARD_RANGES = [1, 7, 30, 365, 1095] as const");
    expect(constantsSource).toContain("const PRIMARY_DASHBOARD_RANGES = [1, 7, 30] as const");
    expect(constantsSource).toContain('"dashboard.last_365_days"');
    expect(constantsSource).toContain('"dashboard.last_1095_days"');

    expect(chartUtilsSource).toContain("createSparklineOption");
    expect(chartUtilsSource).toContain("createThroughputOption");
  });

  test("formats throughput chart values with at most two decimal places", () => {
    const chartUtilsSource = readModule("modules/dashboard/dashboard-chart-utils.ts");
    const throughputSource = readModule("modules/dashboard/components/ThroughputTrendChart.tsx");

    expect(chartUtilsSource).toContain("formatThroughputValue");
    expect(chartUtilsSource).toContain("maximumFractionDigits: 2");
    expect(chartUtilsSource).toContain("formatThroughputTooltip");
    expect(chartUtilsSource).toContain("formatter: formatThroughputTooltip");
    expect(throughputSource).toContain('"dashboard.throughput_empty_title"');
  });

  test("uses the shared Card component for system monitor panels", () => {
    const source = readModule("modules/dashboard/SystemMonitorSection.tsx");

    expect(source).toContain('from "@/modules/ui/Card"');
    expect(source).toContain("AverageLatencyCard");
    expect(source).toContain("apiKeyCount");
    expect(source).toContain("channelCount");
    expect(source).toContain("stats?: SystemStats | null");
    expect(source).toContain("connected?: boolean");
    expect(source).toContain("dashboard-system-utils");
    expect(source).not.toContain("useSystemStats(3)");
    expect(source).not.toContain("ConcurrencyCard");
    expect(source).not.toContain('className="rounded-2xl border border-slate-200 bg-white/50');
    expect(source).not.toContain('className="rounded-xl border border-slate-200/80 bg-white');
    expect(source).not.toContain(
      'className="min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white',
    );
  });

  test("uses health overview with breakdown and updated system monitor grid", () => {
    const source = readModule("modules/dashboard/SystemMonitorSection.tsx");

    expect(source).toContain("HealthOverviewCard");
    expect(source).toContain("DiskUsageRingCard");
    expect(source).toContain("buildHealthScoreFactors");
    expect(source).toContain("grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_280px]");
    expect(source).not.toContain("HealthHeroCard");
    expect(source).not.toContain('label={t("system_monitor.disk_free")}');
  });

  test("summarizes api keys in channel mini kpi instead of latency card headline", () => {
    const source = readModule("modules/dashboard/SystemMonitorSection.tsx");

    expect(source).toContain('t("system_monitor.key_count_summary"');
    expect(source).toContain('t("system_monitor.channel_count")');
    expect(source).not.toContain('t("system_monitor.users")');
  });

  test("includes dark mode surfaces for throughput and system monitor summary cards", () => {
    const throughputSource = readModule("modules/dashboard/components/ThroughputTrendChart.tsx");
    const kpiSource = readModule("modules/dashboard/components/DashboardKpiCard.tsx");
    const systemMonitorSource = readModule("modules/dashboard/SystemMonitorSection.tsx");

    expect(throughputSource).toContain("dark:bg-neutral-900/70");
    expect(kpiSource).toContain("dark:text-slate-200");
    expect(systemMonitorSource).toContain("dark:bg-neutral-950/85");
    expect(systemMonitorSource).toContain("dark:text-white/80");
  });
});
