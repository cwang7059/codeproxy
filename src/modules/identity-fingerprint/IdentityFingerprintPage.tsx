import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { stringify as stringifyYaml } from "yaml";
import { configFileApi } from "@/lib/http/apis/config-file";
import {
  identityFingerprintApi,
  type ClaudeIdentityFingerprint,
  type CodexIdentityFingerprint,
  type IdentityFingerprintConfig,
} from "@/lib/http/apis/identity-fingerprint";
import {
  IdentityFingerprintClaudeTab,
  IdentityFingerprintCodexTab,
  IdentityFingerprintGeminiTab,
  IdentityFingerprintKimiTab,
} from "@/modules/identity-fingerprint/components/IdentityFingerprintTabPanels";
import {
  DEFAULT_GEMINI_HEADERS,
  DEFAULT_KIMI_HEADERS,
  EMPTY_CLAUDE,
  EMPTY_CODEX,
  PROVIDERS,
  type HeaderPreviewLine,
  type KimiHeaderDefaults,
  type ProviderTab,
} from "@/modules/identity-fingerprint/identity-fingerprint-constants";
import {
  firstGeminiHeaders,
  mergeClaude,
  mergeCodex,
  normalizeKimiHeaders,
  parseConfigYaml,
  parseCustomHeaders,
  parseHeadersJson,
  sessionPreviewValue,
  tryParseCustomHeaders,
  tryParseHeadersJson,
  upsertGeminiHeaders,
} from "@/modules/identity-fingerprint/identity-fingerprint-utils";
import { Card } from "@/modules/ui/Card";
import { PageToolbar } from "@/modules/ui/PageToolbar";
import { Tabs, TabsList, TabsTrigger } from "@/modules/ui/Tabs";
import { useToast } from "@/modules/ui/ToastProvider";

