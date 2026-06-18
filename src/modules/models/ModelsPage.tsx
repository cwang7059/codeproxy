import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, Check, Cpu, Edit3, Plus, RefreshCw, Search, Sigma, Trash2 } from "lucide-react";
import { Button } from "@/modules/ui/Button";
import { Card } from "@/modules/ui/Card";
import { Checkbox } from "@/modules/ui/Checkbox";
import { ConfirmModal } from "@/modules/ui/ConfirmModal";
import { EmptyState } from "@/modules/ui/EmptyState";
import { TextInput } from "@/modules/ui/Input";
import { Modal } from "@/modules/ui/Modal";
import { SearchableSelect, type SearchableSelectOption } from "@/modules/ui/SearchableSelect";
import { Select } from "@/modules/ui/Select";
import { Tabs, TabsList, TabsTrigger } from "@/modules/ui/Tabs";
import { ToggleSwitch } from "@/modules/ui/ToggleSwitch";
import { useToast } from "@/modules/ui/ToastProvider";
import { OverflowTooltip } from "@/modules/ui/Tooltip";
import { VirtualTable, type VirtualTableColumn } from "@/modules/ui/VirtualTable";
import { apiClient } from "@/lib/http/client";
import { loadConfiguredModelAvailability, type ModelPricingMode } from "@/modules/models/modelAvailability";
import {
  buildOwnerPresetDrafts,
  defaultOpenRouterSyncState,
  emptyForm,
  emptyOwnerForm,
  fetchModelConfigs,
  fetchOwnerPresets,
  formatPrice,
  formatSyncTimestamp,
  hasPricing,
  mergeConfiguredModelAvailability,
  normalizeOpenRouterSyncResult,
  normalizeOpenRouterSyncState,
  normalizeOwnerPresetItems,
  normalizeOwnerValue,
  saveModelConfig,
  syncIntervalHoursValue,
  syncIntervalMinutesFromHours,
  toFormState,
  toOwnerFormState,
  VendorIcon,
  type ModelFormState,
  type ModelItem,
  type ModelOwnerPreset,
  type ModelPageTab,
  type ModelScope,
  type OpenRouterModelSyncResult,
  type OpenRouterModelSyncState,
  type OwnerFormState,
} from "@/modules/models/models-page-helpers";
import {
  computeModelPageStats,
  filterModelItems,
  type ModelStatusFilter,
} from "@/modules/models/models-page-utils";
import { MonitorSectionHeader } from "@/modules/monitor/MonitorPagePieces";
import { PageToolbar } from "@/modules/ui/PageToolbar";

