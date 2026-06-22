import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { MoreHorizontal, RefreshCw, ScrollText } from "lucide-react";
import { ampcodeApi, providersApi, usageApi } from "@/lib/http/apis";
import { apiKeyEntriesApi, type ApiKeyEntry } from "@/lib/http/apis/api-keys";
import { channelGroupsApi, type ChannelGroupItem } from "@/lib/http/apis/channel-groups";
import { proxiesApi, type ProxyPoolEntry } from "@/lib/http/apis/proxies";
import type { BedrockProviderConfig, OpenAIProvider, ProviderSimpleConfig } from "@/lib/http/types";
import { Button } from "@/modules/ui/Button";
import { PageToolbar } from "@/modules/ui/PageToolbar";
import { ConfirmModal } from "@/modules/ui/ConfirmModal";
import { Tabs } from "@/modules/ui/Tabs";
import { useToast } from "@/modules/ui/ToastProvider";
import { downloadTextAsFile } from "@/modules/auth-files/helpers/authFilesPageUtils";
import { OpenAIProviderModal } from "@/modules/providers/components/OpenAIProviderModal";
import { ProvidersBatchActionsBar } from "@/modules/providers/components/ProvidersBatchActionsBar";
import { ProvidersImportPreviewModal } from "@/modules/providers/components/ProvidersImportPreviewModal";
import { ProvidersTabList, ProvidersTabPanels } from "@/modules/providers/components/ProvidersTabPanels";
import { ProviderKeyModal } from "@/modules/providers/components/ProviderKeyModal";
import { useOpenAIProviderEditor } from "@/modules/providers/hooks/useOpenAIProviderEditor";
import { useProviderKeyEditor } from "@/modules/providers/hooks/useProviderKeyEditor";
import { useProviderLatency } from "@/modules/providers/hooks/useProviderLatency";
import { useProviderUsageSummary } from "@/modules/providers/hooks/useProviderUsageSummary";
import { normalizeUsageSourceId, type KeyStatBucket } from "@/modules/providers/provider-usage";
import {
  getProviderSelectionKey,
  type ProviderDeleteConfirm,
  type ProviderTab,
} from "@/modules/providers/providers-page-types";
import {
  maskApiKey,
  readBool,
  readString,
  type AmpMappingEntry,
} from "@/modules/providers/providers-helpers";
import {
  createProviderExportText,
  prepareProviderImport,
  type ProviderImportDiff,
  type ProviderImportKind,
} from "@/modules/providers/provider-import-export";
import { summarizeProviderAccess } from "@/modules/providers/provider-access";

