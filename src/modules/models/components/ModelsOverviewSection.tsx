import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MonitorSectionHeader } from "@/modules/monitor/MonitorPagePieces";

type StatCard = {
  key: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  valueClass: string;
};

export type ModelsOverviewSectionProps = {
  statCards: StatCard[];
  hasActiveFilters: boolean;
};

export function ModelsOverviewSection({ statCards, hasActiveFilters }: ModelsOverviewSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="border-t border-slate-100 px-5 pb-4 pt-4 dark:border-neutral-800/60">
      <MonitorSectionHeader title={t("models_page.section_overview")} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3.5 dark:border-white/[0.08] dark:bg-white/[0.02]"
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                <Icon size={14} className="text-slate-700 dark:text-white/75" aria-hidden="true" />
                <span>{card.label}</span>
              </p>
              <p
                className={`mt-2 text-right font-mono text-2xl font-semibold tabular-nums tracking-tight ${card.valueClass}`}
              >
                {card.value}
              </p>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-white/45">
                {hasActiveFilters ? t("models_page.stats_scope_filtered") : card.hint}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