export function ModelsPage() {
  const { t } = useTranslation();
  const { notify } = useToast();

  const [models, setModels] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ModelStatusFilter>("");
  const [totalCost, setTotalCost] = useState(0);
  const [form, setForm] = useState<ModelFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ModelPageTab>("active");
  const [ownerPresets, setOwnerPresets] = useState<ModelOwnerPreset[]>([]);
  const [ownerFilter, setOwnerFilter] = useState("");
  const [ownerSearchFilter, setOwnerSearchFilter] = useState("");
  const [ownerForm, setOwnerForm] = useState<OwnerFormState | null>(null);
  const [deleteOwnerTarget, setDeleteOwnerTarget] = useState<ModelOwnerPreset | null>(null);
  const [savingOwnerPresets, setSavingOwnerPresets] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ModelItem | null>(null);
  const [bulkDeleteTargetIds, setBulkDeleteTargetIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(() => new Set());
  const [openRouterSyncState, setOpenRouterSyncState] = useState<OpenRouterModelSyncState>(
    defaultOpenRouterSyncState,
  );
  const [openRouterSyncLoading, setOpenRouterSyncLoading] = useState(false);
  const [openRouterSyncSaving, setOpenRouterSyncSaving] = useState(false);
  const [openRouterSyncRunning, setOpenRouterSyncRunning] = useState(false);
  const [openRouterSyncError, setOpenRouterSyncError] = useState<string | null>(null);
  const [modelIdSuggestionsOpen, setModelIdSuggestionsOpen] = useState(false);
  const [syncIntervalHours, setSyncIntervalHours] = useState(
    syncIntervalHoursValue(defaultOpenRouterSyncState.intervalMinutes),
  );
  const skipSyncIntervalBlurRef = useRef(false);

  const modelScope: ModelScope = activeTab;

  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const [data, presets, availability] = await Promise.all([
        fetchModelConfigs(modelScope),
        fetchOwnerPresets(),
        modelScope === "active" ? loadConfiguredModelAvailability() : Promise.resolve(null),
      ]);
      const visibleData = mergeConfiguredModelAvailability(data, availability);
      setModels(visibleData);
      setOwnerPresets(presets);
      setOwnerFilter((current) => {
        if (!current) return "";
        return buildOwnerPresetDrafts(visibleData, presets).some((owner) => owner.value === current)
          ? current
          : "";
      });
      try {
        const usageData = await apiClient.get<{ stats?: { total_cost?: number } }>(
          "/usage/logs?days=9999&size=1",
        );
        setTotalCost(usageData?.stats?.total_cost ?? 0);
      } catch {
        setTotalCost(0);
      }
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("models_page.load_failed"),
      });
    } finally {
      setLoading(false);
    }
  }, [modelScope, notify, t]);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const loadOpenRouterSyncState = useCallback(async () => {
    setOpenRouterSyncLoading(true);
    setOpenRouterSyncError(null);
    try {
      const state = normalizeOpenRouterSyncState(await apiClient.get("/model-openrouter-sync"));
      setOpenRouterSyncState(state);
      setSyncIntervalHours(syncIntervalHoursValue(state.intervalMinutes));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("models_page.openrouter_sync_load_failed");
      setOpenRouterSyncError(message);
    } finally {
      setOpenRouterSyncLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (activeTab === "library") {
      void loadOpenRouterSyncState();
    }
  }, [activeTab, loadOpenRouterSyncState]);

  const filteredModels = useMemo(() => {
    const ownerNeedle = activeTab === "library" ? ownerFilter : "";
    const ownerFiltered = ownerNeedle
      ? models.filter((model) => normalizeOwnerValue(model.owned_by) === ownerNeedle)
      : models;
    return filterModelItems(ownerFiltered, searchFilter, statusFilter);
  }, [activeTab, models, ownerFilter, searchFilter, statusFilter]);

  const pageStats = useMemo(() => computeModelPageStats(models), [models]);
  const hasActiveFilters = Boolean(searchFilter.trim() || statusFilter || ownerFilter);
  const tableViewportHeight = useMemo(() => {
    const headerHeight = 48;
    const rowHeight = 44;
    const contentHeight = filteredModels.length * rowHeight + headerHeight;
    const maxHeight =
      typeof window !== "undefined" ? Math.round(window.innerHeight * 0.58) : 720;
    return Math.min(Math.max(contentHeight, 200), maxHeight);
  }, [filteredModels.length]);

  const filteredModelIds = useMemo(() => filteredModels.map((model) => model.id), [filteredModels]);

  const selectedModels = useMemo(
    () => models.filter((model) => selectedModelIds.has(model.id)),
    [models, selectedModelIds],
  );
  const selectedModelCount = selectedModels.length;
  const allVisibleModelsSelected =
    filteredModelIds.length > 0 && filteredModelIds.every((id) => selectedModelIds.has(id));
  const someVisibleModelsSelected = filteredModelIds.some((id) => selectedModelIds.has(id));

  useEffect(() => {
    setSelectedModelIds((current) => {
      if (current.size === 0) return current;
      const validIds = new Set(models.map((model) => model.id));
      const next = new Set(Array.from(current).filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [models]);

  useEffect(() => {
    setSelectedModelIds(new Set());
    setBulkDeleteTargetIds(null);
    setOwnerSearchFilter("");
    setStatusFilter("");
    setSearchFilter("");
  }, [activeTab]);

  const statCards = useMemo(
    () => [
      {
        key: "total",
        label: t("models_page.kpi_total"),
        value: pageStats.total.toLocaleString(),
        hint: t("models_page.kpi_total_hint"),
        icon: Cpu,
        valueClass: "text-slate-900 dark:text-white",
      },
      {
        key: "enabled",
        label: t("models_page.kpi_enabled"),
        value: pageStats.enabled.toLocaleString(),
        hint: t("models_page.kpi_enabled_hint"),
        icon: Check,
        valueClass: "text-emerald-700 dark:text-emerald-300",
      },
      {
        key: "priced",
        label: t("models_page.kpi_priced"),
        value: pageStats.priced.toLocaleString(),
        hint: t("models_page.kpi_priced_hint"),
        icon: Sigma,
        valueClass: "text-violet-700 dark:text-violet-300",
      },
      {
        key: "quota",
        label: t("models_page.kpi_quota_cost"),
        value: `$${totalCost.toFixed(4)}`,
        hint: t("models_page.kpi_quota_cost_hint"),
        icon: Activity,
        valueClass: "text-indigo-700 dark:text-indigo-300",
      },
    ],
    [pageStats, t, totalCost],
  );

  const ownerModelCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const model of models) {
      const owner = normalizeOwnerValue(model.owned_by);
      if (!owner) continue;
      counts.set(owner, (counts.get(owner) ?? 0) + 1);
    }
    return counts;
  }, [models]);

  const ownerOptions = useMemo<SearchableSelectOption[]>(() => {
    const optionMap = new Map<string, SearchableSelectOption>();
    for (const owner of ownerPresets) {
      if (!owner.enabled) continue;
      const value = normalizeOwnerValue(owner.value);
      if (!value) continue;
      optionMap.set(value, {
        value,
        label: owner.label || value,
        searchText: `${value} ${owner.label} ${owner.description}`,
      });
    }

    for (const model of models) {
      const value = normalizeOwnerValue(model.owned_by);
      if (!value || optionMap.has(value)) continue;
      optionMap.set(value, {
        value,
        label: model.owned_by,
        searchText: model.owned_by,
      });
    }

    const currentOwner = form?.ownedBy ?? "";
    const currentValue = normalizeOwnerValue(currentOwner);
    if (currentValue && !optionMap.has(currentValue)) {
      optionMap.set(currentValue, {
        value: currentValue,
        label: currentOwner.trim(),
        searchText: currentOwner,
      });
    }

    return Array.from(optionMap.values());
  }, [form?.ownedBy, models, ownerPresets]);

  const libraryOwners = useMemo(
    () => buildOwnerPresetDrafts(models, ownerPresets),
    [models, ownerPresets],
  );

  const filteredLibraryOwners = useMemo(() => {
    const needle = ownerSearchFilter.trim().toLowerCase();
    if (!needle) return libraryOwners;
    return libraryOwners.filter((owner) => {
      const haystack = `${owner.label} ${owner.value} ${owner.description}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [libraryOwners, ownerSearchFilter]);

  const reusableModelCandidates = useMemo(() => {
    if (!form || form.originalId || activeTab !== "library") return [];
    const modelNeedle = form.id.trim().toLowerCase();
    if (!modelNeedle) return [];
    const seen = new Set<string>();
    return models
      .filter((model) => {
        if (seen.has(model.id)) return false;
        seen.add(model.id);
        const haystack = `${model.id} ${model.owned_by} ${model.description}`.toLowerCase();
        return haystack.includes(modelNeedle);
      })
      .slice(0, 8);
  }, [activeTab, form, models]);

  const showReusableModelCandidates =
    modelIdSuggestionsOpen &&
    reusableModelCandidates.length > 0 &&
    Boolean(form && !form.originalId);

  const openEditModel = useCallback(
    (modelId: string) => {
      const model = models.find((entry) => entry.id === modelId);
      if (model) setForm(toFormState(model));
    },
    [models],
  );

  const openAddModel = useCallback((ownedBy = "") => {
    setForm({ ...emptyForm, ownedBy });
    setModelIdSuggestionsOpen(false);
  }, []);

  const updateForm = useCallback((patch: Partial<ModelFormState>) => {
    setForm((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const applyReusableModel = useCallback((model: ModelItem) => {
    const template = toFormState(model);
    setForm((current) =>
      current
        ? {
            ...current,
            id: template.id,
            ownedBy: current.ownedBy || template.ownedBy,
            description: template.description,
            mode: template.mode,
            inputPrice: template.inputPrice,
            outputPrice: template.outputPrice,
            cachedPrice: template.cachedPrice,
            pricePerCall: template.pricePerCall,
          }
        : current,
    );
    setModelIdSuggestionsOpen(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form) return;
    setSaving(true);
    try {
      const saved = await saveModelConfig(form, modelScope);
      setModels((prev) => {
        const withoutOriginal = prev.filter((model) => model.id !== (form.originalId ?? saved.id));
        return [...withoutOriginal, saved].sort((a, b) => a.id.localeCompare(b.id));
      });
      setOwnerPresets((prev) => buildOwnerPresetDrafts([saved], prev));
      setForm(null);
      notify({ type: "success", message: t("models_page.config_saved") });
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("models_page.save_failed"),
      });
    } finally {
      setSaving(false);
    }
  }, [form, modelScope, notify, t]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/model-configs/${encodeURIComponent(deleteTarget.id)}`);
      setModels((prev) => prev.filter((model) => model.id !== deleteTarget.id));
      setSelectedModelIds((prev) => {
        if (!prev.has(deleteTarget.id)) return prev;
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
      notify({ type: "success", message: t("models_page.delete_saved") });
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("models_page.delete_failed"),
      });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, notify, t]);

  const toggleModelSelection = useCallback((modelId: string, checked: boolean) => {
    setSelectedModelIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(modelId);
      } else {
        next.delete(modelId);
      }
      return next;
    });
  }, []);

  const toggleVisibleModelSelection = useCallback(
    (checked: boolean) => {
      setSelectedModelIds((current) => {
        const next = new Set(current);
        for (const modelId of filteredModelIds) {
          if (checked) {
            next.add(modelId);
          } else {
            next.delete(modelId);
          }
        }
        return next;
      });
    },
    [filteredModelIds],
  );

  const handleBulkDelete = useCallback(async () => {
    if (!bulkDeleteTargetIds || bulkDeleteTargetIds.length === 0) return;
    const ids = [...bulkDeleteTargetIds];
    setDeleting(true);
    try {
      for (const modelId of ids) {
        await apiClient.delete(`/model-configs/${encodeURIComponent(modelId)}`);
      }
      const deletedIds = new Set(ids);
      setModels((prev) => prev.filter((model) => !deletedIds.has(model.id)));
      setSelectedModelIds((current) => {
        const next = new Set(current);
        for (const modelId of ids) next.delete(modelId);
        return next;
      });
      setBulkDeleteTargetIds(null);
      notify({
        type: "success",
        message: t("models_page.delete_selected_models_success", { count: ids.length }),
      });
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("models_page.delete_failed"),
      });
    } finally {
      setDeleting(false);
    }
  }, [bulkDeleteTargetIds, notify, t]);

  const persistOwnerPresets = useCallback(
    async (nextPresets: ModelOwnerPreset[]) => {
      const deduped = normalizeOwnerPresetItems(nextPresets);
      setSavingOwnerPresets(true);
      try {
        await apiClient.put("/model-owner-presets", { items: deduped });
        setOwnerPresets(deduped);
        notify({ type: "success", message: t("models_page.owner_presets_saved") });
        return true;
      } catch (err: unknown) {
        notify({
          type: "error",
          message: err instanceof Error ? err.message : t("models_page.owner_presets_save_failed"),
        });
        return false;
      } finally {
        setSavingOwnerPresets(false);
      }
    },
    [notify, t],
  );

  const updateOwnerForm = useCallback((patch: Partial<OwnerFormState>) => {
    setOwnerForm((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const saveOwnerForm = useCallback(async () => {
    if (!ownerForm) return;
    const value = normalizeOwnerValue(ownerForm.value);
    const label = ownerForm.label.trim() || value;
    if (!value || !label) return;

    const nextOwner: ModelOwnerPreset = {
      value,
      label,
      description: ownerForm.description.trim(),
      enabled: ownerForm.enabled,
      modelCount: ownerForm.originalValue
        ? (ownerModelCounts.get(ownerForm.originalValue) ?? 0)
        : 0,
    };

    const withoutOriginal = ownerPresets.filter(
      (owner) => owner.value !== (ownerForm.originalValue ?? value) && owner.value !== value,
    );
    const saved = await persistOwnerPresets([...withoutOriginal, nextOwner]);
    if (saved) {
      setOwnerForm(null);
      setOwnerFilter((current) => (current === ownerForm.originalValue ? value : current));
    }
  }, [ownerForm, ownerModelCounts, ownerPresets, persistOwnerPresets]);

  const deleteOwnerPreset = useCallback(async () => {
    if (!deleteOwnerTarget) return;
    const saved = await persistOwnerPresets(
      ownerPresets.filter((owner) => owner.value !== deleteOwnerTarget.value),
    );
    if (saved) {
      setDeleteOwnerTarget(null);
      setOwnerFilter((current) => (current === deleteOwnerTarget.value ? "" : current));
    }
  }, [deleteOwnerTarget, ownerPresets, persistOwnerPresets]);

  const saveOpenRouterSyncSettings = useCallback(
    async (enabled: boolean, intervalHours = syncIntervalHours) => {
      const intervalMinutes = syncIntervalMinutesFromHours(intervalHours);
      setOpenRouterSyncSaving(true);
      setOpenRouterSyncError(null);
      try {
        const state = normalizeOpenRouterSyncState(
          await apiClient.put("/model-openrouter-sync", {
            enabled,
            interval_minutes: intervalMinutes,
          }),
        );
        setOpenRouterSyncState(state);
        setSyncIntervalHours(syncIntervalHoursValue(state.intervalMinutes));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : t("models_page.openrouter_sync_save_failed");
        setOpenRouterSyncError(message);
        notify({ type: "error", message });
      } finally {
        setOpenRouterSyncSaving(false);
      }
    },
    [notify, syncIntervalHours, t],
  );

  const runOpenRouterSync = useCallback(async () => {
    setOpenRouterSyncRunning(true);
    setOpenRouterSyncError(null);
    try {
      const payload = await apiClient.post<{
        result?: unknown;
        state?: unknown;
      }>("/model-openrouter-sync/run");
      const result = normalizeOpenRouterSyncResult(payload?.result);
      const state = normalizeOpenRouterSyncState(payload?.state ?? payload);
      setOpenRouterSyncState({
        ...state,
        ...(result
          ? {
              lastSeen: result.seen,
              lastAdded: result.added,
              lastUpdated: result.updated,
              lastSkipped: result.skipped,
            }
          : {}),
        running: false,
      });
      setSyncIntervalHours(syncIntervalHoursValue(state.intervalMinutes));
      await loadModels();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("models_page.openrouter_sync_run_failed");
      setOpenRouterSyncError(message);
      notify({ type: "error", message });
    } finally {
      setOpenRouterSyncRunning(false);
    }
  }, [loadModels, notify, t]);

  const canDeleteModels = activeTab === "library";

  const modelColumns = useMemo<VirtualTableColumn<ModelItem>[]>(
    () => [
      ...(canDeleteModels
        ? [
            {
              key: "select",
              label: "",
              width: "w-12",
              headerClassName: "text-center",
              cellClassName: "text-center",
              headerRender: () => (
                <Checkbox
                  aria-label={t("models_page.select_all_visible_models")}
                  checked={allVisibleModelsSelected}
                  indeterminate={someVisibleModelsSelected && !allVisibleModelsSelected}
                  disabled={filteredModelIds.length === 0}
                  onCheckedChange={toggleVisibleModelSelection}
                />
              ),
              render: (row) => (
                <Checkbox
                  aria-label={t("models_page.select_model_aria", { model: row.id })}
                  checked={selectedModelIds.has(row.id)}
                  onCheckedChange={(checked) => toggleModelSelection(row.id, checked)}
                />
              ),
            } satisfies VirtualTableColumn<ModelItem>,
          ]
        : []),
      {
        key: "model",
        label: t("models_page.col_model"),
        width: "w-[240px] min-w-[240px]",
        cellClassName: "min-w-0",
        render: (row) => (
          <div className="flex min-w-0 items-center gap-2">
            <VendorIcon modelId={row.id} size={16} />
            <OverflowTooltip
              content={
                row.description
                  ? `${row.id}\n${row.description}`
                  : row.id
              }
              className="block min-w-0"
            >
              <span className="block min-w-0 truncate font-medium">{row.id}</span>
            </OverflowTooltip>
          </div>
        ),
      },
      {
        key: "owner",
        label: t("models_page.col_owner"),
        width: "w-32",
        render: (row) => row.owned_by || "-",
      },
      {
        key: "mode",
        label: t("models_page.col_pricing_mode"),
        width: "w-36",
        render: (row) =>
          row.pricing.mode === "call" ? t("models_page.mode_call") : t("models_page.mode_token"),
      },
      {
        key: "price",
        label: t("models_page.col_price"),
        width: "w-52",
        cellClassName: "font-mono text-xs tabular-nums text-slate-700 dark:text-slate-200",
        render: (row) => formatPrice(row, t("models_page.not_priced")),
      },
      {
        key: "status",
        label: t("models_page.col_status"),
        width: "w-32",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (row) => {
          const priced = hasPricing(row);
          return (
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                row.enabled && priced
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-white/40",
              ].join(" ")}
            >
              {row.enabled && priced ? <Check size={10} /> : null}
              {row.enabled
                ? priced
                  ? t("models_page.priced")
                  : t("models_page.not_priced")
                : t("models_page.disabled")}
            </span>
          );
        },
      },
      {
        key: "actions",
        label: t("models_page.col_actions"),
        width: "w-24",
        render: (row) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => openEditModel(row.id)}
              aria-label={t("models_page.edit_model_aria", { model: row.id })}
              title={t("models_page.edit_model_aria", { model: row.id })}
            >
              <Edit3 size={14} />
            </Button>
            {canDeleteModels ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setDeleteTarget(row)}
                aria-label={t("models_page.delete_model_aria", { model: row.id })}
                title={t("models_page.delete_model_aria", { model: row.id })}
              >
                <Trash2 size={14} />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [
      allVisibleModelsSelected,
      canDeleteModels,
      filteredModelIds.length,
      openEditModel,
      selectedModelIds,
      someVisibleModelsSelected,
      t,
      toggleModelSelection,
      toggleVisibleModelSelection,
    ],
  );

  const selectionToolbar =
    canDeleteModels && selectedModelCount > 0 ? (
      <>
        <span className="inline-flex h-8 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600 dark:bg-white/[0.08] dark:text-white/65">
          {t("models_page.selected_models_count", { count: selectedModelCount })}
        </span>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setBulkDeleteTargetIds(selectedModels.map((model) => model.id))}
          disabled={deleting}
        >
          <Trash2 size={14} />
          {t("models_page.delete_selected_models", { count: selectedModelCount })}
        </Button>
      </>
    ) : null;

  const filterToolbar = (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="min-w-0 flex-1">
          <TextInput
            value={searchFilter}
            onChange={(event) => setSearchFilter(event.currentTarget.value)}
            placeholder={t("models_page.search")}
            type="search"
            name="model_search"
            autoComplete="off"
            spellCheck={false}
            startAdornment={<Search size={14} className="text-slate-400 dark:text-white/35" />}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {selectionToolbar}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openAddModel(activeTab === "library" ? ownerFilter : "")}
            aria-label={t("models_page.add_model")}
            title={t("models_page.add_model")}
            className="gap-1.5"
          >
            <Plus size={14} aria-hidden="true" />
            {t("models_page.add_model")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void loadModels()}
            disabled={loading}
            title={t("models_page.refresh")}
            aria-label={t("models_page.refresh")}
            className="gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
            {t("models_page.refresh")}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {([
          ["", t("models_page.filter_all")],
          ["priced", t("models_page.filter_priced")],
          ["unpriced", t("models_page.filter_unpriced")],
          ["disabled", t("models_page.filter_disabled")],
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
  );

  const modelTable = (
    <div
      className="relative overflow-x-auto rounded-xl"
      style={{ height: tableViewportHeight }}
    >
      {!loading && models.length === 0 ? (
        <EmptyState
          title={t("models_page.no_model_data")}
          description={t("models_page.empty_models_desc")}
          icon={<Cpu size={32} className="text-slate-400" />}
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => openAddModel(activeTab === "library" ? ownerFilter : "")}
              disabled={loading}
            >
              <Plus size={14} aria-hidden="true" />
              {t("models_page.add_model")}
            </Button>
          }
        />
      ) : (
        <VirtualTable<ModelItem>
          rows={filteredModels}
          columns={modelColumns}
          rowKey={(row) => row.id}
          loading={loading}
          rowHeight={44}
          height="h-full"
          minHeight="min-h-full"
          caption={t("models_page.table_caption")}
          emptyText={
            hasActiveFilters
              ? t("models_page.empty_models_filtered")
              : t("models_page.no_model_data")
          }
          minWidth="min-w-[980px]"
          stretch={false}
          showAllLoadedMessage={false}
        />
      )}
    </div>
  );

  const showingModelsFooter =
    models.length > 0 ? (
      <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-neutral-800/60 dark:text-white/45">
        {t("models_page.showing_models", {
          visible: filteredModels.length.toLocaleString(),
          total: models.length.toLocaleString(),
        })}
      </div>
    ) : null;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgb(15_23_42_/_0.035)] dark:border-white/[0.06] dark:bg-neutral-950/70 dark:shadow-[0_1px_2px_rgb(0_0_0_/_0.22)]">
        <div className="px-5 pt-5 pb-4">
          <PageToolbar
            title={t("models_page.title")}
            description={t("models_page.description")}
            titleAs="h1"
            actions={
              <Tabs
                value={activeTab}
                onValueChange={(next) => setActiveTab(next as ModelPageTab)}
                size="sm"
              >
                <TabsList>
                  <TabsTrigger value="active">{t("models_page.tab_active_models")}</TabsTrigger>
                  <TabsTrigger value="library">{t("models_page.tab_model_library")}</TabsTrigger>
                </TabsList>
              </Tabs>
            }
          />
        </div>

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

      {activeTab === "library" ? (
        <div
          data-testid="owner-library-layout"
          className="grid gap-4 border-t border-slate-100 px-5 pb-5 pt-4 dark:border-neutral-800/60 lg:grid-cols-[18rem_minmax(0,1fr)] lg:h-[calc(100dvh-380px)] lg:min-h-[28rem]"
        >
          <div data-testid="owner-sidebar-card" className="h-full min-h-0 min-w-0">
            <Card
              title={t("models_page.model_owners")}
              className="flex h-full min-h-0 flex-col overflow-hidden"
              bodyClassName="flex min-h-0 flex-1 flex-col gap-2"
              actions={
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setOwnerForm(emptyOwnerForm)}
                  aria-label={t("models_page.add_owner")}
                  title={t("models_page.add_owner")}
                >
                  <Plus size={13} />
                  {t("models_page.add_owner")}
                </Button>
              }
            >
              <TextInput
                value={ownerSearchFilter}
                onChange={(e) => setOwnerSearchFilter(e.target.value)}
                placeholder={t("models_page.owner_sidebar_search_placeholder")}
                size="sm"
                startAdornment={<Search size={14} className="text-slate-400 dark:text-white/35" />}
              />

              <button
                type="button"
                onClick={() => setOwnerFilter("")}
                className={[
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition",
                  ownerFilter === ""
                    ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/[0.08]",
                ].join(" ")}
              >
                <span className="min-w-0 truncate font-medium">{t("models_page.all_owners")}</span>
                <span
                  className={[
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px]",
                    ownerFilter === ""
                      ? "bg-white/15 text-white/80 dark:bg-slate-950/10 dark:text-slate-700"
                      : "bg-white text-slate-500 dark:bg-neutral-950 dark:text-white/45",
                  ].join(" ")}
                >
                  {t("models_page.owner_model_count", { count: models.length })}
                </span>
              </button>

              <div
                data-testid="owner-sidebar-list"
                className="-mx-1 min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto px-1 py-1"
              >
                {libraryOwners.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500 dark:border-neutral-800 dark:text-white/45">
                    {t("models_page.no_owner_presets")}
                  </div>
                ) : filteredLibraryOwners.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500 dark:border-neutral-800 dark:text-white/45">
                    {t("models_page.no_owner_search_results")}
                  </div>
                ) : (
                  filteredLibraryOwners.map((owner) => {
                    const count = ownerModelCounts.get(owner.value) ?? owner.modelCount ?? 0;
                    const selected = ownerFilter === owner.value;
                    return (
                      <div
                        key={owner.value}
                        className={[
                          "group/owner relative flex items-center gap-2 overflow-hidden rounded-xl px-2 py-1.5 transition-colors duration-200 ease-out",
                          selected
                            ? "bg-slate-100 ring-1 ring-slate-200 dark:bg-white/[0.08] dark:ring-white/10"
                            : "hover:bg-slate-50 dark:hover:bg-white/[0.04]",
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          onClick={() => setOwnerFilter(owner.value)}
                          className="min-w-0 flex-1 text-left"
                          title={owner.description || owner.value}
                        >
                          <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                            {owner.label || owner.value}
                          </span>
                          <span className="block truncate text-[11px] text-slate-500 dark:text-white/45">
                            {owner.value}
                          </span>
                        </button>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 transition-transform duration-200 ease-out group-focus-within/owner:-translate-x-16 group-hover/owner:-translate-x-16 motion-reduce:transition-none dark:bg-white/[0.08] dark:text-white/45">
                          {t("models_page.owner_model_count", { count })}
                        </span>
                        <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 translate-x-3 items-center gap-1 opacity-0 transition-all duration-200 ease-out group-focus-within/owner:pointer-events-auto group-focus-within/owner:translate-x-0 group-focus-within/owner:opacity-100 group-hover/owner:pointer-events-auto group-hover/owner:translate-x-0 group-hover/owner:opacity-100 motion-reduce:transition-none">
                          <Button
                            size="xs"
                            variant="ghost"
                            className="transition-all duration-200 ease-out"
                            onClick={() => setOwnerForm(toOwnerFormState(owner))}
                            aria-label={t("models_page.edit_owner_aria", { owner: owner.label })}
                            title={t("models_page.edit_owner_aria", { owner: owner.label })}
                          >
                            <Edit3 size={13} />
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            className="transition-all duration-200 ease-out"
                            onClick={() => setDeleteOwnerTarget(owner)}
                            aria-label={t("models_page.delete_owner_aria", { owner: owner.label })}
                            title={t("models_page.delete_owner_aria", { owner: owner.label })}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          <div data-testid="model-library-card" className="flex h-full min-h-0 min-w-0 flex-col gap-4">
            <div>
              <MonitorSectionHeader
                title={t("models_page.section_filters")}
                description={t("models_page.section_filters_desc")}
              />
              {filterToolbar}
            </div>

            <Card
              title={t("models_page.model_library")}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
              bodyClassName="relative flex min-h-0 flex-1 flex-col"
            >
              <div
                data-testid="openrouter-sync-section"
                className="mb-3 border-b border-slate-200 pb-3 dark:border-neutral-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-slate-900 dark:text-white">
                      <span>{t("models_page.openrouter_sync_title")}</span>
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          openRouterSyncState.enabled
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 dark:bg-white/[0.08] dark:text-white/45",
                        ].join(" ")}
                      >
                        {openRouterSyncState.enabled
                          ? t("models_page.openrouter_sync_auto_on")
                          : t("models_page.openrouter_sync_auto_off")}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-white/55">
                      <span>
                        {t("models_page.openrouter_sync_last_sync", {
                          value: formatSyncTimestamp(
                            openRouterSyncState.lastSyncAt,
                            t("models_page.openrouter_sync_never"),
                          ),
                        })}
                      </span>
                      <span>
                        {t("models_page.openrouter_sync_result", {
                          seen: openRouterSyncState.lastSeen,
                          added: openRouterSyncState.lastAdded,
                          updated: openRouterSyncState.lastUpdated,
                          skipped: openRouterSyncState.lastSkipped,
                        })}
                      </span>
                      {openRouterSyncLoading ? <span>{t("models_page.loading")}</span> : null}
                    </div>
                    {openRouterSyncState.lastError || openRouterSyncError ? (
                      <div className="mt-2 text-xs text-rose-600 dark:text-rose-300">
                        {t("models_page.openrouter_sync_error", {
                          error: openRouterSyncError || openRouterSyncState.lastError,
                        })}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-28">
                      <label
                        htmlFor="openrouter-sync-interval"
                        className="mb-1 block text-xs font-medium text-slate-600 dark:text-white/60"
                      >
                        {t("models_page.openrouter_sync_interval")}
                      </label>
                      <TextInput
                        id="openrouter-sync-interval"
                        type="number"
                        value={syncIntervalHours}
                        onChange={(e) => setSyncIntervalHours(e.target.value)}
                        onBlur={() => {
                          if (skipSyncIntervalBlurRef.current) {
                            skipSyncIntervalBlurRef.current = false;
                            return;
                          }
                          void saveOpenRouterSyncSettings(openRouterSyncState.enabled);
                        }}
                        min={1}
                        step={1}
                        size="sm"
                      />
                    </div>
                    <div
                      onMouseDownCapture={() => {
                        skipSyncIntervalBlurRef.current = true;
                      }}
                      className="flex flex-wrap items-end gap-3"
                    >
                      <ToggleSwitch
                        checked={openRouterSyncState.enabled}
                        onCheckedChange={(enabled) => void saveOpenRouterSyncSettings(enabled)}
                        label={t("models_page.openrouter_sync_auto")}
                        disabled={openRouterSyncSaving}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => void runOpenRouterSync()}
                        disabled={
                          openRouterSyncRunning ||
                          openRouterSyncState.running ||
                          openRouterSyncLoading
                        }
                      >
                        <RefreshCw
                          size={14}
                          className={
                            openRouterSyncRunning || openRouterSyncState.running
                              ? "animate-spin"
                              : ""
                          }
                        />
                        {t("models_page.openrouter_sync_now")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-3 min-h-0 flex-1">
                {modelTable}
              </div>
            </Card>
            {showingModelsFooter}
          </div>
        </div>
      ) : (
        <>
          <div className="border-t border-slate-100 px-5 pt-4 pb-3 dark:border-neutral-800/60">
            <MonitorSectionHeader
              title={t("models_page.section_filters")}
              description={t("models_page.section_filters_desc")}
            />
            {filterToolbar}
          </div>

          <div className="border-t border-slate-100 px-5 pt-3 pb-1 dark:border-neutral-800/60">
            <MonitorSectionHeader
              title={t("models_page.section_table")}
              description={t("models_page.section_table_desc")}
            />
          </div>

          <div className="px-5 pb-4">{modelTable}</div>
          {showingModelsFooter}
        </>
      )}
      </div>

      <Modal
        open={form !== null}
        onClose={() => {
          setForm(null);
          setModelIdSuggestionsOpen(false);
        }}
        title={form?.originalId ? t("models_page.edit_model") : t("models_page.add_model")}
        description={t("models_page.config_desc")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(null)}>
              {t("models_page.cancel")}
            </Button>
            <Button variant="primary" onClick={() => void handleSave()} disabled={saving}>
              {saving ? t("models_page.saving") : t("models_page.save")}
            </Button>
          </>
        }
      >
        {form ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="model-config-id"
                  className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80"
                >
                  {t("models_page.model_id")}
                </label>
                <div className="relative">
                  <TextInput
                    id="model-config-id"
                    role={!form.originalId && activeTab === "library" ? "combobox" : undefined}
                    aria-label={t("models_page.model_id")}
                    aria-autocomplete={
                      !form.originalId && activeTab === "library" ? "list" : undefined
                    }
                    aria-controls={
                      showReusableModelCandidates ? "model-config-id-reuse-options" : undefined
                    }
                    aria-expanded={
                      !form.originalId && activeTab === "library"
                        ? showReusableModelCandidates
                        : undefined
                    }
                    value={form.id}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      updateForm({ id: nextId });
                      setModelIdSuggestionsOpen(Boolean(nextId.trim()));
                    }}
                    onFocus={() => setModelIdSuggestionsOpen(Boolean(form.id.trim()))}
                    onBlur={() => {
                      window.setTimeout(() => setModelIdSuggestionsOpen(false), 120);
                    }}
                    placeholder={
                      !form.originalId && activeTab === "library"
                        ? t("models_page.model_id_reuse_placeholder")
                        : "gpt-4.1"
                    }
                    autoComplete="off"
                  />
                  {showReusableModelCandidates ? (
                    <div
                      id="model-config-id-reuse-options"
                      role="listbox"
                      className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-2xl bg-white p-1 shadow-[0_8px_28px_rgb(0_0_0_/_0.16)] dark:bg-[#27272A] dark:shadow-[0_14px_36px_rgb(0_0_0_/_0.38)]"
                    >
                      {reusableModelCandidates.map((model) => (
                        <button
                          key={model.id}
                          type="button"
                          role="option"
                          aria-selected={form.id === model.id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => applyReusableModel(model)}
                          className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-[#F4F4F5] dark:hover:bg-white/[0.06]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-[#18181B] dark:text-white">
                              {model.id}
                            </span>
                            <span className="block truncate text-xs text-[#71717A] dark:text-[#A1A1AA]">
                              {model.description || model.owned_by}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
                            {formatPrice(model, t("models_page.not_priced"))}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
                  {t("models_page.owner")}
                </label>
                <SearchableSelect
                  value={form.ownedBy}
                  onChange={(ownedBy) => updateForm({ ownedBy })}
                  onCreate={(ownedBy) => updateForm({ ownedBy: normalizeOwnerValue(ownedBy) })}
                  options={ownerOptions}
                  placeholder={t("models_page.owner_placeholder")}
                  searchPlaceholder={t("models_page.owner_search_placeholder")}
                  aria-label={t("models_page.owner")}
                  allowCreate
                  normalizeCreateValue={normalizeOwnerValue}
                  createLabel={(ownedBy) =>
                    t("models_page.owner_create_option", { owner: normalizeOwnerValue(ownedBy) })
                  }
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="model-config-description"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80"
              >
                {t("models_page.description_label")}
              </label>
              <textarea
                id="model-config-description"
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                rows={3}
                className="min-h-20 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200/70 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white dark:focus:border-neutral-700 dark:focus:ring-white/10"
                placeholder={t("models_page.description_placeholder")}
              />
            </div>

            <ToggleSwitch
              checked={form.enabled}
              onCheckedChange={(enabled) => updateForm({ enabled })}
              label={t("models_page.enabled")}
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
                {t("models_page.pricing_mode")}
              </label>
              <Select
                value={form.mode}
                onChange={(mode) => updateForm({ mode: mode as ModelPricingMode })}
                aria-label={t("models_page.pricing_mode")}
                options={[
                  { value: "token", label: t("models_page.mode_token") },
                  { value: "call", label: t("models_page.mode_call") },
                ]}
              />
            </div>

            {form.mode === "call" ? (
              <div>
                <label
                  htmlFor="model-config-price-per-call"
                  className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80"
                >
                  {t("models_page.price_per_call")}
                </label>
                <TextInput
                  id="model-config-price-per-call"
                  type="number"
                  value={form.pricePerCall}
                  onChange={(e) => updateForm({ pricePerCall: e.target.value })}
                  placeholder="0.04"
                  step="0.01"
                  min={0}
                />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="model-config-input-price"
                    className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80"
                  >
                    {t("models_page.input_token_price")}
                  </label>
                  <TextInput
                    id="model-config-input-price"
                    type="number"
                    value={form.inputPrice}
                    onChange={(e) => updateForm({ inputPrice: e.target.value })}
                    placeholder={t("models_page.input_price_placeholder")}
                    step="0.01"
                    min={0}
                  />
                </div>
                <div>
                  <label
                    htmlFor="model-config-output-price"
                    className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80"
                  >
                    {t("models_page.output_token_price")}
                  </label>
                  <TextInput
                    id="model-config-output-price"
                    type="number"
                    value={form.outputPrice}
                    onChange={(e) => updateForm({ outputPrice: e.target.value })}
                    placeholder={t("models_page.output_price_placeholder")}
                    step="0.01"
                    min={0}
                  />
                </div>
                <div>
                  <label
                    htmlFor="model-config-cache-price"
                    className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80"
                  >
                    {t("models_page.cache_token_price")}
                  </label>
                  <TextInput
                    id="model-config-cache-price"
                    type="number"
                    value={form.cachedPrice}
                    onChange={(e) => updateForm({ cachedPrice: e.target.value })}
                    placeholder={t("models_page.input_price_hint")}
                    step="0.01"
                    min={0}
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={ownerForm !== null}
        onClose={() => setOwnerForm(null)}
        title={ownerForm?.originalValue ? t("models_page.edit_owner") : t("models_page.add_owner")}
        description={t("models_page.owner_form_desc")}
        maxWidth="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOwnerForm(null)}>
              {t("models_page.cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={() => void saveOwnerForm()}
              disabled={savingOwnerPresets}
            >
              {savingOwnerPresets ? t("models_page.saving") : t("models_page.save")}
            </Button>
          </>
        }
      >
        {ownerForm ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="owner-preset-value"
                  className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80"
                >
                  {t("models_page.owner_value")}
                </label>
                <TextInput
                  id="owner-preset-value"
                  value={ownerForm.value}
                  onChange={(e) => updateOwnerForm({ value: e.target.value })}
                  placeholder="openai"
                />
              </div>
              <div>
                <label
                  htmlFor="owner-preset-label"
                  className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80"
                >
                  {t("models_page.owner_label")}
                </label>
                <TextInput
                  id="owner-preset-label"
                  value={ownerForm.label}
                  onChange={(e) => updateOwnerForm({ label: e.target.value })}
                  placeholder="OpenAI"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="owner-preset-description"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80"
              >
                {t("models_page.owner_description")}
              </label>
              <TextInput
                id="owner-preset-description"
                value={ownerForm.description}
                onChange={(e) => updateOwnerForm({ description: e.target.value })}
                placeholder={t("models_page.owner_description_placeholder")}
              />
            </div>
            <ToggleSwitch
              checked={ownerForm.enabled}
              onCheckedChange={(enabled) => updateOwnerForm({ enabled })}
              label={t("models_page.enabled")}
            />
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        open={deleteOwnerTarget !== null}
        title={t("models_page.delete_owner_title")}
        description={t("models_page.delete_owner_desc", {
          owner: deleteOwnerTarget?.label ?? "",
          count: deleteOwnerTarget
            ? (ownerModelCounts.get(deleteOwnerTarget.value) ?? deleteOwnerTarget.modelCount ?? 0)
            : 0,
        })}
        confirmText={t("models_page.delete")}
        busy={savingOwnerPresets}
        onClose={() => setDeleteOwnerTarget(null)}
        onConfirm={() => void deleteOwnerPreset()}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title={t("models_page.delete_model_title")}
        description={t("models_page.delete_model_desc", { model: deleteTarget?.id ?? "" })}
        confirmText={t("models_page.delete")}
        busy={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />

      <ConfirmModal
        open={bulkDeleteTargetIds !== null}
        title={t("models_page.delete_selected_models_title")}
        description={t("models_page.delete_selected_models_desc", {
          count: bulkDeleteTargetIds?.length ?? 0,
        })}
        confirmText={t("models_page.delete")}
        busy={deleting}
        onClose={() => setBulkDeleteTargetIds(null)}
        onConfirm={() => void handleBulkDelete()}
      />
    </section>
  );
}