export function IdentityFingerprintPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [tab, setTab] = useState<ProviderTab>("codex");
  const [codex, setCodex] = useState<Required<CodexIdentityFingerprint>>(EMPTY_CODEX);
  const [defaults, setDefaults] = useState<Required<CodexIdentityFingerprint>>(EMPTY_CODEX);
  const [claude, setClaude] = useState<Required<ClaudeIdentityFingerprint>>(EMPTY_CLAUDE);
  const [claudeDefaults, setClaudeDefaults] =
    useState<Required<ClaudeIdentityFingerprint>>(EMPTY_CLAUDE);
  const [configYaml, setConfigYaml] = useState("");
  const [kimi, setKimi] = useState<KimiHeaderDefaults>(DEFAULT_KIMI_HEADERS);
  const [geminiHeadersText, setGeminiHeadersText] = useState(
    JSON.stringify(DEFAULT_GEMINI_HEADERS, null, 2),
  );
  const [geminiKeyCount, setGeminiKeyCount] = useState(0);
  const [customHeadersText, setCustomHeadersText] = useState("{}");
  const [claudeCustomHeadersText, setClaudeCustomHeadersText] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [codexAdvancedOpen, setCodexAdvancedOpen] = useState(false);
  const [claudeAdvancedOpen, setClaudeAdvancedOpen] = useState(false);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [payload, yamlText] = await Promise.all([
        identityFingerprintApi.get(),
        configFileApi.fetchConfigYaml(),
      ]);
      const nextCodex = mergeCodex(payload["identity-fingerprint"]?.codex);
      const nextDefaults = mergeCodex(payload.defaults?.codex);
      const nextClaude = mergeClaude(payload["identity-fingerprint"]?.claude);
      const nextClaudeDefaults = mergeClaude(payload.defaults?.claude);
      const parsedConfig = parseConfigYaml(yamlText);
      const gemini = firstGeminiHeaders(parsedConfig["gemini-api-key"]);
      setCodex(nextCodex);
      setDefaults(nextDefaults);
      setClaude(nextClaude);
      setClaudeDefaults(nextClaudeDefaults);
      setConfigYaml(yamlText);
      setKimi(normalizeKimiHeaders(parsedConfig["kimi-header-defaults"]));
      setGeminiHeadersText(JSON.stringify(gemini.headers, null, 2));
      setGeminiKeyCount(gemini.count);
      setCustomHeadersText(JSON.stringify(nextCodex["custom-headers"], null, 2));
      setClaudeCustomHeadersText(JSON.stringify(nextClaude["custom-headers"], null, 2));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("identity_fingerprint.load_failed");
      setError(message);
      notify({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }, [notify, t]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const updateCodex = useCallback((patch: Partial<CodexIdentityFingerprint>) => {
    setCodex((current) => ({ ...current, ...patch }));
  }, []);

  const updateClaude = useCallback((patch: Partial<ClaudeIdentityFingerprint>) => {
    setClaude((current) => ({ ...current, ...patch }));
  }, []);

  const restoreDefaults = useCallback(() => {
    setCodex(defaults);
    setCustomHeadersText(JSON.stringify(defaults["custom-headers"], null, 2));
  }, [defaults]);

  const restoreClaudeDefaults = useCallback(() => {
    setClaude(claudeDefaults);
    setClaudeCustomHeadersText(JSON.stringify(claudeDefaults["custom-headers"], null, 2));
  }, [claudeDefaults]);

  const restoreGeminiDefaults = useCallback(() => {
    setGeminiHeadersText(JSON.stringify(DEFAULT_GEMINI_HEADERS, null, 2));
  }, []);

  const restoreKimiDefaults = useCallback(() => {
    setKimi(DEFAULT_KIMI_HEADERS);
  }, []);

  const saveConfigYaml = useCallback(
    async (mutate: (root: Record<string, unknown>) => Record<string, unknown>) => {
      const root = parseConfigYaml(configYaml);
      const nextRoot = mutate(root);
      const nextYaml = stringifyYaml(nextRoot);
      await configFileApi.saveConfigYaml(nextYaml);
      setConfigYaml(nextYaml);
    },
    [configYaml],
  );

  const save = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const customHeaders = parseCustomHeaders(customHeadersText);
      const payload: IdentityFingerprintConfig = {
        codex: {
          ...codex,
          "custom-headers": customHeaders,
        },
        claude,
      };
      await identityFingerprintApi.update(payload);
      notify({ type: "success", message: t("identity_fingerprint.saved") });
      await loadPage();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("identity_fingerprint.save_failed");
      setError(message);
      notify({ type: "error", message });
    } finally {
      setSaving(false);
    }
  }, [claude, codex, customHeadersText, loadPage, notify, t]);

  const saveClaude = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const customHeaders = parseCustomHeaders(claudeCustomHeadersText);
      const payload: IdentityFingerprintConfig = {
        codex,
        claude: {
          ...claude,
          "custom-headers": customHeaders,
        },
      };
      await identityFingerprintApi.update(payload);
      notify({ type: "success", message: t("identity_fingerprint.saved") });
      await loadPage();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("identity_fingerprint.save_failed");
      setError(message);
      notify({ type: "error", message });
    } finally {
      setSaving(false);
    }
  }, [claude, claudeCustomHeadersText, codex, loadPage, notify, t]);

  const saveGemini = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const headers = parseHeadersJson(geminiHeadersText);
      await saveConfigYaml((root) => upsertGeminiHeaders(root, headers).root);
      notify({ type: "success", message: t("identity_fingerprint.saved") });
      await loadPage();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("identity_fingerprint.save_failed");
      setError(message);
      notify({ type: "error", message });
    } finally {
      setSaving(false);
    }
  }, [geminiHeadersText, loadPage, notify, saveConfigYaml, t]);

  const saveKimi = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      await saveConfigYaml((root) => {
        root["kimi-header-defaults"] = { ...kimi };
        return root;
      });
      notify({ type: "success", message: t("identity_fingerprint.saved") });
      await loadPage();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("identity_fingerprint.save_failed");
      setError(message);
      notify({ type: "error", message });
    } finally {
      setSaving(false);
    }
  }, [kimi, loadPage, notify, saveConfigYaml, t]);

  const codexPreviewHeaders = useMemo((): HeaderPreviewLine[] => {
    const lines: HeaderPreviewLine[] = [];
    if (codex["user-agent"]) lines.push({ name: "User-Agent", value: codex["user-agent"] });
    if (codex.version) lines.push({ name: "Version", value: codex.version });
    if (codex.originator) lines.push({ name: "Originator", value: codex.originator });
    if (codex["websocket-beta"]) {
      lines.push({ name: "OpenAI-Beta", value: codex["websocket-beta"] });
    }
    lines.push({
      name: "Session-Id",
      value: sessionPreviewValue(codex["session-mode"], codex["session-id"], t),
    });
    for (const [name, value] of Object.entries(tryParseCustomHeaders(customHeadersText))) {
      lines.push({ name, value });
    }
    return lines;
  }, [codex, customHeadersText, t]);

  const claudePreviewHeaders = useMemo((): HeaderPreviewLine[] => {
    const lines: HeaderPreviewLine[] = [];
    if (claude["user-agent"]) lines.push({ name: "User-Agent", value: claude["user-agent"] });
    if (claude["cli-version"]) {
      lines.push({ name: "X-App-Version", value: claude["cli-version"] });
    }
    if (claude["anthropic-beta"]) {
      lines.push({ name: "Anthropic-Beta", value: claude["anthropic-beta"] });
    }
    if (claude["stainless-package-version"]) {
      lines.push({
        name: "X-Stainless-Package-Version",
        value: claude["stainless-package-version"],
      });
    }
    if (claude["stainless-runtime-version"]) {
      lines.push({
        name: "X-Stainless-Runtime-Version",
        value: claude["stainless-runtime-version"],
      });
    }
    if (claude["stainless-timeout"]) {
      lines.push({ name: "X-Stainless-Timeout", value: claude["stainless-timeout"] });
    }
    lines.push({
      name: "Session-Id",
      value: sessionPreviewValue(claude["session-mode"], claude["session-id"], t),
    });
    for (const [name, value] of Object.entries(tryParseCustomHeaders(claudeCustomHeadersText))) {
      lines.push({ name, value });
    }
    return lines;
  }, [claude, claudeCustomHeadersText, t]);

  const geminiPreviewHeaders = useMemo((): HeaderPreviewLine[] => {
    return Object.entries(tryParseHeadersJson(geminiHeadersText)).map(([name, value]) => ({
      name,
      value,
    }));
  }, [geminiHeadersText]);

  const kimiPreviewHeaders = useMemo((): HeaderPreviewLine[] => {
    const lines: HeaderPreviewLine[] = [];
    if (kimi["user-agent"]) lines.push({ name: "User-Agent", value: kimi["user-agent"] });
    if (kimi.platform) lines.push({ name: "X-Kimi-Platform", value: kimi.platform });
    if (kimi.version) lines.push({ name: "X-Kimi-Version", value: kimi.version });
    return lines;
  }, [kimi]);

  const providerEnabled: Record<ProviderTab, boolean | null> = {
    codex: codex.enabled,
    claude: claude.enabled,
    gemini: null,
    kimi: null,
  };

  return (
    <section className="page-stack overflow-x-hidden">
      <Card padding="none" loading={loading}>
        <div className="px-5 pt-5 pb-4">
          <PageToolbar
            title={t("identity_fingerprint.title")}
            description={t("identity_fingerprint.description")}
          />
        </div>
        <div className="px-5 pb-5">
        <Tabs value={tab} onValueChange={(next) => setTab(next as ProviderTab)}>
          <TabsList>
            {PROVIDERS.map((provider) => (
              <TabsTrigger key={provider.id} value={provider.id}>
                <span className="inline-flex items-center gap-1.5">
                  {providerEnabled[provider.id] !== null ? (
                    <span
                      className={[
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        providerEnabled[provider.id]
                          ? "bg-emerald-500"
                          : "bg-slate-300 dark:bg-neutral-600",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                  ) : null}
                  {t(provider.labelKey)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <IdentityFingerprintCodexTab
            codex={codex}
            saving={saving}
            loading={loading}
            codexAdvancedOpen={codexAdvancedOpen}
            setCodexAdvancedOpen={setCodexAdvancedOpen}
            customHeadersText={customHeadersText}
            setCustomHeadersText={setCustomHeadersText}
            codexPreviewHeaders={codexPreviewHeaders}
            updateCodex={updateCodex}
            restoreDefaults={restoreDefaults}
            onSave={() => void save()}
          />
          <IdentityFingerprintClaudeTab
            claude={claude}
            saving={saving}
            loading={loading}
            claudeAdvancedOpen={claudeAdvancedOpen}
            setClaudeAdvancedOpen={setClaudeAdvancedOpen}
            claudeCustomHeadersText={claudeCustomHeadersText}
            setClaudeCustomHeadersText={setClaudeCustomHeadersText}
            claudePreviewHeaders={claudePreviewHeaders}
            updateClaude={updateClaude}
            restoreClaudeDefaults={restoreClaudeDefaults}
            onSave={() => void saveClaude()}
          />
          <IdentityFingerprintGeminiTab
            saving={saving}
            loading={loading}
            geminiHeadersText={geminiHeadersText}
            setGeminiHeadersText={setGeminiHeadersText}
            geminiKeyCount={geminiKeyCount}
            geminiPreviewHeaders={geminiPreviewHeaders}
            restoreGeminiDefaults={restoreGeminiDefaults}
            onSave={() => void saveGemini()}
          />
          <IdentityFingerprintKimiTab
            kimi={kimi}
            setKimi={setKimi}
            saving={saving}
            loading={loading}
            kimiPreviewHeaders={kimiPreviewHeaders}
            restoreKimiDefaults={restoreKimiDefaults}
            onSave={() => void saveKimi()}
          />
        </Tabs>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}
        </div>
      </Card>
    </section>
  );
}
