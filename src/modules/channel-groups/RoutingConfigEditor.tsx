import { useCallback, useEffect, useMemo, useState } from "react";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { Layers, Route, ShieldCheck, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ChannelGroupChannelDetail } from "@/lib/http/apis/channel-groups";
import type {
  RoutingChannelGroupEntry,
  RoutingChannelGroupMemberEntry,
  RoutingPathRouteEntry,
  VisualConfigValues,
} from "@/modules/config/visual/types";
import { makeClientId } from "@/modules/config/visual/types";
import { ChannelDisplayTags } from "@/modules/channel-groups/components/ChannelDisplayTags";
import { ChannelGroupEditorModal } from "@/modules/channel-groups/components/ChannelGroupEditorModal";
import { ChannelGroupListPanel } from "@/modules/channel-groups/components/ChannelGroupListPanel";
import type {
  GroupDraft,
  RoutingModelLoadResult,
  RoutingModelOption,
} from "@/modules/channel-groups/routing-config-editor-types";
import {
  cloneMembers,
  createEmptyGroupDraft,
  emptyRouteDraft,
  normalizeChannelName,
  normalizeRoutePathInput,
  normalizeRoutingModelOption,
  readChannelDisplayTags,
  syncDraftChannels,
} from "@/modules/channel-groups/routing-config-editor-utils";
import {
  computeChannelGroupPageStats,
  filterChannelGroupEntries,
  type ChannelGroupStatusFilter,
} from "@/modules/channel-groups/channel-groups-page-utils";
import { ConfirmModal } from "@/modules/ui/ConfirmModal";
import { useToast } from "@/modules/ui/ToastProvider";

export type { RoutingModelOption } from "@/modules/channel-groups/routing-config-editor-types";

