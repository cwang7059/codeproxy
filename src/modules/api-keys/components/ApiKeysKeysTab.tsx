import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import { KeyRound, ShieldCheck, ShieldOff, Sigma } from "lucide-react";
import type { ApiKeyEntry } from "@/lib/http/apis/api-keys";
import type { ApiKeyStatusFilter, ApiKeyPageStats } from "@/modules/api-keys/api-keys-page-utils";
import { EmptyState } from "@/modules/ui/EmptyState";
import { MonitorSectionHeader } from "@/modules/monitor/MonitorPagePieces";
import { TextInput } from "@/modules/ui/Input";
import { VirtualTable } from "@/modules/ui/VirtualTable";
import type { VirtualTableColumn } from "@/modules/ui/VirtualTable";

type StatCard = {
  key: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  valueClass: string;
};

type ApiKeysKeysTabProps = {
  entries: ApiKeyEntry[];
  filteredEntries: ApiKeyEntry[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: ApiKeyStatusFilter;
  onStatusFilterChange: (value: ApiKeyStatusFilter) => void;
  stats: ApiKeyPageStats;
  hasActiveFilters: boolean;
  tableViewportHeight: number;
  columns: VirtualTableColumn<ApiKeyEntry>[];
};

export function ApiKeysKeysTab({
  entries,
  filteredEntries,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  stats,
  hasActiveFilters,
  tableViewportHeight,
  columns,
}: ApiKeysKeysTabProps) {
  const { t } = useTranslation();

  const statCards = useMemo(
    (): StatCard[] => [
      {
        key: "total",
        label: t("api_keys_page.kpi_total"),
        value: stats.total.toLocaleString(),
        hint: t("api_keys_page.kpi_total_hint"),
        icon: KeyRound,
        valueClass: "text-slate-900 dark:text-white",
      },
      {
        key: "active",
        label: t("api_keys_page.kpi_active"),
        value: stats.active.toLocaleString(),
        hint: t("api_keys_page.kpi_active_hint"),
        icon: ShieldCheck,
        valueClass: "text-emerald-700 dark:text-emerald-300",
      },
      {
        key: "disabled",
        label: t("api_keys_page.kpi_disabled"),
        value: stats.disabled.toLocaleString(),
        hint: t("api_keys_page.kpi_disabled_hint"),
        icon: ShieldOff,
        valueClass: "text-rose-700 dark:text-rose-300",
      },
      {
        key: "restricted",
        label: t("api_keys_page.kpi_restricted"),
        value: stats.restricted.toLocaleString(),
        hint: t("api_keys_page.kpi_restricted_hint"),
        icon: Sigma,
        valueClass: "text-amber-700 dark:text-amber-300",
      },
    ],
    [stats, t],
  );

  return (
    <>
      <div className="border-t border-slate-100 px-5 pb-4 pt-4 dark:border-neutral-800/60">
        <MonitorSectionHeader title={t("api_keys_page.section_overview")} />
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
                  {hasActiveFilters ? t("api_keys_page.stats_scope_filtered") : card.hint}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 pt-4 pb-3 dark:border-neutral-800/60">
        <MonitorSectionHeader
          title={t("api_keys_page.section_filters")}
          description={t("api_keys_page.section_filters_desc")}
        />
        <div className="space-y-3">
          <TextInput
            value={search}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
            placeholder={t("api_keys_page.search_placeholder")}
            type="search"
            name="api_key_search"
            autoComplete="off"
            spellCheck={false}
            size="sm"
          />
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["", t("api_keys_page.filter_all")],
                ["active", t("api_keys_page.filter_active")],
                ["disabled", t("api_keys_page.filter_disabled")],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value || "all"}
                type="button"
                onClick={() => onStatusFilterChange(value)}
                className={[
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition",
                  statusFilter === value
                    ? "border-blue-200/80 bg-blue-50/80 text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-neutral-950/60 dark:text-white/65 dark:hover:bg-white/5",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 pt-3 pb-1 dark:border-neutral-800/60">
        <MonitorSectionHeader title={t("api_keys_page.section_table")} />
      </div>

      <div className="relative px-5 pb-4">
        {entries.length === 0 && !loading ? (
          <EmptyState
            title={t("api_keys_page.no_keys")}
            description={t("api_keys_page.no_keys_desc")}
            icon={<KeyRound size={32} className="text-slate-400" />}
          />
        ) : (
          <div
            className="relative overflow-x-auto rounded-xl"
            style={{ height: tableViewportHeight }}
          >
            <VirtualTable<ApiKeyEntry>
              rows={filteredEntries}
              columns={columns}
              rowKey={(row) => row.key}
              rowHeight={44}
              height="h-full"
              minHeight="min-h-full"
              minWidth="min-w-[1792px]"
              stretch={false}
              caption={t("api_keys_page.table_caption")}
              emptyText={t("api_keys_page.no_results")}
              rowClassName={(row) => (row.disabled ? "opacity-50" : "")}
              showAllLoadedMessage={false}
            />

            {loading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm dark:bg-neutral-950/55">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/70 dark:text-white/75">
                  <span
                    className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-900 motion-reduce:animate-none motion-safe:animate-spin dark:border-white/20 dark:border-t-white/80"
                    aria-hidden="true"
                  />
                  <span role="status">{t("api_keys_page.loading")}</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {entries.length > 0 ? (
        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-neutral-800/60 dark:text-white/45">
          {t("api_keys_page.showing_keys", {
            visible: filteredEntries.length.toLocaleString(),
            total: entries.length.toLocaleString(),
          })}
        </div>
      ) : null}
    </>
  );
}
