import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Activity, DollarSign, Sigma, Sparkles, TriangleAlert } from "lucide-react";
import type { DashboardSummary } from "@/lib/http/apis/usage";
import type { DashboardRange } from "@/modules/dashboard/dashboard-constants";
import {
  createSparklineOption,
  formatCurrency,
  formatNumber,
  formatRate,
  hasTrendData,
} from "@/modules/dashboard/dashboard-chart-utils";
import { DashboardKpiCard } from "@/modules/dashboard/components/DashboardKpiCard";
import { AnimatedNumber } from "@/modules/ui/AnimatedNumber";

type DashboardBusinessSectionProps = {
  range: DashboardRange;
  kpi: DashboardSummary["kpi"] | undefined;
  trends: DashboardSummary["trends"] | undefined;
  generatedAt: string;
};

export function DashboardBusinessSection({
  range,
  kpi,
  trends,
  generatedAt,
}: DashboardBusinessSectionProps) {
  const { t } = useTranslation();

  const totalRequestOption = useMemo(
    () => createSparklineOption(trends?.request_volume ?? [], "#2563eb"),
    [trends?.request_volume],
  );
  const successRateOption = useMemo(
    () => createSparklineOption(trends?.success_rate ?? [], "#10b981"),
    [trends?.success_rate],
  );
  const totalTokenOption = useMemo(
    () => createSparklineOption(trends?.total_tokens ?? [], "#7c3aed"),
    [trends?.total_tokens],
  );
  const totalCostOption = useMemo(
    () => createSparklineOption(trends?.total_cost ?? [], "#0891b2"),
    [trends?.total_cost],
  );
  const failedRequestOption = useMemo(
    () => createSparklineOption(trends?.failed_requests ?? [], "#ef4444"),
    [trends?.failed_requests],
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("dashboard.section_business")}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-white/55">
            {t("dashboard.overview_hint", { time: generatedAt })}
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardKpiCard
          title={t("dashboard.total_requests")}
          value={<AnimatedNumber value={kpi?.total_requests ?? 0} format={formatNumber} />}
          hint={
            range === 1
              ? t("dashboard.total_hint_today")
              : t("dashboard.total_hint_days", { count: range })
          }
          icon={Activity}
          option={totalRequestOption}
          showTrend={hasTrendData(trends?.request_volume)}
          accent={{
            iconWrap: "bg-blue-50 dark:bg-blue-500/12",
            iconColor: "text-blue-600 dark:text-blue-400",
          }}
          to="/monitor/request-logs"
        />
        <DashboardKpiCard
          title={t("dashboard.success_rate")}
          value={<AnimatedNumber value={kpi?.success_rate ?? 0} format={formatRate} />}
          hint={t("dashboard.success_hint", {
            success: formatNumber(kpi?.success_requests ?? 0),
            failed: formatNumber(kpi?.failed_requests ?? 0),
          })}
          icon={Sigma}
          option={successRateOption}
          showTrend={hasTrendData(trends?.success_rate)}
          accent={{
            iconWrap: "bg-emerald-50 dark:bg-emerald-500/12",
            iconColor: "text-emerald-600 dark:text-emerald-400",
          }}
          to="/monitor"
        />
        <DashboardKpiCard
          title={t("dashboard.total_tokens")}
          value={<AnimatedNumber value={kpi?.total_tokens ?? 0} format={formatNumber} />}
          hint={t("dashboard.token_hint", {
            input: formatNumber(kpi?.input_tokens ?? 0),
            output: formatNumber(kpi?.output_tokens ?? 0),
          })}
          icon={Sparkles}
          option={totalTokenOption}
          showTrend={hasTrendData(trends?.total_tokens)}
          accent={{
            iconWrap: "bg-violet-50 dark:bg-violet-500/12",
            iconColor: "text-violet-600 dark:text-violet-400",
          }}
          to="/monitor"
        />
        <DashboardKpiCard
          title={t("dashboard.total_cost")}
          value={<AnimatedNumber value={kpi?.total_cost ?? 0} format={formatCurrency} />}
          hint={t("dashboard.total_cost_hint")}
          icon={DollarSign}
          option={totalCostOption}
          showTrend={hasTrendData(trends?.total_cost)}
          accent={{
            iconWrap: "bg-cyan-50 dark:bg-cyan-500/12",
            iconColor: "text-cyan-600 dark:text-cyan-400",
          }}
          to="/monitor"
        />
        <DashboardKpiCard
          title={t("dashboard.failed_requests")}
          value={<AnimatedNumber value={kpi?.failed_requests ?? 0} format={formatNumber} />}
          hint={t("dashboard.failed_hint")}
          icon={TriangleAlert}
          option={failedRequestOption}
          showTrend={hasTrendData(trends?.failed_requests)}
          accent={{
            iconWrap: "bg-rose-50 dark:bg-rose-500/12",
            iconColor: "text-rose-600 dark:text-rose-400",
          }}
          to="/monitor/request-logs?status=failed"
        />
      </div>
    </section>
  );
}
