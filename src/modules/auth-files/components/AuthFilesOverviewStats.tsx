import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatCompact } from "@/modules/monitor/monitor-format";
import type { AuthFileItem } from "@/lib/http/types";
import { computeAuthFilesSummaryStats } from "@/modules/auth-files/helpers/authFilesPageUtils";
import type { UsageIndex } from "@/modules/auth-files/helpers/authFilesPageUtils";
import type { QuotaState } from "@/modules/quota/quota-helpers";

export type AuthFilesOverviewStatsProps = {
  filteredFiles: AuthFileItem[];
  quotaByFileName: Record<string, QuotaState>;
  usageIndex: UsageIndex;
  loading: boolean;
  filesLength: number;
};

export function AuthFilesOverviewStats({
  filteredFiles,
  quotaByFileName,
  usageIndex,
  loading,
  filesLength,
}: AuthFilesOverviewStatsProps) {
  const { t } = useTranslation();

  const summaryStats = useMemo(
    () => computeAuthFilesSummaryStats(filteredFiles, quotaByFileName, usageIndex),
    [filteredFiles, quotaByFileName, usageIndex],
  );

  const statCards = useMemo(
    () => [
      {
        key: "total",
        label: t("auth_files.stats_total"),
        value: summaryStats.total.toLocaleString(),
        valueClass: "text-slate-900 dark:text-white",
      },
      {
        key: "enabled",
        label: t("auth_files.stats_enabled"),
        value: summaryStats.enabled.toLocaleString(),
        valueClass: "text-emerald-600 dark:text-emerald-400",
      },
      {
        key: "alerts",
        label: t("auth_files.stats_quota_alerts"),
        value: summaryStats.quotaAlerts.toLocaleString(),
        valueClass:
          summaryStats.quotaAlerts > 0
            ? "text-amber-600 dark:text-amber-400"
            : "text-slate-500 dark:text-white/55",
      },
      {
        key: "calls",
        label: t("auth_files.stats_total_calls"),
        value: formatCompact(summaryStats.totalCalls),
        valueTitle: summaryStats.totalCalls.toLocaleString(),
        valueClass: "text-sky-600 dark:text-sky-400",
      },
    ],
    [summaryStats.enabled, summaryStats.quotaAlerts, summaryStats.total, summaryStats.totalCalls, t],
  );

  if (loading && filesLength === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {statCards.map((card) => (
        <div
          key={card.key}
          className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3.5 dark:border-white/[0.08] dark:bg-white/[0.02]"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-white/58">{card.label}</p>
          <p
            className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums tracking-tight ${card.valueClass}`}
            title={"valueTitle" in card ? card.valueTitle : undefined}
          >
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