export function ProvidersPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [isPending, startTransition] = useTransition();
  const location = useLocation();
  const navigate = useNavigate();
  const { getEntry: getLatencyEntry, checkLatency } = useProviderLatency();

  const [tab, setTab] = useState<ProviderTab>("gemini");
  const [loading, setLoading] = useState(true);

  const [geminiKeys, setGeminiKeys] = useState<ProviderSimpleConfig[]>([]);
  const [claudeKeys, setClaudeKeys] = useState<ProviderSimpleConfig[]>([]);
  const [codexKeys, setCodexKeys] = useState<ProviderSimpleConfig[]>([]);
  const [openCodeGoKeys, setOpenCodeGoKeys] = useState<ProviderSimpleConfig[]>([]);
  const [vertexKeys, setVertexKeys] = useState<ProviderSimpleConfig[]>([]);
  const [bedrockKeys, setBedrockKeys] = useState<BedrockProviderConfig[]>([]);
  const [openaiProviders, setOpenaiProviders] = useState<OpenAIProvider[]>([]);
  const [apiKeyEntries, setApiKeyEntries] = useState<ApiKeyEntry[]>([]);
  const [channelGroups, setChannelGroups] = useState<ChannelGroupItem[]>([]);
  const [proxyPoolEntries, setProxyPoolEntries] = useState<ProxyPoolEntry[]>([]);

  const [usageStatsBySource, setUsageStatsBySource] = useState<Record<string, KeyStatBucket>>({});

  const [ampcode, setAmpcode] = useState<Record<string, unknown> | null>(null);
  const [ampUpstreamUrl, setAmpUpstreamUrl] = useState("");
  const [ampUpstreamApiKey, setAmpUpstreamApiKey] = useState("");
  const [ampForceMappings, setAmpForceMappings] = useState(false);
  const [ampMappings, setAmpMappings] = useState<AmpMappingEntry[]>([]);

  const [confirm, setConfirm] = useState<ProviderDeleteConfirm | null>(null);
  const handledRouteRef = useRef("");
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importPreview, setImportPreview] = useState<{
    kind: ProviderImportKind;
    nextItems: ProviderSimpleConfig[] | BedrockProviderConfig[] | OpenAIProvider[];
    diff: ProviderImportDiff;
    filename: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedExportKeys, setSelectedExportKeys] = useState<string[]>([]);
  const refreshTab = useCallback(
    async (tabId: typeof tab) => {
      setLoading(true);
      try {
        switch (tabId) {
          case "gemini":
            setGeminiKeys(await providersApi.getGeminiKeys());
            break;
          case "claude":
            setClaudeKeys(await providersApi.getClaudeConfigs());
            break;
          case "codex":
            setCodexKeys(await providersApi.getCodexConfigs());
            break;
          case "opencode-go":
            setOpenCodeGoKeys(await providersApi.getOpenCodeGoConfigs());
            break;
          case "vertex":
            setVertexKeys(await providersApi.getVertexConfigs());
            break;
          case "bedrock":
            setBedrockKeys(await providersApi.getBedrockConfigs());
            break;
          case "openai":
            setOpenaiProviders(await providersApi.getOpenAIProviders());
            break;
          case "ampcode": {
            const [amp, ampMap] = await Promise.all([
              ampcodeApi.getAmpcode(),
              ampcodeApi.getModelMappings(),
            ]);
            const ampObj =
              amp && typeof amp === "object" && !Array.isArray(amp)
                ? (amp as Record<string, unknown>)
                : {};
            setAmpcode(ampObj);
            setAmpUpstreamUrl(readString(ampObj, "upstreamUrl", "upstream-url"));
            setAmpForceMappings(readBool(ampObj, "forceModelMappings", "force-model-mappings"));

            const mappings = Array.isArray(ampMap) ? ampMap : [];
            const entries: AmpMappingEntry[] = mappings
              .map((item, idx) => {
                if (!item || typeof item !== "object") return null;
                const record = item as Record<string, unknown>;
                const from = String(record.from ?? "").trim();
                const to = String(record.to ?? "").trim();
                if (!from || !to) return null;
                return { id: `map-${idx}-${from}`, from, to };
              })
              .filter(Boolean) as AmpMappingEntry[];
            setAmpMappings(
              entries.length ? entries : [{ id: `map-${Date.now()}`, from: "", to: "" }],
            );
            break;
          }
        }
      } catch (err: unknown) {
        notify({
          type: "error",
          message: err instanceof Error ? err.message : t("providers.load_failed"),
        });
      } finally {
        setLoading(false);
      }
    },
    [notify],
  );

  const loadUsage = useCallback(async () => {
    try {
      const usage = await usageApi.getEntityStats(30, "all").catch(() => null);
      if (usage?.source) {
        const stats: Record<string, KeyStatBucket> = {};
        usage.source.forEach((pt) => {
          const src = normalizeUsageSourceId(pt.entity_name, maskApiKey);
          if (src) {
            const bucket = stats[src] ?? { success: 0, failure: 0 };
            bucket.success += pt.requests - pt.failed;
            bucket.failure += pt.failed;
            stats[src] = bucket;
          }
        });
        setUsageStatsBySource(stats);
      }
    } catch {}
  }, []);

  const loadAccessSnapshot = useCallback(async () => {
    try {
      const [entries, groups] = await Promise.all([
        apiKeyEntriesApi.list(),
        channelGroupsApi.list(),
      ]);
      setApiKeyEntries(entries);
      setChannelGroups(groups);
    } catch {
      setApiKeyEntries([]);
      setChannelGroups([]);
    }
  }, []);

  const loadProxyPool = useCallback(async () => {
    try {
      setProxyPoolEntries(await proxiesApi.list());
    } catch {
      setProxyPoolEntries([]);
    }
  }, []);

  const {
    getSimpleStats,
    getSimpleStatusBar,
    getOpenAIProviderStats,
    getOpenAIKeyEntryStats,
    getOpenAIProviderStatusBar,
  } = useProviderUsageSummary({
    usageStatsBySource,
    maskApiKey,
  });

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshTab(tab), loadUsage(), loadAccessSnapshot(), loadProxyPool()]);
  }, [loadAccessSnapshot, loadProxyPool, loadUsage, refreshTab, tab]);

  useEffect(() => {
    void refreshTab(tab);
    void loadUsage();
    void loadAccessSnapshot();
    void loadProxyPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getProviderAccessSummary = useCallback(
    (item: ProviderSimpleConfig) => {
      const channelName = String(item.name ?? "").trim();
      if (!channelName) {
        return null;
      }
      return summarizeProviderAccess(channelName, apiKeyEntries, channelGroups);
    },
    [apiKeyEntries, channelGroups],
  );

  const handleKeyEditorRouteClose = useCallback(() => {
    if (location.pathname !== "/ai-providers") {
      navigate("/ai-providers", { replace: true, viewTransition: true });
    }
  }, [location.pathname, navigate]);

  const handleOpenAIEditorRouteClose = useCallback(() => {
    if (location.pathname !== "/ai-providers") {
      navigate("/ai-providers", { replace: true, viewTransition: true });
    }
  }, [location.pathname, navigate]);

  const {
    editKeyOpen,
    editKeyType,
    editKeyIndex,
    editKeyTitle,
    keyDraft,
    setKeyDraft,
    keyDraftError,
    closeKeyEditor,
    openKeyEditor,
    saveKeyDraft,
    deleteKey,
    toggleKeyEnabled,
    editKeyEnabled,
    editKeyEnabledToggle,
    editKeyExcludedCount,
    editKeyHeaderCount,
    editKeyModelCount,
  } = useProviderKeyEditor({
    geminiKeys,
    claudeKeys,
    codexKeys,
    openCodeGoKeys,
    vertexKeys,
    bedrockKeys,
    setGeminiKeys,
    setClaudeKeys,
    setCodexKeys,
    setOpenCodeGoKeys,
    setVertexKeys,
    setBedrockKeys,
    refreshAll,
    startRefreshTransition: startTransition,
    afterClose: handleKeyEditorRouteClose,
  });

  const {
    editOpenAIOpen,
    editOpenAIIndex,
    openaiDraft,
    setOpenaiDraft,
    openaiDraftError,
    discoveredModels,
    discovering,
    discoverSelected,
    setDiscoverSelected,
    closeOpenAIEditor,
    openOpenAIEditor,
    saveOpenAIDraft,
    deleteOpenAIProvider,
    toggleOpenAIKeyEntryEnabled,
    discoverModels,
    applyDiscoveredModels,
  } = useOpenAIProviderEditor({
    openaiProviders,
    setOpenaiProviders,
    refreshAll,
    startRefreshTransition: startTransition,
    afterClose: handleOpenAIEditorRouteClose,
  });

  useEffect(() => {
    if (loading) return;
    const pathname = location.pathname;
    if (!pathname.startsWith("/ai-providers/")) {
      handledRouteRef.current = "";
      return;
    }
    if (handledRouteRef.current === pathname) return;
    handledRouteRef.current = pathname;

    const parts = pathname.split("/").filter(Boolean);
    const provider = parts[1] ?? "";
    const action = parts[2] ?? "";

    void (async () => {
      if (
        provider === "gemini" ||
        provider === "claude" ||
        provider === "codex" ||
        provider === "opencode-go" ||
        provider === "vertex" ||
        provider === "bedrock"
      ) {
        setSelectedExportKeys([]);
        setTab(provider);
        await refreshTab(provider);
        if (action === "new") {
          openKeyEditor(provider, null);
          return;
        }
        const index = Number(action);
        if (Number.isFinite(index) && index >= 0) {
          openKeyEditor(provider, index);
        }
        return;
      }

      if (provider === "openai") {
        setSelectedExportKeys([]);
        setTab("openai");
        await refreshTab("openai");
        if (action === "new") {
          openOpenAIEditor(null);
          return;
        }
        const index = Number(action);
        if (Number.isFinite(index) && index >= 0) {
          openOpenAIEditor(index);
        }
        return;
      }

      if (provider === "ampcode") {
        setSelectedExportKeys([]);
        setTab("ampcode");
        await refreshTab("ampcode");
      }
    })();
  }, [loading, location.pathname, openKeyEditor, openOpenAIEditor, refreshTab]);

  const saveAmpcode = useCallback(async () => {
    try {
      const upstreamUrl = ampUpstreamUrl.trim();
      if (upstreamUrl) {
        await ampcodeApi.updateUpstreamUrl(upstreamUrl);
      } else {
        await ampcodeApi.clearUpstreamUrl();
      }

      const upstreamKey = ampUpstreamApiKey.trim();
      if (upstreamKey) {
        await ampcodeApi.updateUpstreamApiKey(upstreamKey);
      }

      await ampcodeApi.updateForceModelMappings(ampForceMappings);

      const mappings = ampMappings
        .map((m) => ({ from: m.from.trim(), to: m.to.trim() }))
        .filter((m) => m.from && m.to);
      await ampcodeApi.patchModelMappings(mappings);

      notify({ type: "success", message: t("providers.ampcode_saved") });
      startTransition(() => void refreshAll());
      setAmpUpstreamApiKey("");
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("providers.save_failed"),
      });
    }
  }, [
    ampForceMappings,
    ampMappings,
    ampUpstreamApiKey,
    ampUpstreamUrl,
    notify,
    refreshAll,
    startTransition,
  ]);

  const copyText = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        notify({ type: "success", message: t("providers.copied") });
      } catch {
        notify({ type: "error", message: t("providers.copy_failed") });
      }
    },
    [notify],
  );

  const getImportKind = useCallback((): ProviderImportKind | null => {
    if (tab === "ampcode") return null;
    return tab;
  }, [tab]);

  const getCurrentItems = useCallback(
    (kind: ProviderImportKind) => {
      switch (kind) {
        case "gemini":
          return geminiKeys;
        case "claude":
          return claudeKeys;
        case "codex":
          return codexKeys;
        case "opencode-go":
          return openCodeGoKeys;
        case "vertex":
          return vertexKeys;
        case "bedrock":
          return bedrockKeys;
        case "openai":
          return openaiProviders;
      }
    },
    [bedrockKeys, claudeKeys, codexKeys, geminiKeys, openCodeGoKeys, openaiProviders, vertexKeys],
  );

  const currentImportKind = getImportKind();
  const isActiveTabListLoading = useCallback(
    (tabId: ProviderTab) => tab === tabId && loading,
    [loading, tab],
  );
  const currentTabItems = useMemo(
    () => (currentImportKind ? getCurrentItems(currentImportKind) : []),
    [currentImportKind, getCurrentItems],
  );
  const currentSelectableKeys = useMemo(
    () =>
      currentImportKind
        ? currentTabItems.map((item) =>
            getProviderSelectionKey(
              currentImportKind,
              item as ProviderSimpleConfig | BedrockProviderConfig | OpenAIProvider,
            ),
          )
        : [],
    [currentImportKind, currentTabItems],
  );
  const selectedExportKeySet = useMemo(() => new Set(selectedExportKeys), [selectedExportKeys]);
  const selectedExportCount = selectedExportKeys.length;
  const allCurrentSelected =
    currentSelectableKeys.length > 0 &&
    currentSelectableKeys.every((key) => selectedExportKeySet.has(key));

  const saveImportedItems = useCallback(
    async (
      kind: ProviderImportKind,
      items: ProviderSimpleConfig[] | BedrockProviderConfig[] | OpenAIProvider[],
    ) => {
      switch (kind) {
        case "gemini":
          await providersApi.saveGeminiKeys(items as ProviderSimpleConfig[]);
          return;
        case "claude":
          await providersApi.saveClaudeConfigs(items as ProviderSimpleConfig[]);
          return;
        case "codex":
          await providersApi.saveCodexConfigs(items as ProviderSimpleConfig[]);
          return;
        case "opencode-go":
          await providersApi.saveOpenCodeGoConfigs(items as ProviderSimpleConfig[]);
          return;
        case "vertex":
          await providersApi.saveVertexConfigs(items as ProviderSimpleConfig[]);
          return;
        case "bedrock":
          await providersApi.saveBedrockConfigs(items as BedrockProviderConfig[]);
          return;
        case "openai":
          await providersApi.saveOpenAIProviders(items as OpenAIProvider[]);
          return;
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedExportKeys.length === 0) return;
    const selectableKeySet = new Set(currentSelectableKeys);
    const next = selectedExportKeys.filter((key) => selectableKeySet.has(key));
    if (next.length !== selectedExportKeys.length) {
      setSelectedExportKeys(next);
    }
  }, [currentSelectableKeys, selectedExportKeys]);

  const toggleExportSelection = useCallback((key: string, checked: boolean) => {
    setSelectedExportKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return Array.from(next);
    });
  }, []);

  const selectAllCurrentItems = useCallback(
    (checked: boolean) => {
      if (!checked) {
        setSelectedExportKeys([]);
        return;
      }
      setSelectedExportKeys(currentSelectableKeys);
    },
    [currentSelectableKeys],
  );

  const handleExport = useCallback(() => {
    const kind = currentImportKind;
    if (!kind) return;
    downloadTextAsFile(
      createProviderExportText(kind, getCurrentItems(kind) as never),
      `${kind}-providers.json`,
    );
  }, [currentImportKind, getCurrentItems]);

  const handleExportSelected = useCallback(() => {
    const kind = currentImportKind;
    if (!kind || selectedExportCount === 0) return;
    const selectedItems = currentTabItems.filter((item) =>
      selectedExportKeySet.has(
        getProviderSelectionKey(
          kind,
          item as ProviderSimpleConfig | BedrockProviderConfig | OpenAIProvider,
        ),
      ),
    );
    downloadTextAsFile(
      createProviderExportText(kind, selectedItems as never),
      `${kind}-providers-selected.json`,
    );
  }, [currentImportKind, currentTabItems, selectedExportCount, selectedExportKeySet]);

  const handleImportFile = useCallback(
    async (file: File | null) => {
      const kind = currentImportKind;
      if (!kind || !file) return;
      if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
        notify({ type: "error", message: t("upload_error_json") });
        return;
      }

      try {
        const preview = prepareProviderImport(
          kind,
          await file.text(),
          getCurrentItems(kind) as never,
        );
        setImportPreview({
          kind,
          nextItems: preview.nextItems,
          diff: preview.diff,
          filename: file.name,
        });
      } catch (error: unknown) {
        notify({
          type: "error",
          message:
            error instanceof Error && error.message === "provider_mismatch"
              ? t("providers.import_provider_mismatch")
              : t("providers.import_invalid"),
        });
      }
    },
    [currentImportKind, getCurrentItems, notify, t],
  );

  const confirmImport = useCallback(async () => {
    if (!importPreview || !importPreview.diff.hasChanges) return;
    setImporting(true);
    try {
      await saveImportedItems(importPreview.kind, importPreview.nextItems);
      notify({
        type: "success",
        message: t("providers.import_success", { filename: importPreview.filename }),
      });
      setImportPreview(null);
      startTransition(() => void refreshAll());
    } catch (error: unknown) {
      notify({
        type: "error",
        message: error instanceof Error ? error.message : t("providers.save_failed"),
      });
    } finally {
      setImporting(false);
    }
  }, [importPreview, notify, refreshAll, saveImportedItems, startTransition, t]);

  return (
    <section
      data-testid="providers-page-shell"
      className="page-stack flex h-[calc(100dvh-112px)] min-h-0 flex-col overflow-hidden"
    >
      <PageToolbar
        title={t("providers.config_overview")}
        description={t("providers.config_overview_desc")}
        filters={
          <ProvidersBatchActionsBar
            importInputRef={importInputRef}
            currentImportKind={currentImportKind}
            currentTabItemsCount={currentTabItems.length}
            allCurrentSelected={allCurrentSelected}
            currentSelectableKeysCount={currentSelectableKeys.length}
            selectedExportCount={selectedExportCount}
            loading={loading}
            onImportFile={handleImportFile}
            onExport={handleExport}
            onSelectAll={selectAllCurrentItems}
            onClearSelection={() => setSelectedExportKeys([])}
            onExportSelected={handleExportSelected}
            onRefresh={() => void refreshTab(tab)}
          />
        }
      />

      <Tabs
        value={tab}
        onValueChange={(next) => {
          const nextTab = next as typeof tab;
          if (nextTab === tab) return;
          setSelectedExportKeys([]);
          setTab(nextTab);
          void refreshTab(nextTab);
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <ProvidersTabList />
          <ProvidersTabPanels
            geminiKeys={geminiKeys}
            claudeKeys={claudeKeys}
            codexKeys={codexKeys}
            openCodeGoKeys={openCodeGoKeys}
            vertexKeys={vertexKeys}
            bedrockKeys={bedrockKeys}
            openaiProviders={openaiProviders}
            ampcode={ampcode}
            ampMappings={ampMappings}
            ampUpstreamUrl={ampUpstreamUrl}
            setAmpUpstreamUrl={setAmpUpstreamUrl}
            ampUpstreamApiKey={ampUpstreamApiKey}
            setAmpUpstreamApiKey={setAmpUpstreamApiKey}
            ampForceMappings={ampForceMappings}
            setAmpForceMappings={setAmpForceMappings}
            setAmpMappings={setAmpMappings}
            loading={loading}
            isPending={isPending}
            isActiveTabListLoading={isActiveTabListLoading}
            openKeyEditor={openKeyEditor}
            setConfirm={setConfirm}
            toggleKeyEnabled={toggleKeyEnabled}
            openOpenAIEditor={openOpenAIEditor}
            toggleOpenAIKeyEntryEnabled={toggleOpenAIKeyEntryEnabled}
            saveAmpcode={saveAmpcode}
            getSimpleStats={getSimpleStats}
            getSimpleStatusBar={getSimpleStatusBar}
            getProviderAccessSummary={getProviderAccessSummary}
            getOpenAIKeyEntryStats={getOpenAIKeyEntryStats}
            getOpenAIProviderStats={getOpenAIProviderStats}
            getOpenAIProviderStatusBar={getOpenAIProviderStatusBar}
            getLatencyEntry={getLatencyEntry}
            checkLatency={checkLatency}
            maskApiKey={maskApiKey}
            selectedExportKeySet={selectedExportKeySet}
            toggleExportSelection={toggleExportSelection}
          />
        </div>
      </Tabs>

      <ProviderKeyModal
        open={editKeyOpen}
        editKeyIndex={editKeyIndex}
        editKeyTitle={editKeyTitle}
        editKeyType={editKeyType}
        keyDraft={keyDraft}
        setKeyDraft={setKeyDraft}
        keyDraftError={keyDraftError}
        closeKeyEditor={closeKeyEditor}
        saveKeyDraft={saveKeyDraft}
        editKeyEnabled={editKeyEnabled}
        editKeyEnabledToggle={editKeyEnabledToggle}
        editKeyHeaderCount={editKeyHeaderCount}
        editKeyModelCount={editKeyModelCount}
        editKeyExcludedCount={editKeyExcludedCount}
        proxyPoolEntries={proxyPoolEntries}
        copyText={copyText}
        maskApiKey={maskApiKey}
      />

      <OpenAIProviderModal
        open={editOpenAIOpen}
        editOpenAIIndex={editOpenAIIndex}
        openaiDraft={openaiDraft}
        setOpenaiDraft={setOpenaiDraft}
        openaiDraftError={openaiDraftError}
        closeOpenAIEditor={closeOpenAIEditor}
        saveOpenAIDraft={saveOpenAIDraft}
        discovering={discovering}
        discoverModels={discoverModels}
        applyDiscoveredModels={applyDiscoveredModels}
        discoveredModels={discoveredModels}
        discoverSelected={discoverSelected}
        setDiscoverSelected={setDiscoverSelected}
        proxyPoolEntries={proxyPoolEntries}
        copyText={copyText}
        maskApiKey={maskApiKey}
      />

      <ConfirmModal
        open={confirm !== null}
        title={t("providers.confirm_delete")}
        description={
          confirm?.type === "deleteOpenAI"
            ? t("providers.confirm_delete_openai", {
                name: openaiProviders[confirm.index]?.name ?? "",
              })
            : confirm?.type === "deleteKey"
              ? t("providers.confirm_delete_config")
              : t("providers.confirm_delete_generic")
        }
        confirmText={t("providers.delete")}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          const action = confirm;
          setConfirm(null);
          if (!action) return;
          if (action.type === "deleteOpenAI") {
            void deleteOpenAIProvider(action.index);
            return;
          }
          void deleteKey(action.keyType, action.index);
        }}
      />

      <ProvidersImportPreviewModal
        open={importPreview !== null}
        importing={importing}
        filename={importPreview?.filename}
        diff={importPreview?.diff ?? null}
        onClose={() => setImportPreview(null)}
        onConfirm={() => void confirmImport()}
      />
    </section>
  );
}
