import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Cloud, Database, FileKey, Globe } from "lucide-react";
import iconGemini from "@/assets/icons/gemini.svg";
import iconClaude from "@/assets/icons/claude.svg";
import iconCodex from "@/assets/icons/codex.svg";
import iconVertex from "@/assets/icons/vertex.svg";
import iconAmp from "@/assets/icons/amp.svg";
import iconOpenai from "@/assets/icons/openai.svg";
import iconOpenCodeDark from "@/assets/icons/opencode-dark.svg";
import iconOpenCodeLight from "@/assets/icons/opencode-light.svg";
import type { BedrockProviderConfig, OpenAIProvider, ProviderSimpleConfig } from "@/lib/http/types";
import { AmpcodePanel } from "@/modules/providers/components/AmpcodePanel";
import { OpenAIProvidersTab } from "@/modules/providers/components/OpenAIProvidersTab";
import { ProviderSimpleKeyTabPanel } from "@/modules/providers/components/ProviderSimpleKeyTabPanel";
import type { ProviderAccessSummary } from "@/modules/providers/provider-access";
import type { KeyStatBucket, StatusBarData } from "@/modules/providers/provider-usage";
import type { AmpMappingEntry } from "@/modules/providers/providers-helpers";
import type { ProviderKeyType } from "@/modules/providers/hooks/useProviderKeyEditor";
import type {
  ProviderDeleteConfirm,
  ProviderTab,
} from "@/modules/providers/providers-page-types";
import { TabsContent, TabsList, TabsTrigger } from "@/modules/ui/Tabs";

type OpenAIProvidersTabProps = ComponentProps<typeof OpenAIProvidersTab>;

interface ProvidersTabPanelsProps {
  geminiKeys: ProviderSimpleConfig[];
  claudeKeys: ProviderSimpleConfig[];
  codexKeys: ProviderSimpleConfig[];
  openCodeGoKeys: ProviderSimpleConfig[];
  vertexKeys: ProviderSimpleConfig[];
  bedrockKeys: BedrockProviderConfig[];
  openaiProviders: OpenAIProvider[];
  ampcode: Record<string, unknown> | null;
  ampMappings: AmpMappingEntry[];
  ampUpstreamUrl: string;
  setAmpUpstreamUrl: (value: string) => void;
  ampUpstreamApiKey: string;
  setAmpUpstreamApiKey: (value: string) => void;
  ampForceMappings: boolean;
  setAmpForceMappings: (value: boolean) => void;
  setAmpMappings: Dispatch<SetStateAction<AmpMappingEntry[]>>;
  loading: boolean;
  isPending: boolean;
  isActiveTabListLoading: (tabId: ProviderTab) => boolean;
  openKeyEditor: (keyType: ProviderKeyType, index: number | null) => void;
  setConfirm: (value: ProviderDeleteConfirm | null) => void;
  toggleKeyEnabled: (
    keyType: "gemini" | "claude" | "codex" | "opencode-go" | "bedrock",
    index: number,
    enabled: boolean,
  ) => void | Promise<void>;
  openOpenAIEditor: (index: number | null) => void;
  toggleOpenAIKeyEntryEnabled: (
    providerIndex: number,
    entryIndex: number,
    enabled: boolean,
  ) => void;
  saveAmpcode: () => Promise<void>;
  getSimpleStats: (item: ProviderSimpleConfig) => KeyStatBucket;
  getSimpleStatusBar: (item: ProviderSimpleConfig) => StatusBarData;
  getProviderAccessSummary: (item: ProviderSimpleConfig) => ProviderAccessSummary | null;
  getOpenAIKeyEntryStats: OpenAIProvidersTabProps["getKeyEntryStats"];
  getOpenAIProviderStats: OpenAIProvidersTabProps["getProviderStats"];
  getOpenAIProviderStatusBar: OpenAIProvidersTabProps["getProviderStatusBar"];
  getLatencyEntry: (key: string) => { latencyMs: number | null; loading: boolean; error: boolean };
  checkLatency: (key: string, baseUrl: string) => void;
  maskApiKey: (value: string) => string;
  selectedExportKeySet: Set<string>;
  toggleExportSelection: (key: string, checked: boolean) => void;
}

