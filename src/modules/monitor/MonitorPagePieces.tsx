import type { ComponentType, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import {
  HOUR_WINDOWS,
  TIME_RANGES,
  type HourWindow,
  type TimeRange,
} from "@/modules/monitor/monitor-constants";
import { Tabs, TabsList, TabsTrigger } from "@/modules/ui/Tabs";

export const MonitorSectionHeader = ({
  title,
  description,
}: {
  title: string;
  description?: string;
}) => (
  <div className="section-header-wrap">
    <h3 className="section-header">{title}</h3>
    {description ? <p className="section-header-desc">{description}</p> : null}
  </div>
);

export const KpiCard = ({
  title,
  value,
  hint,
  icon: Icon,
  to,
}: {
  title: string;
  value: ReactNode;
  hint: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  to?: string;
}) => {
  const body = (
    <article className="surface-card-interactive h-full p-5">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/55">
        <Icon size={14} className="text-slate-900 dark:text-white" />
        <span>{title}</span>
      </p>
      <p className="mt-3 text-right text-2xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-600 dark:text-white/65">{hint}</p>
    </article>
  );

  if (!to) return body;

  return (
    <Link
      to={to}
      viewTransition
      className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      {body}
    </Link>
  );
};

export const TimeRangeSelector = ({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (next: TimeRange) => void;
}) => {
  const { t } = useTranslation();
  return (
    <Tabs value={String(value)} onValueChange={(next) => onChange(Number(next) as TimeRange)}>
      <TabsList>
        {TIME_RANGES.map((range) => {
          const label = range === 1 ? t("monitor.today") : t("monitor.n_days", { count: range });
          return (
            <TabsTrigger key={range} value={String(range)}>
              {label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
};

export const HourWindowSelector = ({
  value,
  onChange,
}: {
  value: HourWindow;
  onChange: (next: HourWindow) => void;
}) => {
  const { t } = useTranslation();
  return (
    <Tabs value={String(value)} onValueChange={(next) => onChange(Number(next) as HourWindow)}>
      <TabsList>
        {HOUR_WINDOWS.map((range) => (
          <TabsTrigger key={range} value={String(range)}>
            {t("monitor.last_nh", { count: range })}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export const MonitorCard = ({
  title,
  description,
  actions,
  loading = false,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  loading?: boolean;
  children: ReactNode;
}) => {
  const { t } = useTranslation();
  return (
    <section
      className="surface-card min-w-0 p-5"
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          {description ? (
            <p className="text-xs text-slate-600 dark:text-white/65">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="relative mt-4 min-w-0">
        {children}
        {loading ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/65 backdrop-blur-sm dark:bg-neutral-950/45">
            <div
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/70 dark:text-white/80"
            >
              <span
                className="h-4 w-4 rounded-full border-2 border-slate-300/80 border-t-slate-900 motion-reduce:animate-none motion-safe:animate-spin dark:border-white/20 dark:border-t-white/85"
                aria-hidden="true"
              />
              <span className="tabular-nums">{t("common.loading")}</span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export type DistributionLegendItem = {
  name: string;
  valueLabel: string;
  percentLabel: string;
  colorClass: string;
  enabled: boolean;
};

export function DistributionLegendList({
  items,
  onToggle,
}: {
  items: DistributionLegendItem[];
  onToggle: (name: string) => void;
}) {
  return (
    <div className="flex h-auto flex-col justify-start gap-2 overflow-y-auto pr-2 md:max-h-[22rem]">
      {items.map((item) => {
        const percent = Number.parseFloat(item.percentLabel.replace("%", "")) || 0;
        return (
          <button
            key={item.name}
            type="button"
            aria-pressed={item.enabled}
            onClick={() => onToggle(item.name)}
            className={[
              "w-full rounded-xl px-2 py-1.5 text-left text-sm transition",
              item.enabled
                ? "text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-white/10"
                : "text-slate-400 opacity-60 hover:bg-slate-50 dark:text-white/35 dark:hover:bg-white/5",
            ].join(" ")}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_max-content_max-content] items-center gap-x-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-3.5 w-3.5 shrink-0 rounded-full ${item.colorClass} opacity-80 ring-1 ring-black/5 dark:ring-white/10`}
                />
                <span className="min-w-0 truncate text-slate-700 dark:text-white/80">{item.name}</span>
              </div>
              <span className="min-w-[3.5rem] whitespace-nowrap text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                {item.valueLabel}
              </span>
              <span className="min-w-[4.25rem] whitespace-nowrap text-right tabular-nums text-slate-500 dark:text-white/55">
                {item.percentLabel}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200/90 dark:bg-white/10">
              <div
                className={`h-full rounded-full ${item.colorClass}`}
                style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function CompactDistributionList({ items }: { items: DistributionLegendItem[] }) {
  return (
    <div className="space-y-4 py-2">
      {items.map((item) => {
        const percent = Number.parseFloat(item.percentLabel.replace("%", "")) || 0;
        return (
          <div key={item.name}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-3.5 w-3.5 shrink-0 rounded-full ${item.colorClass} ring-1 ring-black/5 dark:ring-white/10`}
                />
                <span className="truncate font-medium text-slate-800 dark:text-white/85">
                  {item.name}
                </span>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {item.valueLabel}
                </span>
                <span className="ml-2 text-slate-500 dark:text-white/55">{item.percentLabel}</span>
              </div>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/90 dark:bg-white/10">
              <div
                className={`h-full rounded-full ${item.colorClass}`}
                style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FilterClearButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white/85"
      aria-label={t("monitor.clear_filter")}
    >
      <X size={14} />
    </button>
  );
}
