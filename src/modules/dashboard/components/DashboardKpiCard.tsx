import type { ReactNode } from "react";
import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { ECBasicOption } from "echarts/types/dist/shared";
import { PANEL_SURFACE } from "@/modules/dashboard/dashboard-constants";
import { Card } from "@/modules/ui/Card";
import { EChart } from "@/modules/ui/charts/EChart";

export function DashboardKpiCard({
  title,
  value,
  hint,
  icon: Icon,
  option,
  accent,
  to,
  showTrend,
}: {
  title: string;
  value: ReactNode;
  hint: string;
  icon: typeof Activity;
  option: ECBasicOption;
  accent: {
    iconWrap: string;
    iconColor: string;
  };
  to?: string;
  showTrend: boolean;
}) {
  const { t } = useTranslation();

  const body = (
    <Card
      className={`${PANEL_SURFACE} h-full transition hover:border-slate-300 dark:hover:border-neutral-700 ${to ? "hover:shadow-md" : ""}`}
      bodyClassName="mt-0 flex h-full flex-col"
      padding="compact"
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`inline-flex h-9 w-9 items-center justify-center rounded-[14px] ${accent.iconWrap}`}
        >
          <Icon size={16} className={accent.iconColor} />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
        <div className="mt-2 font-mono text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums text-slate-950 dark:text-white">
          {value}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-white/55">{hint}</p>
      </div>
      <div className="mt-auto pt-3">
        {showTrend ? (
          <EChart option={option} className="h-10" overflowVisible />
        ) : (
          <div className="flex h-10 items-center justify-center rounded-xl border border-dashed border-slate-200/80 text-[11px] text-slate-400 dark:border-white/10 dark:text-white/40">
            {t("dashboard.sparkline_empty")}
          </div>
        )}
      </div>
    </Card>
  );

  if (!to) return body;

  return (
    <Link
      to={to}
      viewTransition
      className="block h-full rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      {body}
    </Link>
  );
}