export function ProvidersTabList() {
  const { t } = useTranslation();

  return (
    <div className="flex shrink-0">
      <TabsList>
        <TabsTrigger value="gemini">
          <img src={iconGemini} alt="" className="size-4" />
          {t("providers.tab_gemini")}
        </TabsTrigger>
        <TabsTrigger value="claude">
          <img src={iconClaude} alt="" className="size-4" />
          {t("providers.tab_claude")}
        </TabsTrigger>
        <TabsTrigger value="codex">
          <img src={iconCodex} alt="" className="size-4 dark:hidden" />
          <img src={iconCodex} alt="" className="hidden size-4 dark:block" />
          {t("providers.tab_codex")}
        </TabsTrigger>
        <TabsTrigger value="opencode-go">
          <img src={iconOpenCodeLight} alt="" className="size-4 dark:hidden" />
          <img src={iconOpenCodeDark} alt="" className="hidden size-4 dark:block" />
          {t("providers.tab_opencode_go")}
        </TabsTrigger>
        <TabsTrigger value="vertex">
          <img src={iconVertex} alt="" className="size-4" />
          {t("providers.tab_vertex")}
        </TabsTrigger>
        <TabsTrigger value="bedrock">
          <Cloud size={16} />
          {t("providers.tab_bedrock")}
        </TabsTrigger>
        <TabsTrigger value="openai">
          <img src={iconOpenai} alt="" className="size-4 dark:hidden" />
          <img src={iconOpenai} alt="" className="hidden size-4 dark:block" />
          {t("providers.openai_compatible")}
        </TabsTrigger>
        <TabsTrigger value="ampcode">
          <img src={iconAmp} alt="" className="size-4" />
          {t("providers.tab_ampcode")}
        </TabsTrigger>
      </TabsList>
    </div>
  );
}

