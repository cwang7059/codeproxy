import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyRound, Plus, RefreshCw, ShieldCheck, ShieldOff, Sigma } from "lucide-react";
import { apiKeyEntriesApi, apiKeysApi, type ApiKeyEntry } from "@/lib/http/apis/api-keys";
import {
  applyApiKeyPermissionProfile,
  apiKeyPermissionProfilesApi,
  CUSTOM_PERMISSION_PROFILE_ID,
  resolveEntryPermissionProfileId,
  type ApiKeyPermissionProfile,
} from "@/lib/http/apis/api-key-permission-profiles";
import { ccSwitchImportConfigsApi } from "@/lib/http/apis/ccswitch-import-configs";
import { detectApiBaseFromLocation } from "@/lib/connection";
import { useOptionalAuth } from "@/modules/auth/AuthProvider";
import {
  generateApiKey,
  makeEmptyApiKeyForm,
  maskApiKey,
} from "@/modules/api-keys/apiKeyPageUtils";
import { createApiKeyColumns } from "@/modules/api-keys/components/ApiKeyColumns";
import { DeleteApiKeyModal } from "@/modules/api-keys/components/DeleteApiKeyModal";
import { Button } from "@/modules/ui/Button";
import { EmptyState } from "@/modules/ui/EmptyState";
import { useToast } from "@/modules/ui/ToastProvider";
import { VirtualTable } from "@/modules/ui/VirtualTable";
import { ApiKeyFormModal } from "@/modules/api-keys/components/ApiKeyFormModal";
import { ApiKeyUsageModal } from "@/modules/api-keys/components/ApiKeyUsageModal";
import { useApiKeyPermissionOptions } from "@/modules/api-keys/hooks/useApiKeyPermissionOptions";
import { useApiKeyUsageView } from "@/modules/api-keys/hooks/useApiKeyUsageView";
import { CcSwitchImportCardList } from "@/modules/api-keys/components/CcSwitchImportCardList";
import { buildCcSwitchImportUrl, openCcSwitchImportUrl } from "@/modules/ccswitch/ccswitchImport";
import {
  normalizeCcSwitchClaudeAuthField,
  normalizeCcSwitchImportSettings,
} from "@/modules/ccswitch/ccswitchImportSettings";
import {
  deriveCcSwitchImportSettingsFromConfigList,
  type CcSwitchImportConfigListItem,
} from "@/modules/ccswitch/ccswitchImportConfigList";
import {
  computeApiKeyPageStats,
  filterApiKeyEntries,
  type ApiKeyStatusFilter,
} from "@/modules/api-keys/api-keys-page-utils";
import { LogContentModal } from "@/modules/monitor/LogContentModal";
import { ErrorDetailModal } from "@/modules/monitor/ErrorDetailModal";
import { MonitorSectionHeader } from "@/modules/monitor/MonitorPagePieces";
import { TextInput } from "@/modules/ui/Input";
import type { ApiKeyFormValues } from "@/modules/api-keys/types";

