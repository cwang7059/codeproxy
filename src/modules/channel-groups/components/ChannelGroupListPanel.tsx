import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { Layers, Pencil, Plus, TriangleAlert, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RoutingChannelGroupEntry, RoutingPathRouteEntry } from "@/modules/config/visual/types";
import type { ChannelGroupStatusFilter } from "@/modules/channel-groups/channel-groups-page-utils";
import { summarizeList, summarizePriorityMode } from "@/modules/channel-groups/routing-config-editor-utils";
import { MonitorSectionHeader } from "@/modules/monitor/MonitorPagePieces";
import { Button } from "@/modules/ui/Button";
import { EmptyState } from "@/modules/ui/EmptyState";
import { TextInput } from "@/modules/ui/Input";
import { HoverTooltip, OverflowTooltip } from "@/modules/ui/Tooltip";
import { VirtualTable, type VirtualTableColumn } from "@/modules/ui/VirtualTable";

type StatCard = {
  key: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  valueClass: string;
};

export type ChannelGroupListPanelProps = {
  statCards: StatCard[];
  hasActiveFilters: boolean;
  search: string;
  statusFilter: ChannelGroupStatusFilter;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: ChannelGroupStatusFilter) => void;
  onCreateGroup: () => void;
  loading: boolean;
  totalGroups: number;
  filteredGroups: RoutingChannelGroupEntry[];
  useCompactTable: boolean;
  disabled?: boolean;
  routesByGroup: Map<string, RoutingPathRouteEntry[]>;
  staleChannelsByGroup: Map<string, RoutingChannelGroupEntry["channels"]>;
  onEditGroup: (group: RoutingChannelGroupEntry) => void;
  onDeleteGroup: (group: RoutingChannelGroupEntry) => void;
};