export function ProvidersTabPanels({
  geminiKeys,
  claudeKeys,
  codexKeys,
  openCodeGoKeys,
  vertexKeys,
  bedrockKeys,
  openaiProviders,
  ampcode,
  ampMappings,
  ampUpstreamUrl,
  setAmpUpstreamUrl,
  ampUpstreamApiKey,
  setAmpUpstreamApiKey,
  ampForceMappings,
  setAmpForceMappings,
  setAmpMappings,
  loading,
  isPending,
  isActiveTabListLoading,
  openKeyEditor,
  setConfirm,
  toggleKeyEnabled,
  openOpenAIEditor,
  toggleOpenAIKeyEntryEnabled,
  saveAmpcode,
  getSimpleStats,
  getSimpleStatusBar,
  getProviderAccessSummary,
  getOpenAIKeyEntryStats,
  getOpenAIProviderStats,
  getOpenAIProviderStatusBar,
  getLatencyEntry,
  checkLatency,
  maskApiKey,
  selectedExportKeySet,
  toggleExportSelection,
}: ProvidersTabPanelsProps) {
  const { t } = useTranslation();

  const sharedSimpleProps = {
    getStats: getSimpleStats,
    getStatusBar: getSimpleStatusBar,
    getAccessSummary: getProviderAccessSummary,
    getLatencyEntry,
    checkLatency,
    selectedKeys: selectedExportKeySet,
    onToggleSelected: toggleExportSelection,
  };

  return (
    <>
      <ProviderSimpleKeyTabPanel
        tabValue="gemini"
        icon={Globe}
        title={t("providers.gemini_keys")}
        description={t("providers.openai_desc")}
        items={geminiKeys}
        loading={isActiveTabListLoading("gemini")}
        onAdd={() => openKeyEditor("gemini", null)}
        onEdit={(idx) => openKeyEditor("gemini", idx)}
        onDelete={(idx) => setConfirm({ type: "deleteKey", keyType: "gemini", index: idx })}
        onToggleEnabled={(idx, enabled) => void toggleKeyEnabled("gemini", idx, enabled)}
        {...sharedSimpleProps}
      />

      <ProviderSimpleKeyTabPanel
        tabValue="claude"
        icon={Bot}
        title={t("providers.claude_keys")}
        description={t("providers.codex_desc")}
        items={claudeKeys}
        loading={isActiveTabListLoading("claude")}
        onAdd={() => openKeyEditor("claude", null)}
        onEdit={(idx) => openKeyEditor("claude", idx)}
        onDelete={(idx) => setConfirm({ type: "deleteKey", keyType: "claude", index: idx })}
        onToggleEnabled={(idx, enabled) => void toggleKeyEnabled("claude", idx, enabled)}
        {...sharedSimpleProps}
      />

      <ProviderSimpleKeyTabPanel
        tabValue="codex"
        icon={FileKey}
        title={t("providers.codex_keys")}
        description={t("providers.gemini_desc")}
        items={codexKeys}
        loading={isActiveTabListLoading("codex")}
        onAdd={() => openKeyEditor("codex", null)}
        onEdit={(idx) => openKeyEditor("codex", idx)}
        onDelete={(idx) => setConfirm({ type: "deleteKey", keyType: "codex", index: idx })}
        onToggleEnabled={(idx, enabled) => void toggleKeyEnabled("codex", idx, enabled)}
        {...sharedSimpleProps}
      />

      <ProviderSimpleKeyTabPanel
        tabValue="opencode-go"
        icon={FileKey}
        iconSrc={iconOpenCodeLight}
        iconDarkSrc={iconOpenCodeDark}
        title={t("providers.opencode_go_keys")}
        description={t("providers.opencode_go_desc")}
        items={openCodeGoKeys}
        loading={isActiveTabListLoading("opencode-go")}
        onAdd={() => openKeyEditor("opencode-go", null)}
        onEdit={(idx) => openKeyEditor("opencode-go", idx)}
        onDelete={(idx) =>
          setConfirm({ type: "deleteKey", keyType: "opencode-go", index: idx })
        }
        onToggleEnabled={(idx, enabled) => void toggleKeyEnabled("opencode-go", idx, enabled)}
        showBaseUrl={false}
        getStats={getSimpleStats}
        getStatusBar={getSimpleStatusBar}
        getAccessSummary={getProviderAccessSummary}
        selectedKeys={selectedExportKeySet}
        onToggleSelected={toggleExportSelection}
      />

      <ProviderSimpleKeyTabPanel
        tabValue="vertex"
        icon={Database}
        title={t("providers.vertex_keys")}
        description={t("providers.vertex_desc")}
        items={vertexKeys}
        loading={isActiveTabListLoading("vertex")}
        onAdd={() => openKeyEditor("vertex", null)}
        onEdit={(idx) => openKeyEditor("vertex", idx)}
        onDelete={(idx) => setConfirm({ type: "deleteKey", keyType: "vertex", index: idx })}
        {...sharedSimpleProps}
      />

      <ProviderSimpleKeyTabPanel
        tabValue="bedrock"
        icon={Cloud}
        title={t("providers.bedrock_keys")}
        description={t("providers.bedrock_desc")}
        items={bedrockKeys}
        loading={isActiveTabListLoading("bedrock")}
        onAdd={() => openKeyEditor("bedrock", null)}
        onEdit={(idx) => openKeyEditor("bedrock", idx)}
        onDelete={(idx) => setConfirm({ type: "deleteKey", keyType: "bedrock", index: idx })}
        onToggleEnabled={(idx, enabled) => void toggleKeyEnabled("bedrock", idx, enabled)}
        {...sharedSimpleProps}
      />

      <TabsContent value="openai" className="flex min-h-0 flex-1 flex-col">
        <OpenAIProvidersTab
          providers={openaiProviders}
          loading={isActiveTabListLoading("openai")}
          openOpenAIEditor={openOpenAIEditor}
          confirmDelete={(index) => setConfirm({ type: "deleteOpenAI", index })}
          maskApiKey={maskApiKey}
          getKeyEntryStats={getOpenAIKeyEntryStats}
          getProviderStats={getOpenAIProviderStats}
          getProviderStatusBar={getOpenAIProviderStatusBar}
          onToggleKeyEntryEnabled={(providerIndex, entryIndex, enabled) =>
            void toggleOpenAIKeyEntryEnabled(providerIndex, entryIndex, enabled)
          }
          selectedKeys={selectedExportKeySet}
          onToggleSelected={toggleExportSelection}
        />
      </TabsContent>

      <TabsContent value="ampcode" className="flex min-h-0 flex-1 flex-col">
        <AmpcodePanel
          loading={loading}
          isPending={isPending}
          saveAmpcode={saveAmpcode}
          ampcode={ampcode}
          ampMappings={ampMappings}
          ampUpstreamUrl={ampUpstreamUrl}
          setAmpUpstreamUrl={setAmpUpstreamUrl}
          ampUpstreamApiKey={ampUpstreamApiKey}
          setAmpUpstreamApiKey={setAmpUpstreamApiKey}
          ampForceMappings={ampForceMappings}
          setAmpForceMappings={setAmpForceMappings}
          setAmpMappings={setAmpMappings}
        />
      </TabsContent>
    </>
  );
}
