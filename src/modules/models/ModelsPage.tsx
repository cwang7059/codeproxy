import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, Check, Cpu, Sigma } from "lucide-react";
import { ConfirmModal } from "@/modules/ui/ConfirmModal";
import { Tabs, TabsList, TabsTrigger } from "@/modules/ui/Tabs";
import { useToast } from "@/modules/ui/ToastProvider";
import { apiClient } from "@/lib/http/client";
import { loadConfiguredModelAvailability } from "@/modules/models/modelAvailability";
import { ModelConfigModal } from "@/modules/models/components/ModelConfigModal";
import { ModelOwnerPresetModal } from "@/modules/models/components/ModelOwnerPresetModal";
import { ModelsActiveTab } from "@/modules/models/components/ModelsActiveTab";
import {
  ModelsDataTable,
  ModelsTableFooter,
} from "@/modules/models/components/ModelsDataTable";
import {
  ModelsFilterToolbar,
  ModelsSelectionToolbar,
} from "@/modules/models/components/ModelsFilterToolbar";
import { ModelsLibraryTab } from "@/modules/models/components/ModelsLibraryTab";
import { ModelsOverviewSection } from "@/modules/models/components/ModelsOverviewSection";
import {
  buildOwnerPresetDrafts,
  defaultOpenRouterSyncState,
  emptyForm,
  emptyOwnerForm,
  fetchModelConfigs,
  fetchOwnerPresets,
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
  type ModelFormState,
  type ModelItem,
  type ModelOwnerPreset,
  type ModelPageTab,
  type ModelScope,
  type OpenRouterModelSyncState,
  type OwnerFormState,
} from "@/modules/models/models-page-helpers";
import {
  computeModelPageStats,
  filterModelItems,
  type ModelStatusFilter,
} from "@/modules/models/models-page-utils";
import { PageToolbar } from "@/modules/ui/PageToolbar";
import type { SearchableSelectOption } from "@/modules/ui/SearchableSelect";

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
  const addModelOwnedBy = activeTab === "library" ? ownerFilter : "";

  const filterToolbar = (
    <ModelsFilterToolbar
      searchFilter={searchFilter}
      statusFilter={statusFilter}
      loading={loading}
      selectionToolbar={
        canDeleteModels ? (
          <ModelsSelectionToolbar
            selectedModelCount={selectedModelCount}
            deleting={deleting}
            onBulkDelete={() =>
              setBulkDeleteTargetIds(selectedModels.map((model) => model.id))
            }
          />
        ) : null
      }
      onSearchFilterChange={setSearchFilter}
      onStatusFilterChange={setStatusFilter}
      onAddModel={() => openAddModel(addModelOwnedBy)}
      onRefresh={() => void loadModels()}
    />
  );

  const modelTable = (
    <ModelsDataTable
      models={models}
      filteredModels={filteredModels}
      loading={loading}
      hasActiveFilters={hasActiveFilters}
      canDeleteModels={canDeleteModels}
      tableViewportHeight={tableViewportHeight}
      filteredModelIds={filteredModelIds}
      selectedModelIds={selectedModelIds}
      allVisibleModelsSelected={allVisibleModelsSelected}
      someVisibleModelsSelected={someVisibleModelsSelected}
      onAddModel={() => openAddModel(addModelOwnedBy)}
      onEditModel={openEditModel}
      onDeleteModel={setDeleteTarget}
      onToggleModelSelection={toggleModelSelection}
      onToggleVisibleModelSelection={toggleVisibleModelSelection}
    />
  );

  const showingModelsFooter = (
    <ModelsTableFooter models={models} filteredModels={filteredModels} />
  );

  return (
    <section className="page-stack">
      <div className="surface-card">
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

        <ModelsOverviewSection statCards={statCards} hasActiveFilters={hasActiveFilters} />

        {activeTab === "library" ? (
          <ModelsLibraryTab
            filterToolbar={filterToolbar}
            modelTable={modelTable}
            showingModelsFooter={showingModelsFooter}
            ownerSidebar={{
              totalModelCount: models.length,
              libraryOwners,
              filteredLibraryOwners,
              ownerModelCounts,
              ownerFilter,
              ownerSearchFilter,
              onOwnerFilterChange: setOwnerFilter,
              onOwnerSearchFilterChange: setOwnerSearchFilter,
              onAddOwner: () => setOwnerForm(emptyOwnerForm),
              onEditOwner: (owner) => setOwnerForm(toOwnerFormState(owner)),
              onDeleteOwner: setDeleteOwnerTarget,
            }}
            openRouterSync={{
              syncState: openRouterSyncState,
              loading: openRouterSyncLoading,
              saving: openRouterSyncSaving,
              running: openRouterSyncRunning,
              error: openRouterSyncError,
              syncIntervalHours,
              onSyncIntervalHoursChange: setSyncIntervalHours,
              onSaveSettings: saveOpenRouterSyncSettings,
              onRunSync: runOpenRouterSync,
            }}
          />
        ) : (
          <ModelsActiveTab
            filterToolbar={filterToolbar}
            modelTable={modelTable}
            showingModelsFooter={showingModelsFooter}
          />
        )}
      </div>

      <ModelConfigModal
        open={form !== null}
        form={form}
        activeTab={activeTab}
        saving={saving}
        ownerOptions={ownerOptions}
        reusableModelCandidates={reusableModelCandidates}
        showReusableModelCandidates={showReusableModelCandidates}
        onClose={() => {
          setForm(null);
          setModelIdSuggestionsOpen(false);
        }}
        onSave={() => void handleSave()}
        onUpdateForm={updateForm}
        onModelIdSuggestionsOpenChange={setModelIdSuggestionsOpen}
        onApplyReusableModel={applyReusableModel}
      />

      <ModelOwnerPresetModal
        open={ownerForm !== null}
        ownerForm={ownerForm}
        saving={savingOwnerPresets}
        onClose={() => setOwnerForm(null)}
        onSave={() => void saveOwnerForm()}
        onUpdateForm={updateOwnerForm}
      />

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
