import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { usageApi, type DashboardSummary } from "@/lib/http/apis/usage";
import { isPanelAdmin } from "@/lib/panel-role";
import { useAuth } from "@/modules/auth/AuthProvider";
import { DashboardBusinessSection } from "@/modules/dashboard/components/DashboardBusinessSection";
import { ThroughputTrendChart } from "@/modules/dashboard/components/ThroughputTrendChart";
import {
  EXTENDED_DASHBOARD_RANGES,
  PRIMARY_DASHBOARD_RANGES,
  RANGE_KEYS,
  type DashboardRange,
} from "@/modules/dashboard/dashboard-constants";
import { SetupChecklistSection } from "@/modules/dashboard/SetupChecklistSection";
import { SystemMonitorSection } from "@/modules/dashboard/SystemMonitorSection";
import { useSystemStats } from "@/modules/dashboard/useSystemStats";
import { Button } from "@/modules/ui/Button";
import { EmptyState } from "@/modules/ui/EmptyState";
import { PageToolbar } from "@/modules/ui/PageToolbar";
import { Select } from "@/modules/ui/Select";
import { Tabs, TabsList, TabsTrigger } from "@/modules/ui/Tabs";
import { useToast } from "@/modules/ui/ToastProvider";
import { useInterval } from "@/hooks/useInterval";

export function DashboardPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const auth = useAuth();
  const adminView = isPanelAdmin(auth.state.role);
  const { stats, connected } = useSystemStats(5);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [range, setRange] = useState<DashboardRange>(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [throughputLegend, setThroughputLegend] = useState({ rpm: true, tpm: true });

  const refresh = useCallback(
    async (days: DashboardRange, silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      if (!silent) {
        setError(null);
      }
      try {
        const data = await usageApi.getDashboardSummary(days);
        setSummary(data);
        if (!silent) {
          setError(null);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t("dashboard.load_failed");
        if (!silent) {
          setError(message);
          notify({ type: "error", message });
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [notify, t],
  );

  useEffect(() => {
    void refresh(range);
  }, [refresh, range]);

  const autoRefreshMs = range > 30 ? 60_000 : 15_000;

  useInterval(() => {
    void refresh(range, true);
  }, autoRefreshMs);

  const kpi = summary?.kpi;
  const trends = summary?.trends;
  const meta = summary?.meta ?? {};
  const generatedAt = meta.generated_at
    ? new Date(meta.generated_at).toLocaleString()
    : t("dashboard.updated_fallback");
  const throughputSeries = useMemo(
    () => trends?.throughput_series ?? [],
    [trends?.throughput_series],
  );
  const isExtendedRange = range === 365 || range === 1095;
  const channelCount = stats?.channel_latency?.length ?? 0;

  return (
    <section className="page-stack">
      <PageToolbar
        title={adminView ? t("dashboard.heading") : t("dashboard.my_usage_heading")}
        description={adminView ? t("dashboard.hero_subtitle") : t("dashboard.my_usage_subtitle")}
        actions={
          <>
            <Tabs
              value={isExtendedRange ? "" : String(range)}
              onValueChange={(next) => {
                if (next) setRange(Number(next) as DashboardRange);
              }}
            >
              <TabsList>
                {PRIMARY_DASHBOARD_RANGES.map((val) => (
                  <TabsTrigger key={val} value={String(val)}>
                    {t(RANGE_KEYS[val])}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Select
              value={isExtendedRange ? String(range) : ""}
              onChange={(value) => {
                if (value) setRange(Number(value) as DashboardRange);
              }}
              options={[
                { value: "", label: t("dashboard.more_ranges") },
                ...EXTENDED_DASHBOARD_RANGES.map((val) => ({
                  value: String(val),
                  label: t(RANGE_KEYS[val]),
                })),
              ]}
              aria-label={t("dashboard.more_ranges")}
              className="w-[132px]"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void refresh(range)}
              disabled={loading}
              title={t("dashboard.overview_hint", { time: generatedAt })}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {t("dashboard.refresh")}
            </Button>
          </>
        }
      />

      {error ? (
        <EmptyState
          title={t("dashboard.load_failed")}
          description={error}
          icon={<TriangleAlert size={18} />}
          action={
            <Button variant="secondary" onClick={() => void refresh(range)}>
              <RefreshCw size={14} />
              {t("dashboard.retry")}
            </Button>
          }
        />
      ) : null}

      <SetupChecklistSection />

      <DashboardBusinessSection
        range={range}
        kpi={kpi}
        trends={trends}
        generatedAt={generatedAt}
      />

      {adminView ? (
      <SystemMonitorSection
        stats={stats}
        connected={connected}
        apiKeyCount={summary?.counts.api_keys ?? 0}
        channelCount={channelCount}
      />
      ) : null}

      {adminView ? (
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t("dashboard.section_throughput")}
        </h3>
        <ThroughputTrendChart
          title={t("dashboard.throughput_title")}
          points={throughputSeries}
          rpm={stats?.total_rpm ?? 0}
          tpm={stats?.total_tpm ?? 0}
          showRPM={throughputLegend.rpm}
          showTPM={throughputLegend.tpm}
          onToggle={(key) =>
            setThroughputLegend((prev) => ({ ...prev, [key]: !prev[key as "rpm" | "tpm"] }))
          }
        />
      </section>
      ) : null}
    </section>
  );
}