export function RoutingConfigEditor({
  values,
  disabled,
  loading = false,
  availableChannels,
  availableChannelDetails = {},
  onRefreshAvailableChannels,
  loadModelsForChannels,
  onChange,
}: {
  values: VisualConfigValues;
  disabled?: boolean;
  loading?: boolean;
  availableChannels: string[];
  availableChannelDetails?: Record<string, ChannelGroupChannelDetail>;
  onRefreshAvailableChannels?: () => Promise<void> | void;
  loadModelsForChannels?: (channels: string[]) => Promise<RoutingModelLoadResult[]>;
  onChange: (values: Partial<VisualConfigValues>) => void;
}) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [groupEditorOpen, setGroupEditorOpen] = useState(false);
  const [groupEditorId, setGroupEditorId] = useState<string | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<RoutingChannelGroupEntry | null>(null);
  const [groupDraft, setGroupDraft] = useState<GroupDraft>(() => createEmptyGroupDraft());
  const [groupEditorTab, setGroupEditorTab] = useState<"basic" | "models">("basic");
  const [modelOptions, setModelOptions] = useState<RoutingModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [modelsSelectionTouched, setModelsSelectionTouched] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChannelGroupStatusFilter>("");

  const update = useCallback(
    (patch: Partial<VisualConfigValues>) => {
      onChange(patch);
    },
    [onChange],
  );

  const routesByGroup = useMemo(() => {
    const map = new Map<string, RoutingPathRouteEntry[]>();
    values.routingPathRoutes.forEach((route) => {
      const key = route.group.trim().toLowerCase();
      if (!key) return;
      map.set(key, [...(map.get(key) ?? []), route]);
    });
    return map;
  }, [values.routingPathRoutes]);

  const channelOptions = useMemo(() => {
    return availableChannels
      .map((channel) => channel.trim())
      .filter(Boolean)
      .filter((channel, index, list) => list.indexOf(channel) === index)
      .map((channel) => ({
        value: channel,
        label: (
          <span className="flex min-w-0 items-center justify-between gap-2">
            <span className="truncate">{channel}</span>
            <ChannelDisplayTags
              tags={readChannelDisplayTags(availableChannelDetails[normalizeChannelName(channel)])}
            />
          </span>
        ),
        searchText: channel,
      }));
  }, [availableChannelDetails, availableChannels]);

  const availableChannelSet = useMemo(() => {
    return new Set(
      availableChannels.map((channel) => normalizeChannelName(channel)).filter(Boolean),
    );
  }, [availableChannels]);

  const getStaleChannels = useCallback(
    (channels: RoutingChannelGroupMemberEntry[]) =>
      channels.filter((channel) => {
        const normalized = normalizeChannelName(channel.name);
        return normalized && !availableChannelSet.has(normalized);
      }),
    [availableChannelSet],
  );

  const staleChannelsByGroup = useMemo(() => {
    const map = new Map<string, RoutingChannelGroupMemberEntry[]>();
    values.routingChannelGroups.forEach((group) => {
      map.set(group.id, getStaleChannels(group.channels));
    });
    return map;
  }, [getStaleChannels, values.routingChannelGroups]);

  const stats = useMemo(
    () =>
      computeChannelGroupPageStats(
        values.routingChannelGroups,
        staleChannelsByGroup,
        values.routingPathRoutes.length,
      ),
    [staleChannelsByGroup, values.routingChannelGroups, values.routingPathRoutes.length],
  );

  const filteredGroups = useMemo(
    () =>
      filterChannelGroupEntries(
        values.routingChannelGroups,
        search,
        statusFilter,
        staleChannelsByGroup,
      ),
    [search, staleChannelsByGroup, statusFilter, values.routingChannelGroups],
  );

  const hasActiveFilters = Boolean(search.trim() || statusFilter);
  const compactViewport = useCompactViewport();
  const useCompactTable = compactViewport || filteredGroups.length <= 10;
  const totalGroups = values.routingChannelGroups.length;

  const statCards = useMemo(
    () => [
      {
        key: "total",
        label: t("channel_groups_page.kpi_total"),
        value: stats.total.toLocaleString(),
        hint: t("channel_groups_page.kpi_total_hint"),
        icon: Layers,
        valueClass: "text-slate-900 dark:text-white",
      },
      {
        key: "healthy",
        label: t("channel_groups_page.kpi_healthy"),
        value: stats.healthy.toLocaleString(),
        hint: t("channel_groups_page.kpi_healthy_hint"),
        icon: ShieldCheck,
        valueClass: "text-emerald-700 dark:text-emerald-300",
      },
      {
        key: "invalid",
        label: t("channel_groups_page.kpi_invalid"),
        value: stats.invalid.toLocaleString(),
        hint: t("channel_groups_page.kpi_invalid_hint"),
        icon: TriangleAlert,
        valueClass: "text-rose-700 dark:text-rose-300",
      },
      {
        key: "routes",
        label: t("channel_groups_page.kpi_routes"),
        value: stats.routes.toLocaleString(),
        hint: t("channel_groups_page.kpi_routes_hint"),
        icon: Route,
        valueClass: "text-indigo-700 dark:text-indigo-300",
      },
    ],
    [stats, t],
  );

  const selectedChannelValues = useMemo(
    () => groupDraft.channels.map((channel) => channel.name.trim()).filter(Boolean),
    [groupDraft.channels],
  );

  const selectedModelSet = useMemo(
    () => new Set(groupDraft.allowedModels.map((model) => model.trim()).filter(Boolean)),
    [groupDraft.allowedModels],
  );

  const modelOptionIds = useMemo(() => modelOptions.map((model) => model.id), [modelOptions]);
  const selectedVisibleModelCount = useMemo(
    () => modelOptionIds.filter((model) => selectedModelSet.has(model)).length,
    [modelOptionIds, selectedModelSet],
  );
  const allVisibleModelsSelected =
    modelOptionIds.length > 0 && selectedVisibleModelCount === modelOptionIds.length;
  const someVisibleModelsSelected =
    selectedVisibleModelCount > 0 && selectedVisibleModelCount < modelOptionIds.length;

  const primaryRoute = groupDraft.routes[0] ?? emptyRouteDraft();
  const normalizedPrimaryRoutePath = useMemo(
    () => normalizeRoutePathInput(primaryRoute.path),
    [primaryRoute.path],
  );

  const draftStaleChannels = useMemo(
    () => getStaleChannels(groupDraft.channels),
    [getStaleChannels, groupDraft.channels],
  );

  const draftStaleChannelIds = useMemo(
    () => new Set(draftStaleChannels.map((channel) => channel.id)),
    [draftStaleChannels],
  );

  const notifyStaleChannels = useCallback(
    (groupName: string, staleChannels: RoutingChannelGroupMemberEntry[]) => {
      if (staleChannels.length === 0) return;
      const details = staleChannels
        .map((channel) => `• ${channel.name.trim()}`)
        .filter(Boolean)
        .join("\n");
      notify({
        type: "warning",
        title: t("channel_groups_page.stale_toast_title"),
        message: `${t("channel_groups_page.stale_toast_message", {
          count: staleChannels.length,
          group: groupName || t("channel_groups_page.unnamed_group"),
        })}\n${details}`,
        duration: 2800,
      });
    },
    [notify, t],
  );

  const groupDraftError = useMemo(() => {
    if (!groupDraft.name.trim()) return t("channel_groups_page.group_name_required");
    if (!primaryRoute.path.trim()) return t("channel_groups_page.route_path_required");
    if (!normalizedPrimaryRoutePath) return t("channel_groups_page.route_path_invalid");
    if (groupDraft.channels.length === 0) return t("channel_groups_page.group_channels_required");
    if (draftStaleChannels.length > 0) {
      return t("channel_groups_page.stale_channels_required_cleanup", {
        count: draftStaleChannels.length,
      });
    }
    return "";
  }, [
    draftStaleChannels.length,
    groupDraft.channels.length,
    groupDraft.name,
    normalizedPrimaryRoutePath,
    primaryRoute.path,
    t,
  ]);

  const openCreateGroup = useCallback(() => {
    void Promise.resolve(onRefreshAvailableChannels?.()).catch(() => undefined);
    setGroupEditorId(null);
    setGroupDraft(createEmptyGroupDraft());
    setGroupEditorTab("basic");
    setModelOptions([]);
    setModelsError("");
    setModelsSelectionTouched(false);
    setGroupEditorOpen(true);
  }, [onRefreshAvailableChannels]);

  const openEditGroup = useCallback(
    (group: RoutingChannelGroupEntry) => {
      void Promise.resolve(onRefreshAvailableChannels?.()).catch(() => undefined);
      const groupName = group.name.trim().toLowerCase();
      const existingRoutes = values.routingPathRoutes
        .filter((route) => route.group.trim().toLowerCase() === groupName)
        .map((route) => ({ ...route, id: route.id || makeClientId() }))
        .slice(0, 1);
      setGroupEditorId(group.id);
      setGroupDraft({
        name: group.name,
        description: group.description,
        strategy: group.strategy === "fill-first" ? "fill-first" : "round-robin",
        channels: cloneMembers(group.channels),
        allowedModels: group.allowedModels ?? [],
        routes:
          existingRoutes.length > 0
            ? existingRoutes
            : [{ ...emptyRouteDraft(), group: group.name.trim() }],
      });
      setGroupEditorTab("basic");
      setModelOptions([]);
      setModelsError("");
      setModelsSelectionTouched((group.allowedModels ?? []).length > 0);
      notifyStaleChannels(group.name.trim(), staleChannelsByGroup.get(group.id) ?? []);
      setGroupEditorOpen(true);
    },
    [
      notifyStaleChannels,
      onRefreshAvailableChannels,
      staleChannelsByGroup,
      values.routingPathRoutes,
    ],
  );

  const closeGroupEditor = useCallback(() => {
    setGroupEditorOpen(false);
    setGroupEditorId(null);
    setGroupDraft(createEmptyGroupDraft());
    setGroupEditorTab("basic");
    setModelOptions([]);
    setModelsError("");
    setModelsSelectionTouched(false);
  }, []);

  const updateDraftChannels = useCallback((selectedValues: string[]) => {
    setGroupDraft((current) => ({
      ...current,
      channels: syncDraftChannels(current.channels, selectedValues),
    }));
  }, []);

  const updateDraftChannel = useCallback(
    (channelId: string, patch: Partial<RoutingChannelGroupMemberEntry>) => {
      setGroupDraft((current) => ({
        ...current,
        channels: current.channels.map((channel) =>
          channel.id === channelId ? { ...channel, ...patch } : channel,
        ),
      }));
    },
    [],
  );

  const removeDraftChannel = useCallback((channelId: string) => {
    setGroupDraft((current) => ({
      ...current,
      channels: current.channels.filter((channel) => channel.id !== channelId),
    }));
  }, []);

  const toggleDraftModel = useCallback((modelId: string, checked: boolean) => {
    const normalized = modelId.trim();
    if (!normalized) return;
    setModelsSelectionTouched(true);
    setGroupDraft((current) => {
      const currentModels = current.allowedModels.map((model) => model.trim()).filter(Boolean);
      if (checked) {
        return {
          ...current,
          allowedModels: Array.from(new Set([...currentModels, normalized])),
        };
      }
      return {
        ...current,
        allowedModels: currentModels.filter((model) => model !== normalized),
      };
    });
  }, []);

  const selectAllDraftModels = useCallback(() => {
    setModelsSelectionTouched(true);
    setGroupDraft((current) => ({
      ...current,
      allowedModels: Array.from(new Set(modelOptionIds)),
    }));
  }, [modelOptionIds]);

  const clearDraftModels = useCallback(() => {
    setModelsSelectionTouched(true);
    setGroupDraft((current) => ({ ...current, allowedModels: [] }));
  }, []);

  const updatePrimaryRoute = useCallback((patch: Partial<RoutingPathRouteEntry>) => {
    setGroupDraft((current) => {
      const currentRoute = current.routes[0] ?? {
        ...emptyRouteDraft(),
        group: current.name.trim(),
      };
      return {
        ...current,
        routes: [{ ...currentRoute, ...patch }],
      };
    });
  }, []);

  const saveGroupDraft = useCallback(() => {
    if (groupDraftError) return;
    const groupName = groupDraft.name.trim();
    const normalizedDraft: RoutingChannelGroupEntry = {
      id: groupEditorId ?? makeClientId(),
      name: groupName,
      description: groupDraft.description.trim(),
      strategy: groupDraft.strategy === "fill-first" ? "fill-first" : "round-robin",
      allowedModels: Array.from(
        new Set(groupDraft.allowedModels.map((model) => model.trim()).filter(Boolean)),
      ),
      channels: groupDraft.channels
        .map((channel) => ({
          id: channel.id || makeClientId(),
          name: channel.name.trim(),
          priority: channel.priority.trim(),
        }))
        .filter((channel) => channel.name),
    };
    const normalizedRoute = {
      ...primaryRoute,
      id: primaryRoute.id || makeClientId(),
      path: normalizedPrimaryRoutePath,
      group: groupName,
    };
    const normalizedRoutes = normalizedRoute.path
      ? [
          {
            ...normalizedRoute,
            group: groupName,
          },
        ]
      : [];

    if (groupEditorId) {
      const previousGroup = values.routingChannelGroups.find((group) => group.id === groupEditorId);
      const previousGroupName = previousGroup?.name.trim().toLowerCase() ?? "";
      const otherRoutes = values.routingPathRoutes.filter(
        (route) => route.group.trim().toLowerCase() !== previousGroupName,
      );
      update({
        routingChannelGroups: values.routingChannelGroups.map((group) =>
          group.id === groupEditorId ? normalizedDraft : group,
        ),
        routingPathRoutes: [...otherRoutes, ...normalizedRoutes],
      });
    } else {
      update({
        routingChannelGroups: [...values.routingChannelGroups, normalizedDraft],
        routingPathRoutes: [...values.routingPathRoutes, ...normalizedRoutes],
      });
    }
    closeGroupEditor();
  }, [
    closeGroupEditor,
    groupDraft,
    groupDraftError,
    groupEditorId,
    normalizedPrimaryRoutePath,
    primaryRoute,
    update,
    values.routingChannelGroups,
    values.routingPathRoutes,
  ]);

  const removeRoutingGroup = useCallback(
    (groupId: string) => {
      const removed = values.routingChannelGroups.find((group) => group.id === groupId);
      const removedName = removed?.name.trim().toLowerCase() ?? "";
      update({
        routingChannelGroups: values.routingChannelGroups.filter((group) => group.id !== groupId),
        routingPathRoutes: values.routingPathRoutes.filter(
          (route) => route.group.trim().toLowerCase() !== removedName,
        ),
      });
    },
    [update, values.routingChannelGroups, values.routingPathRoutes],
  );

  const confirmRemoveRoutingGroup = useCallback(() => {
    if (!deleteGroupTarget) return;
    removeRoutingGroup(deleteGroupTarget.id);
    setDeleteGroupTarget(null);
  }, [deleteGroupTarget, removeRoutingGroup]);

  useEffect(() => {
    if (!groupEditorOpen || groupEditorTab !== "models") return;
    if (selectedChannelValues.length === 0 || !loadModelsForChannels) {
      setModelOptions([]);
      setModelsError("");
      return;
    }

    let cancelled = false;
    setModelsLoading(true);
    setModelsError("");
    setModelOptions([]);
    loadModelsForChannels(selectedChannelValues)
      .then((models) => {
        if (cancelled) return;
        const optionMap = new Map<string, RoutingModelOption>();
        for (const model of models) {
          const option = normalizeRoutingModelOption(model);
          if (!option) continue;
          const key = option.id.toLowerCase();
          if (!optionMap.has(key)) optionMap.set(key, option);
        }
        const normalized = Array.from(optionMap.values()).sort((a, b) => a.id.localeCompare(b.id));
        setModelOptions(normalized);
        const allowed = new Set(normalized.map((model) => model.id));
        setGroupDraft((current) => ({
          ...current,
          allowedModels: modelsSelectionTouched
            ? current.allowedModels.filter((model) => allowed.has(model))
            : normalized.map((model) => model.id),
        }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : t("channel_groups_page.models_load_failed");
        setModelOptions([]);
        setModelsError(message);
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    groupEditorOpen,
    groupEditorTab,
    loadModelsForChannels,
    modelsSelectionTouched,
    selectedChannelValues,
    t,
  ]);

  return (
    <>
      <ChannelGroupListPanel
        statCards={statCards}
        hasActiveFilters={hasActiveFilters}
        search={search}
        statusFilter={statusFilter}
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
        onCreateGroup={openCreateGroup}
        loading={loading}
        totalGroups={totalGroups}
        filteredGroups={filteredGroups}
        useCompactTable={useCompactTable}
        disabled={disabled}
        routesByGroup={routesByGroup}
        staleChannelsByGroup={staleChannelsByGroup}
        onEditGroup={openEditGroup}
        onDeleteGroup={setDeleteGroupTarget}
      />

      <ChannelGroupEditorModal
        open={groupEditorOpen}
        groupEditorId={groupEditorId}
        groupDraft={groupDraft}
        groupEditorTab={groupEditorTab}
        groupDraftError={groupDraftError}
        disabled={disabled}
        draftStaleChannels={draftStaleChannels}
        draftStaleChannelIds={draftStaleChannelIds}
        primaryRoute={primaryRoute}
        selectedChannelValues={selectedChannelValues}
        channelOptions={channelOptions}
        modelOptions={modelOptions}
        modelsLoading={modelsLoading}
        modelsError={modelsError}
        selectedModelSet={selectedModelSet}
        allVisibleModelsSelected={allVisibleModelsSelected}
        someVisibleModelsSelected={someVisibleModelsSelected}
        availableChannelDetails={availableChannelDetails}
        onClose={closeGroupEditor}
        onSave={saveGroupDraft}
        onTabChange={setGroupEditorTab}
        onDraftChange={(patch) => setGroupDraft((current) => ({ ...current, ...patch }))}
        onUpdatePrimaryRoute={updatePrimaryRoute}
        onUpdateDraftChannels={updateDraftChannels}
        onUpdateDraftChannel={updateDraftChannel}
        onRemoveDraftChannel={removeDraftChannel}
        onToggleDraftModel={toggleDraftModel}
        onSelectAllDraftModels={selectAllDraftModels}
        onClearDraftModels={clearDraftModels}
      />

      <ConfirmModal
        open={deleteGroupTarget !== null}
        title={t("channel_groups_page.delete_group_title")}
        description={t("channel_groups_page.delete_group_desc", {
          group: deleteGroupTarget?.name.trim() || t("channel_groups_page.unnamed_group"),
          count:
            deleteGroupTarget === null
              ? 0
              : (routesByGroup.get(deleteGroupTarget.name.trim().toLowerCase()) ?? []).length,
        })}
        confirmText={t("channel_groups_page.delete_group_confirm")}
        onClose={() => setDeleteGroupTarget(null)}
        onConfirm={confirmRemoveRoutingGroup}
      />
    </>
  );
}
