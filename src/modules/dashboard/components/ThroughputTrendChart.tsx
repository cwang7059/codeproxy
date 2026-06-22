import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { DashboardThroughputPoint } from "@/lib/http/apis/usage";
import { PANEL_SURFACE } from "@/modules/dashboard/dashboard-constants";
import {
  createThroughputOption,
  formatCompactNumber,
} from "@/modules/dashboard/dashboard-chart-utils";
import { Card } from "@/modules/ui/Card";
import { EChart } from "@/modules/ui/charts/EChart";
import { ChartLegend } from "@/modules/ui/charts/ChartLegend";

export function ThroughputTrendChart({
  title,
  points,
  rpm,
  tpm,
  showRPM,
  showTPM,
  onToggle,
}: {
  title: string;
  points: DashboardThroughputPoint[];
  rpm: number;
  tpm: number;
  showRPM: boolean;
  showTPM: boolean;
  onToggle: (key: string) => void;
}) {
  const { t } = useTranslation();
  const option = useMemo(
    () => createThroughputOption(points, showRPM, showTPM),
    [points, showRPM, showTPM],
  );
  const hasLiveTraffic =
    rpm > 0 || tpm > 0 || points.some((point) => point.rpm > 0 || point.tpm > 0);

  return (
    <Card className={PANEL_SURFACE} title={title} padding="compact">
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 dark:border-white/[0.06] dark:bg-neutral-900/70">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/50">
            RPM
          </div>
          <div className="mt-1 text-right font-mono text-xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">
            {formatCompactNumber(rpm)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 dark:border-white/[0.06] dark:bg-neutral-900/70">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/50">
            TPM
          </div>
          <div className="mt-1 text-right font-mono text-xl font-semibold tabular-nums text-violet-600 dark:text-violet-400">
            {formatCompactNumber(tpm)}
          </div>
        </div>
      </div>
      {hasLiveTraffic ? (
        <EChart option={option} className="h-56" />
      ) : (
        <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200/80 bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="max-w-sm px-4 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-white/80">
              {t("dashboard.throughput_empty_title")}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-white/55">
              {t("dashboard.throughput_empty_desc")}
            </p>
          </div>
        </div>
      )}
      <ChartLegend
        className="justify-start pt-3"
        items={[
          {
            key: "rpm",
            label: "RPM",
            colorClass: "bg-blue-500",
            enabled: showRPM,
            onToggle,
          },
          {
            key: "tpm",
            label: "TPM",
            colorClass: "bg-violet-500",
            enabled: showTPM,
            onToggle,
          },
        ]}
      />
    </Card>
  );
}