export function ChannelGroupListPanel({
  statCards,
  hasActiveFilters,
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onCreateGroup,
  loading,
  totalGroups,
  filteredGroups,
  useCompactTable,
  disabled,
  routesByGroup,
  staleChannelsByGroup,
  onEditGroup,
  onDeleteGroup,
}: ChannelGroupListPanelProps) {
  const { t } = useTranslation();

  const groupColumns = useMemo<VirtualTableColumn<RoutingChannelGroupEntry>[]>(
    () => [
      {
        key: "name",
        label: t("channel_groups_page.table_group"),
        width: "w-[150px] min-w-[150px]",
        cellClassName: "min-w-0 whitespace-nowrap font-medium",
        render: (group, index) => {
          const name = group.name.trim() || t("visual_config.group_n", { n: index + 1 });
          return (
            <OverflowTooltip content={name} className="block min-w-0">
              <span className="block truncate">{name}</span>
            </OverflowTooltip>
          );
        },
      },
      {
        key: "description",
        label: t("channel_groups_page.description_label"),
        width: "w-[180px] min-w-[180px]",
        cellClassName: "min-w-0 whitespace-nowrap text-slate-500 dark:text-white/55",
        render: (group) => {
          const description = group.description.trim() || t("channel_groups_page.no_description");
          return (
            <OverflowTooltip content={description} className="block min-w-0">
              <span className="block truncate">{description}</span>
            </OverflowTooltip>
          );
        },
      },
      {
        key: "channelCount",
        label: t("channel_groups_page.table_channel_count"),
        width: "w-[104px] min-w-[104px]",
        headerClassName: "text-center",
        cellClassName: "whitespace-nowrap text-center",
        render: (group) => (
          <span className="inline-flex h-5 min-w-[24px] items-center justify-center rounded-md bg-sky-50 px-1.5 text-xs font-semibold tabular-nums text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
            {group.channels.length}
          </span>
        ),
      },
      {
        key: "modelCount",
        label: t("channel_groups_page.table_model_count"),
        width: "w-[104px] min-w-[104px]",
        headerClassName: "text-center",
        cellClassName: "whitespace-nowrap text-center",
        render: (group) =>
          group.allowedModels.length > 0 ? (
            <span className="inline-flex h-5 min-w-[24px] items-center justify-center rounded-md bg-violet-50 px-1.5 text-xs font-semibold tabular-nums text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              {group.allowedModels.length}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-white/35">
              {t("channel_groups_page.all_models")}
            </span>
          ),
      },
      {
        key: "status",
        label: t("channel_groups_page.table_status"),
        width: "w-[170px] min-w-[170px]",
        cellClassName: "whitespace-nowrap",
        render: (group) => {
          const staleChannels = staleChannelsByGroup.get(group.id) ?? [];
          if (staleChannels.length === 0) {
            return (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                {t("channel_groups_page.status_normal")}
              </span>
            );
          }
          return (
            <button
              type="button"
              onClick={() => onEditGroup(group)}
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-40 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
            >
              <TriangleAlert size={13} />
              <span>{t("channel_groups_page.status_invalid")}</span>
              <span className="text-[11px] font-medium text-rose-600 dark:text-rose-200/85">
                {t("channel_groups_page.deleted_channels_count", { count: staleChannels.length })}
              </span>
            </button>
          );
        },
      },
      {
        key: "channels",
        label: t("channel_groups_page.table_channels"),
        width: "w-[220px] min-w-[220px]",
        cellClassName: "min-w-0 whitespace-nowrap text-slate-700 dark:text-white/75",
        render: (group) => {
          const names = group.channels.map((channel) => channel.name.trim()).filter(Boolean);
          if (names.length === 0) {
            return (
              <span className="text-slate-400 dark:text-white/35">
                {t("channel_groups_page.none")}
              </span>
            );
          }
          return (
            <HoverTooltip
              className="block min-w-0"
              content={
                <div className="flex max-w-xs flex-wrap gap-1.5">
                  {group.channels.map((channel) => (
                    <span
                      key={channel.id}
                      className="inline-flex items-center rounded-md border border-slate-200/60 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700 dark:border-neutral-700/40 dark:bg-neutral-800/60 dark:text-white/80"
                    >
                      {channel.name}
                      {channel.priority.trim()
                        ? ` · ${t("channel_groups_page.priority_short", {
                            value: channel.priority.trim(),
                          })}`
                        : ""}
                    </span>
                  ))}
                </div>
              }
            >
              <span className="block min-w-0 truncate">
                {summarizeList(names, t("channel_groups_page.more_suffix"))}
              </span>
            </HoverTooltip>
          );
        },
      },
      {
        key: "priorityMode",
        label: t("channel_groups_page.table_priority_mode"),
        width: "w-[190px] min-w-[190px]",
        cellClassName: "min-w-0 whitespace-nowrap text-slate-700 dark:text-white/75",
        render: (group) => {
          const summary = summarizePriorityMode(
            group.channels,
            t("channel_groups_page.round_robin_mode"),
            t("channel_groups_page.priority_short"),
          );
          return (
            <OverflowTooltip content={summary} className="block min-w-0">
              <span className="block truncate">{summary}</span>
            </OverflowTooltip>
          );
        },
      },
      {
        key: "routes",
        label: t("channel_groups_page.table_routes"),
        width: "w-[180px] min-w-[180px]",
        cellClassName: "min-w-0 whitespace-nowrap text-slate-700 dark:text-white/75",
        render: (group) => {
          const routes = routesByGroup.get(group.name.trim().toLowerCase()) ?? [];
          const routePaths = routes.map((route) => route.path.trim()).filter(Boolean);
          if (routePaths.length === 0) {
            return (
              <span className="text-slate-400 dark:text-white/35">
                {t("channel_groups_page.none")}
              </span>
            );
          }
          return (
            <HoverTooltip
              className="block min-w-0"
              content={
                <div className="flex max-w-xs flex-wrap gap-1.5">
                  {routePaths.map((path) => (
                    <span
                      key={path}
                      className="inline-flex items-center rounded-md border border-slate-200/60 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:border-neutral-700/40 dark:bg-neutral-800/60 dark:text-white/80"
                    >
                      {path}
                    </span>
                  ))}
                </div>
              }
            >
              <span className="block min-w-0 truncate">
                {summarizeList(routePaths, t("channel_groups_page.more_suffix"))}
              </span>
            </HoverTooltip>
          );
        },
      },
      {
        key: "actions",
        label: t("common.action"),
        width: "w-[112px] min-w-[112px]",
        cellClassName: "whitespace-nowrap",
        render: (group) => (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEditGroup(group)}
              disabled={disabled}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-amber-600 disabled:opacity-40 dark:text-white/50 dark:hover:bg-neutral-800 dark:hover:text-amber-400"
              title={t("channel_groups_page.edit_group")}
              aria-label={t("channel_groups_page.edit_group")}
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => onDeleteGroup(group)}
              disabled={disabled}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:text-white/50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              title={t("visual_config.delete_group")}
              aria-label={t("visual_config.delete_group")}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
      },
    ],
    [disabled, onDeleteGroup, onEditGroup, routesByGroup, staleChannelsByGroup, t],
  );

  return (
    <div className="space-y-5">
      <div>
        <MonitorSectionHeader title={t("channel_groups_page.section_overview")} />
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
                  {hasActiveFilters ? t("channel_groups_page.stats_scope_filtered") : card.hint}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <MonitorSectionHeader
          title={t("channel_groups_page.section_filters")}
          description={t("channel_groups_page.section_filters_desc")}
        />
        <div className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <TextInput
                value={search}
                onChange={(event) => onSearchChange(event.currentTarget.value)}
                placeholder={t("channel_groups_page.search_placeholder")}
                type="search"
                name="channel_group_search"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {totalGroups > 0 || loading ? (
              <Button
                variant="primary"
                size="sm"
                onClick={onCreateGroup}
                disabled={disabled}
                className="shrink-0 gap-1.5"
              >
                <Plus size={14} aria-hidden="true" />
                {t("channel_groups_page.add_group")}
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["", t("channel_groups_page.filter_all")],
              ["healthy", t("channel_groups_page.filter_healthy")],
              ["invalid", t("channel_groups_page.filter_invalid")],
            ] as const).map(([value, label]) => (
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

      <div>
        <MonitorSectionHeader
          title={t("channel_groups_page.section_table")}
          description={t("channel_groups_page.section_table_desc")}
        />

        <div
          className={[
            "relative",
            useCompactTable
              ? "min-h-0 overflow-x-auto"
              : "h-[calc(100dvh-420px)] min-h-[280px] overflow-hidden",
          ].join(" ")}
        >
          {!loading && totalGroups === 0 ? (
            <EmptyState
              title={t("channel_groups_page.empty_groups")}
              description={t("channel_groups_page.empty_groups_desc")}
              icon={<Layers size={32} className="text-slate-400" />}
              action={
                <Button variant="primary" size="sm" onClick={onCreateGroup} disabled={disabled}>
                  <Plus size={14} aria-hidden="true" />
                  {t("channel_groups_page.empty_cta")}
                </Button>
              }
            />
          ) : (
            <VirtualTable<RoutingChannelGroupEntry>
              rows={filteredGroups}
              columns={groupColumns}
              rowKey={(group) => group.id}
              virtualize={false}
              rowHeight={44}
              naturalFlow={useCompactTable}
              height={useCompactTable ? "h-auto" : "h-full"}
              minHeight={useCompactTable ? "min-h-0" : "min-h-full"}
              minWidth="min-w-[1520px]"
              stretch={false}
              caption={t("channel_groups_page.table_group")}
              emptyText={
                hasActiveFilters
                  ? t("channel_groups_page.empty_groups_filtered")
                  : t("channel_groups_page.empty_groups")
              }
              rowClassName={(group) =>
                (staleChannelsByGroup.get(group.id)?.length ?? 0) > 0
                  ? "bg-rose-50/35 dark:bg-rose-500/5"
                  : ""
              }
              showAllLoadedMessage={false}
            />
          )}
        </div>

        {totalGroups > 0 ? (
          <div className="mt-3 text-xs text-slate-500 dark:text-white/45">
            {t("channel_groups_page.showing_groups", {
              visible: filteredGroups.length.toLocaleString(),
              total: totalGroups.toLocaleString(),
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