function normalizeRoutePath(path: string): string {
  const trimmed = String(path ?? "").trim();
  if (!trimmed || trimmed === "/") return "";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

function appendRoutePath(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = normalizeRoutePath(path);
  if (!normalizedPath) return normalizedBase;
  if (normalizedBase.toLowerCase().endsWith(normalizedPath.toLowerCase())) {
    return normalizedBase;
  }
  return `${normalizedBase}${normalizedPath}`;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.opacity = "0";
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

export function ApiKeysPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const auth = useOptionalAuth();

  const [entries, setEntries] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleteLogsOnDelete, setDeleteLogsOnDelete] = useState(true);
  const [ccSwitchImportEntry, setCcSwitchImportEntry] = useState<ApiKeyEntry | null>(null);
  const [ccSwitchImportConfigs, setCcSwitchImportConfigs] = useState<
    CcSwitchImportConfigListItem[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [permissionProfiles, setPermissionProfiles] = useState<ApiKeyPermissionProfile[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApiKeyStatusFilter>("");
  const [form, setForm] = useState<ApiKeyFormValues>(() => makeEmptyApiKeyForm());
  const { channelGroupItems, channelGroupByName, refreshPermissionOptions } =
    useApiKeyPermissionOptions();
  const {
    usageViewKey,
    usageViewName,
    usageLoading,
    usageTotalCount,
    usageCurrentPage,
    usagePageSize,
    setUsagePageSize,
    usageLastUpdatedText,
    usageTimeRange,
    setUsageTimeRange,
    usageChannelQuery,
    setUsageChannelQuery,
    usageChannelGroupQuery,
    setUsageChannelGroupQuery,
    usageModelQuery,
    setUsageModelQuery,
    usageStatusFilter,
    setUsageStatusFilter,
    usageContentModalOpen,
    setUsageContentModalOpen,
    usageContentModalLogId,
    usageContentModalTab,
    usageErrorModalOpen,
    setUsageErrorModalOpen,
    usageErrorModalLogId,
    usageErrorModalModel,
    usageLogColumns,
    usageRows,
    usageTotalPages,
    usageChannelOptions,
    usageChannelGroupOptions,
    usageModelOptions,
    fetchUsageLogs,
    handleViewUsage,
    closeUsageModal,
  } = useApiKeyUsageView({ channelGroupByName });

  /* ─── load ─── */

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesData, legacyKeys, profilesData, configsData] = await Promise.all([
        apiKeyEntriesApi.list(),
        apiKeysApi.list().catch(() => [] as string[]),
        apiKeyPermissionProfilesApi.list().catch(() => [] as ApiKeyPermissionProfile[]),
        ccSwitchImportConfigsApi.list().catch(() => [] as CcSwitchImportConfigListItem[]),
      ]);
      setPermissionProfiles(profilesData);
      setCcSwitchImportConfigs(configsData);

      // Auto-migrate: old api-keys not in api-key-entries get added as unnamed entries
      const entryKeySet = new Set(entriesData.map((e) => e.key));
      const newEntries = legacyKeys
        .filter((k: string) => k && !entryKeySet.has(k))
        .map((k: string): ApiKeyEntry => ({ key: k, "created-at": new Date().toISOString() }));

      let finalEntries: ApiKeyEntry[];
      if (newEntries.length > 0) {
        const merged = [...entriesData, ...newEntries];
        try {
          await apiKeyEntriesApi.replace(merged);
          notify({
            type: "success",
            message: t("api_keys_page.auto_import", { count: newEntries.length }),
          });
        } catch {
          // silent
        }
        finalEntries = merged;
      } else {
        finalEntries = entriesData;
      }
      setEntries(finalEntries);
      // Load models after entries are available (needs a valid API key)
      void refreshPermissionOptions();
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("api_keys_page.load_failed"),
      });
    } finally {
      setLoading(false);
    }
  }, [notify, refreshPermissionOptions, t]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const permissionProfileById = useMemo(
    () => new Map(permissionProfiles.map((profile) => [profile.id, profile])),
    [permissionProfiles],
  );

  const permissionProfileOptions = useMemo(() => {
    const options = [
      {
        value: "",
        label: t("api_keys_page.permission_profile_unrestricted"),
      },
      ...permissionProfiles.map((profile) => ({
        value: profile.id,
        label: profile.name,
      })),
    ];
    if (
      form.permissionProfileId === CUSTOM_PERMISSION_PROFILE_ID &&
      !options.some((option) => option.value === CUSTOM_PERMISSION_PROFILE_ID)
    ) {
      options.push({
        value: CUSTOM_PERMISSION_PROFILE_ID,
        label: t("api_keys_page.permission_profile_custom_keep"),
      });
    }
    return options;
  }, [form.permissionProfileId, permissionProfiles, t]);

  const selectedPermissionProfile = (profileId: string) =>
    profileId ? (permissionProfileById.get(profileId) ?? null) : null;

  /* ─── toggle disable ─── */

  const handleToggleDisable = async (index: number) => {
    const entry = entries[index];
    const updated = { ...entry, disabled: !entry.disabled };
    const newEntries = [...entries];
    newEntries[index] = updated;

    try {
      await apiKeyEntriesApi.replace(newEntries);
      setEntries(newEntries);
      notify({
        type: "success",
        message: updated.disabled
          ? t("api_keys_page.disabled_toast", { name: entry.name || t("api_keys_page.unnamed") })
          : t("api_keys_page.enabled_toast", { name: entry.name || t("api_keys_page.unnamed") }),
      });
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("api_keys_page.operation_failed"),
      });
    }
  };

  /* ─── create ─── */

  const handleOpenCreate = () => {
    const next = makeEmptyApiKeyForm(generateApiKey());
    setForm(next);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      notify({ type: "error", message: t("api_keys_page.name_required") });
      return;
    }
    if (!form.key.trim()) {
      notify({ type: "error", message: t("api_keys_page.key_empty") });
      return;
    }
    setSaving(true);
    try {
      const newEntry: ApiKeyEntry = {
        key: form.key.trim(),
        name: form.name.trim(),
        "created-at": new Date().toISOString(),
      };
      const profiledEntry = applyApiKeyPermissionProfile(
        newEntry,
        selectedPermissionProfile(form.permissionProfileId),
      );
      await apiKeyEntriesApi.replace([...entries, profiledEntry]);
      notify({ type: "success", message: t("api_keys_page.created_success") });
      setShowCreate(false);
      await loadEntries();
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("api_keys_page.create_failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  /* ─── edit ─── */

  const handleOpenEdit = (index: number) => {
    const entry = entries[index];
    const next = {
      name: entry.name || "",
      key: entry.key,
      permissionProfileId: resolveEntryPermissionProfileId(entry, permissionProfiles),
      dailyLimit: entry["daily-limit"]?.toString() || "",
      totalQuota: entry["total-quota"]?.toString() || "",
      spendingLimit: entry["spending-limit"]?.toString() || "",
      concurrencyLimit: entry["concurrency-limit"]?.toString() || "",
      rpmLimit: entry["rpm-limit"]?.toString() || "",
      tpmLimit: entry["tpm-limit"]?.toString() || "",
      allowedModels: entry["allowed-models"] || [],
      allowedChannels: entry["allowed-channels"] || [],
      allowedChannelGroups: entry["allowed-channel-groups"] || [],
      useExactChannelRestrictions: (entry["allowed-channels"] || []).length > 0,
      systemPrompt: entry["system-prompt"] || "",
    };
    setForm(next);
    setEditIndex(index);
  };

  const handleEdit = async () => {
    if (editIndex === null) return;
    if (!form.name.trim()) {
      notify({ type: "error", message: t("api_keys_page.name_required") });
      return;
    }
    const originalKey = entries[editIndex].key;
    const newKey = form.key.trim();
    setSaving(true);
    try {
      await apiKeyEntriesApi.update({
        index: editIndex,
        value: {
          ...(newKey !== originalKey ? { key: newKey } : {}),
          name: form.name.trim(),
          ...(form.permissionProfileId === CUSTOM_PERMISSION_PROFILE_ID
            ? {
                "permission-profile-id": entries[editIndex]["permission-profile-id"] ?? "",
                "daily-limit": entries[editIndex]["daily-limit"] ?? 0,
                "total-quota": entries[editIndex]["total-quota"] ?? 0,
                "spending-limit": entries[editIndex]["spending-limit"] ?? 0,
                "concurrency-limit": entries[editIndex]["concurrency-limit"] ?? 0,
                "rpm-limit": entries[editIndex]["rpm-limit"] ?? 0,
                "tpm-limit": entries[editIndex]["tpm-limit"] ?? 0,
                "allowed-models": entries[editIndex]["allowed-models"] ?? [],
                "allowed-channels": entries[editIndex]["allowed-channels"] ?? [],
                "allowed-channel-groups": entries[editIndex]["allowed-channel-groups"] ?? [],
                "system-prompt": entries[editIndex]["system-prompt"] ?? "",
              }
            : applyApiKeyPermissionProfile(
                {} as ApiKeyEntry,
                selectedPermissionProfile(form.permissionProfileId),
              )),
        },
      });
      notify({ type: "success", message: t("api_keys_page.updated_success") });
      setEditIndex(null);
      await loadEntries();
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("api_keys_page.update_failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  /* ─── delete ─── */

  const handleDelete = async () => {
    if (deleteIndex === null) return;
    setSaving(true);
    try {
      const response = (await apiKeyEntriesApi.delete({
        index: deleteIndex,
        deleteLogs: deleteLogsOnDelete,
      })) as { logs_deleted?: number } | undefined;
      const logsDeleted =
        typeof response?.logs_deleted === "number" ? response.logs_deleted : undefined;
      notify({
        type: "success",
        message:
          deleteLogsOnDelete && typeof logsDeleted === "number"
            ? t("api_keys_page.deleted_success_with_logs", { count: logsDeleted })
            : t("api_keys_page.deleted_success"),
      });
      setDeleteIndex(null);
      setDeleteLogsOnDelete(true);
      await loadEntries();
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("api_keys_page.delete_failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDelete = (index: number) => {
    setDeleteLogsOnDelete(true);
    setDeleteIndex(index);
  };

  /* ─── copy ─── */

  const handleCopy = async (key: string) => {
    if (await copyTextToClipboard(key)) {
      notify({ type: "success", message: t("api_keys_page.copied_toast") });
      return;
    }
    notify({ type: "error", message: t("api_keys_page.copy_failed") });
  };

  const compatibleConfigs = useMemo(() => {
    if (!ccSwitchImportEntry) return [];
    const entryGroups = (ccSwitchImportEntry["allowed-channel-groups"] ?? [])
      .map((g) =>
        String(g ?? "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean);
    return ccSwitchImportConfigs.filter((config) => {
      if (entryGroups.length === 0) return true;
      return config.allowedChannelGroups.some((g) => entryGroups.includes(g));
    });
  }, [ccSwitchImportEntry, ccSwitchImportConfigs]);

  const handleOpenCcSwitchImport = useCallback((entry: ApiKeyEntry) => {
    setCcSwitchImportEntry(entry);
  }, []);

  const handleImportWithConfig = useCallback(
    (config: CcSwitchImportConfigListItem) => {
      if (!ccSwitchImportEntry) return;

      const entryGroups = (ccSwitchImportEntry["allowed-channel-groups"] ?? [])
        .map((g) =>
          String(g ?? "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean);
      const matchingGroup =
        config.allowedChannelGroups.find((g) => entryGroups.includes(g)) ??
        config.allowedChannelGroups[0] ??
        "";
      const groupItem = channelGroupItems.find(
        (g) =>
          String(g.name ?? "")
            .trim()
            .toLowerCase() === matchingGroup,
      );
      const routePath = Array.isArray(groupItem?.["path-routes"])
        ? groupItem["path-routes"][0]
        : "";
      const baseApiUrl = auth?.state.apiBase || detectApiBaseFromLocation();
      const baseUrl = appendRoutePath(baseApiUrl, config.routePath || routePath || "");

      const settings =
        ccSwitchImportConfigs.length > 0
          ? deriveCcSwitchImportSettingsFromConfigList(ccSwitchImportConfigs)
          : normalizeCcSwitchImportSettings();
      const clientSettings = {
        ...settings[config.clientType],
        endpointPath: config.endpointPath ?? settings[config.clientType].endpointPath,
        usageAutoInterval:
          config.usageAutoInterval ?? settings[config.clientType].usageAutoInterval,
        defaultModel: config.defaultModel ?? settings[config.clientType].defaultModel,
      };
      const importSettings =
        config.clientType === "claude"
          ? {
              ...settings,
              claude: {
                ...clientSettings,
                apiKeyField: normalizeCcSwitchClaudeAuthField(config.apiKeyField),
              },
            }
          : {
              ...settings,
              [config.clientType]: clientSettings,
            };

      const url = buildCcSwitchImportUrl({
        apiKey: ccSwitchImportEntry.key,
        baseUrl,
        clientType: config.clientType,
        enabled: config.enabled !== false,
        providerName: config.providerName || ccSwitchImportEntry.name || "CliProxy",
        model: config.defaultModel,
        modelMappings: config.modelMappings,
        models: [],
        settings: importSettings,
      });

      openCcSwitchImportUrl(url, {
        onProtocolUnavailable: () =>
          notify({ type: "error", message: t("ccswitch.protocol_unavailable") }),
      });
      setCcSwitchImportEntry(null);
    },
    [ccSwitchImportEntry, ccSwitchImportConfigs, channelGroupItems, auth, notify, t],
  );

  const apiKeyColumns = useMemo(
    () =>
      createApiKeyColumns({
        t,
        onToggleDisable: (index) => void handleToggleDisable(index),
        onViewUsage: handleViewUsage,
        onCopy: (key) => void handleCopy(key),
        onImportToCcSwitch: handleOpenCcSwitchImport,
        onEdit: handleOpenEdit,
        onDelete: handleOpenDelete,
      }),
    [
      handleToggleDisable,
      handleViewUsage,
      handleCopy,
      handleOpenCcSwitchImport,
      handleOpenEdit,
      handleOpenDelete,
      t,
    ],
  );

  const stats = useMemo(() => computeApiKeyPageStats(entries), [entries]);
  const filteredEntries = useMemo(
    () => filterApiKeyEntries(entries, search, statusFilter),
    [entries, search, statusFilter],
  );
  const hasActiveFilters = Boolean(search.trim() || statusFilter);
  const useCompactTable = filteredEntries.length <= 15;

  const statCards = useMemo(
    () => [
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

  /* ─── main render ─── */

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgb(15_23_42_/_0.035)] dark:border-white/[0.06] dark:bg-neutral-950/70 dark:shadow-[0_1px_2px_rgb(0_0_0_/_0.22)]">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <KeyRound size={18} aria-hidden="true" />
              {t("api_keys_page.title")}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-white/45">
              {t("api_keys_page.description")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadEntries()}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              {t("api_keys_page.refresh")}
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenCreate} className="gap-1.5">
              <Plus size={14} aria-hidden="true" />
              {t("api_keys_page.create_key")}
            </Button>
          </div>
        </div>

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
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder={t("api_keys_page.search_placeholder")}
              type="search"
              name="api_key_search"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="flex flex-wrap gap-2">
              {([
                ["", t("api_keys_page.filter_all")],
                ["active", t("api_keys_page.filter_active")],
                ["disabled", t("api_keys_page.filter_disabled")],
              ] as const).map(([value, label]) => (
                <button
                  key={value || "all"}
                  type="button"
                  onClick={() => setStatusFilter(value)}
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

        <div
          className={[
            "relative px-5 pb-4",
            useCompactTable ? "min-h-0" : "h-[calc(100dvh-380px)] min-h-[320px] overflow-hidden",
          ].join(" ")}
        >
          {entries.length === 0 && !loading ? (
            <EmptyState
              title={t("api_keys_page.no_keys")}
              description={t("api_keys_page.no_keys_desc")}
              icon={<KeyRound size={32} className="text-slate-400" />}
            />
          ) : (
            <VirtualTable<ApiKeyEntry>
              rows={filteredEntries}
              columns={apiKeyColumns}
              rowKey={(row) => row.key}
              rowHeight={44}
              naturalFlow={useCompactTable}
              height={useCompactTable ? "h-auto" : "h-full"}
              minHeight={useCompactTable ? "min-h-0" : "min-h-full"}
              minWidth="min-w-[1720px]"
              stretch={false}
              caption={t("api_keys_page.table_caption")}
              emptyText={t("api_keys_page.no_results")}
              rowClassName={(row) => (row.disabled ? "opacity-50" : "")}
              showAllLoadedMessage={false}
            />
          )}

          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-b-2xl bg-white/70 backdrop-blur-sm dark:bg-neutral-950/55">
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

        {entries.length > 0 ? (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-neutral-800/60 dark:text-white/45">
            {t("api_keys_page.showing_keys", {
              visible: filteredEntries.length.toLocaleString(),
              total: entries.length.toLocaleString(),
            })}
          </div>
        ) : null}
      </div>

      <ApiKeyFormModal
        t={t}
        open={showCreate}
        editMode={false}
        saving={saving}
        form={form}
        setForm={setForm}
        permissionProfileOptions={permissionProfileOptions}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        regenerateKey={() => setForm((prev) => ({ ...prev, key: generateApiKey() }))}
      />

      <ApiKeyFormModal
        t={t}
        open={editIndex !== null}
        editMode
        saving={saving}
        form={form}
        setForm={setForm}
        permissionProfileOptions={permissionProfileOptions}
        onClose={() => setEditIndex(null)}
        onSubmit={handleEdit}
        regenerateKey={() => setForm((prev) => ({ ...prev, key: generateApiKey() }))}
      />

      <DeleteApiKeyModal
        t={t}
        entry={deleteIndex === null ? null : (entries[deleteIndex] ?? null)}
        open={deleteIndex !== null}
        saving={saving}
        deleteLogsOnDelete={deleteLogsOnDelete}
        onDeleteLogsChange={setDeleteLogsOnDelete}
        onClose={() => {
          setDeleteIndex(null);
          setDeleteLogsOnDelete(true);
        }}
        onConfirm={handleDelete}
      />

      <CcSwitchImportCardList
        open={ccSwitchImportEntry !== null}
        configs={compatibleConfigs}
        onSelect={handleImportWithConfig}
        onClose={() => setCcSwitchImportEntry(null)}
      />

      <ApiKeyUsageModal
        open={usageViewKey !== null}
        onClose={closeUsageModal}
        usageViewName={usageViewName}
        maskedKey={usageViewKey ? maskApiKey(usageViewKey) : ""}
        usageTotalCount={usageTotalCount}
        usageTimeRange={usageTimeRange}
        setUsageTimeRange={setUsageTimeRange}
        fetchUsageLogs={fetchUsageLogs}
        usagePageSize={usagePageSize}
        usageLoading={usageLoading}
        usageLastUpdatedText={usageLastUpdatedText}
        usageChannelGroupQuery={usageChannelGroupQuery}
        setUsageChannelGroupQuery={setUsageChannelGroupQuery}
        setUsageChannelQuery={setUsageChannelQuery}
        usageChannelGroupOptions={usageChannelGroupOptions}
        usageChannelQuery={usageChannelQuery}
        setUsageChannelQueryDirect={setUsageChannelQuery}
        usageChannelOptions={usageChannelOptions}
        usageModelQuery={usageModelQuery}
        setUsageModelQuery={setUsageModelQuery}
        usageModelOptions={usageModelOptions}
        usageStatusFilter={usageStatusFilter}
        setUsageStatusFilter={setUsageStatusFilter}
        usageLogColumns={usageLogColumns}
        usageRows={usageRows}
        usageCurrentPage={usageCurrentPage}
        usageTotalPages={usageTotalPages}
        setUsagePageSize={setUsagePageSize}
      />

      <LogContentModal
        open={usageContentModalOpen}
        logId={usageContentModalLogId}
        initialTab={usageContentModalTab}
        onClose={() => setUsageContentModalOpen(false)}
      />
      <ErrorDetailModal
        open={usageErrorModalOpen}
        logId={usageErrorModalLogId}
        model={usageErrorModalModel}
        onClose={() => setUsageErrorModalOpen(false)}
      />
    </section>
  );
}
