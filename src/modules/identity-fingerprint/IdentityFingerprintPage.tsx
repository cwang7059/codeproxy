import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { configFileApi } from "@/lib/http/apis/config-file";
import {
  identityFingerprintApi,
  type ClaudeIdentityFingerprint,
  type CodexIdentityFingerprint,
  type IdentityFingerprintConfig,
} from "@/lib/http/apis/identity-fingerprint";
import { Button } from "@/modules/ui/Button";
import { Card } from "@/modules/ui/Card";
import { TextInput } from "@/modules/ui/Input";
import { Select } from "@/modules/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/ui/Tabs";
import { ToggleSwitch } from "@/modules/ui/ToggleSwitch";
import { useToast } from "@/modules/ui/ToastProvider";

type ProviderTab = "codex" | "claude" | "gemini" | "kimi";

const PROVIDERS: Array<{ id: ProviderTab; label: string }> = [
  { id: "codex", label: "Codex" },
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
  { id: "kimi", label: "Kimi" },
];

const SESSION_MODE_OPTIONS = [
  { value: "per-request", labelKey: "identity_fingerprint.session_per_request" },
  { value: "server-stable", labelKey: "identity_fingerprint.session_server_stable" },
  { value: "fixed", labelKey: "identity_fingerprint.session_fixed" },
] as const;

const EMPTY_CODEX: Required<CodexIdentityFingerprint> = {
  enabled: false,
  "user-agent": "",
  version: "",
  originator: "",
  "websocket-beta": "",
  "session-mode": "per-request",
  "session-id": "",
  "custom-headers": {},
};

const EMPTY_CLAUDE: Required<ClaudeIdentityFingerprint> = {
  enabled: false,
  "cli-version": "2.1.88",
  entrypoint: "cli",
  "user-agent": "claude-cli/2.1.88 (external, cli)",
  "anthropic-beta":
    "claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,redact-thinking-2026-02-12,context-management-2025-06-27,prompt-caching-scope-2026-01-05,advanced-tool-use-2025-11-20,effort-2025-11-24",
  "stainless-package-version": "0.74.0",
  "stainless-runtime-version": "v22.13.0",
  "stainless-timeout": "600",
  "session-mode": "per-request",
  "session-id": "",
  "device-id": "",
  "custom-headers": {},
};

type KimiHeaderDefaults = {
  "user-agent": string;
  platform: string;
  version: string;
};

const DEFAULT_KIMI_HEADERS: KimiHeaderDefaults = {
  "user-agent": "KimiCLI/1.10.6",
  platform: "kimi_cli",
  version: "1.10.6",
};

const DEFAULT_GEMINI_HEADERS: Record<string, string> = {
  "User-Agent": "google-api-nodejs-client/9.15.1",
  "X-Goog-Api-Client": "gl-node/22.17.0",
};

function mergeCodex(
  base: CodexIdentityFingerprint | undefined,
): Required<CodexIdentityFingerprint> {
  return {
    ...EMPTY_CODEX,
    ...base,
    "custom-headers": base?.["custom-headers"] ?? {},
  };
}

function mergeClaude(
  base: ClaudeIdentityFingerprint | undefined,
): Required<ClaudeIdentityFingerprint> {
  return {
    ...EMPTY_CLAUDE,
    ...base,
    "custom-headers": base?.["custom-headers"] ?? {},
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function readString(obj: Record<string, unknown> | null, key: string, fallback = ""): string {
  const value = obj?.[key];
  return typeof value === "string" ? value : fallback;
}

function toHeaderMap(raw: unknown): Record<string, string> {
  const record = asRecord(raw);
  if (!record) return {};
  return Object.fromEntries(
    Object.entries(record)
      .map(([key, value]) => [key.trim(), String(value ?? "").trim()])
      .filter(([key, value]) => key !== "" && value !== ""),
  );
}

function parseCustomHeaders(raw: string): Record<string, string> {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("custom headers must be a JSON object");
  }
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
  );
}

function parseHeadersJson(raw: string): Record<string, string> {
  return parseCustomHeaders(raw);
}

function parseConfigYaml(raw: string): Record<string, unknown> {
  const parsed = parseYaml(raw) as unknown;
  return asRecord(parsed) ?? {};
}

function normalizeKimiHeaders(raw: unknown): KimiHeaderDefaults {
  const record = asRecord(raw);
  return {
    "user-agent": readString(record, "user-agent", DEFAULT_KIMI_HEADERS["user-agent"]),
    platform: readString(record, "platform", DEFAULT_KIMI_HEADERS.platform),
    version: readString(record, "version", DEFAULT_KIMI_HEADERS.version),
  };
}

function firstGeminiHeaders(raw: unknown): { headers: Record<string, string>; count: number } {
  const entries = Array.isArray(raw) ? raw : [];
  for (const entry of entries) {
    const record = asRecord(entry);
    const headers = toHeaderMap(record?.headers);
    if (Object.keys(headers).length > 0) {
      return { headers, count: entries.length };
    }
  }
  return { headers: DEFAULT_GEMINI_HEADERS, count: entries.length };
}

function setHeadersObject(obj: Record<string, unknown>, value: Record<string, string>): void {
  const next = Object.fromEntries(
    Object.entries(value)
      .map(([key, val]) => [key.trim(), String(val ?? "").trim()])
      .filter(([key, val]) => key !== "" && val !== ""),
  );
  if (Object.keys(next).length > 0) {
    obj.headers = next;
    return;
  }
  if (hasOwn(obj, "headers")) delete obj.headers;
}

function upsertGeminiHeaders(
  root: Record<string, unknown>,
  headers: Record<string, string>,
): { root: Record<string, unknown>; count: number } {
  const rawEntries = Array.isArray(root["gemini-api-key"]) ? root["gemini-api-key"] : [];
  if (rawEntries.length === 0) {
    throw new Error("No Gemini API key entries found in config.yaml");
  }

  root["gemini-api-key"] = rawEntries.map((entry) => {
    const record = asRecord(entry);
    const next = record ? { ...record } : { "api-key": String(entry ?? "") };
    setHeadersObject(next, headers);
    return next;
  });

  return { root, count: rawEntries.length };
}

type HeaderPreviewLine = { name: string; value: string };

function sessionPreviewValue(
  mode: string,
  sessionId: string,
  t: TFunction,
): string {
  if (mode === "per-request") return t("identity_fingerprint.session_per_request");
  if (mode === "fixed") {
    return sessionId || t("identity_fingerprint.preview_server_generated");
  }
  return t("identity_fingerprint.session_server_stable");
}

function tryParseCustomHeaders(raw: string): Record<string, string> {
  try {
    return parseCustomHeaders(raw);
  } catch {
    return {};
  }
}

function tryParseHeadersJson(raw: string): Record<string, string> {
  try {
    return parseHeadersJson(raw);
  } catch {
    return {};
  }
}

const PREVIEW_GRID_CLASS = "grid gap-3 xl:grid-cols-[minmax(0,1fr)_min(100%,400px)]";

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
    <div className="space-y-4 overflow-x-hidden">
      <Card
        title={t("identity_fingerprint.title")}
        description={t("identity_fingerprint.description")}
        loading={loading}
      >
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
                  {provider.label}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="codex" className="mt-4">
            <div className="space-y-3">
              <ProviderToolbar
                toggle={
                  <ToggleSwitch
                    checked={Boolean(codex.enabled)}
                    onCheckedChange={(enabled) => updateCodex({ enabled })}
                    label={t("identity_fingerprint.codex_enabled")}
                    description={t("identity_fingerprint.codex_enabled_desc")}
                    disabled={saving}
                  />
                }
                actions={
                  <>
                    <Button
                      variant="secondary"
                      onClick={restoreDefaults}
                      disabled={loading || saving}
                    >
                      {t("identity_fingerprint.restore_defaults")}
                    </Button>
                    <Button onClick={() => void save()} disabled={loading || saving}>
                      {saving ? t("identity_fingerprint.saving") : t("identity_fingerprint.save")}
                    </Button>
                  </>
                }
              />

              <div className={PREVIEW_GRID_CLASS}>
                <div className="space-y-3">
                  <SimplePanel
                    title={t("identity_fingerprint.basic_title")}
                    description={t("identity_fingerprint.basic_desc")}
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field
                        label={t("identity_fingerprint.user_agent")}
                        hint={t("identity_fingerprint.user_agent_hint")}
                      >
                        <TextInput
                          value={codex["user-agent"]}
                          onChange={(event) => updateCodex({ "user-agent": event.target.value })}
                          disabled={saving}
                        />
                      </Field>
                      <Field
                        label={t("identity_fingerprint.version")}
                        hint={t("identity_fingerprint.version_hint")}
                      >
                        <TextInput
                          value={codex.version}
                          onChange={(event) => updateCodex({ version: event.target.value })}
                          disabled={saving}
                        />
                      </Field>
                    </div>

                    <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-neutral-800">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                          {t("identity_fingerprint.session_title")}
                        </h4>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-white/50">
                          {t("identity_fingerprint.session_desc")}
                        </p>
                      </div>
                      <div
                        className={[
                          "grid gap-3",
                          codex["session-mode"] === "fixed" ? "md:grid-cols-2" : "md:grid-cols-1",
                        ].join(" ")}
                      >
                        <Field label={t("identity_fingerprint.session_mode")}>
                          <Select
                            value={codex["session-mode"]}
                            onChange={(value) =>
                              updateCodex({
                                "session-mode": value as CodexIdentityFingerprint["session-mode"],
                              })
                            }
                            options={SESSION_MODE_OPTIONS.map((option) => ({
                              value: option.value,
                              label: t(option.labelKey),
                            }))}
                            aria-label={t("identity_fingerprint.session_mode")}
                            className={[
                              "w-full justify-between",
                              saving ? "pointer-events-none opacity-60" : null,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        </Field>
                        {codex["session-mode"] === "fixed" ? (
                          <Field
                            label={t("identity_fingerprint.session_id")}
                            hint={t("identity_fingerprint.session_id_hint")}
                          >
                            <TextInput
                              value={codex["session-id"]}
                              onChange={(event) => updateCodex({ "session-id": event.target.value })}
                              disabled={saving}
                              placeholder={t("identity_fingerprint.session_id_placeholder")}
                            />
                          </Field>
                        ) : null}
                      </div>
                    </div>
                  </SimplePanel>

                  <CollapsiblePanel
                    title={t("identity_fingerprint.advanced_title")}
                    description={t("identity_fingerprint.advanced_desc")}
                    open={codexAdvancedOpen}
                    onOpenChange={setCodexAdvancedOpen}
                    toggleLabel={
                      codexAdvancedOpen
                        ? t("identity_fingerprint.hide_advanced")
                        : t("identity_fingerprint.show_advanced")
                    }
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label={t("identity_fingerprint.originator")}>
                        <TextInput
                          value={codex.originator}
                          onChange={(event) => updateCodex({ originator: event.target.value })}
                          disabled={saving}
                        />
                      </Field>
                      <Field label={t("identity_fingerprint.websocket_beta")}>
                        <TextInput
                          value={codex["websocket-beta"]}
                          onChange={(event) =>
                            updateCodex({ "websocket-beta": event.target.value })
                          }
                          disabled={saving}
                        />
                      </Field>
                    </div>
                    <Field label={t("identity_fingerprint.custom_headers")}>
                      <textarea
                        value={customHeadersText}
                        onChange={(event) => setCustomHeadersText(event.target.value)}
                        disabled={saving}
                        spellCheck={false}
                        className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-slate-100"
                      />
                      <p className="mt-2 text-xs text-slate-500 dark:text-white/50">
                        {t("identity_fingerprint.custom_headers_hint")}
                      </p>
                    </Field>
                  </CollapsiblePanel>
                </div>

                <PreviewPanel
                  title={t("identity_fingerprint.preview_title")}
                  description={t("identity_fingerprint.preview_desc")}
                >
                  {!codex.enabled ? (
                    <PreviewDisabledNotice>{t("identity_fingerprint.preview_disabled_notice")}</PreviewDisabledNotice>
                  ) : null}
                  <HeaderPreviewBlock lines={codexPreviewHeaders} />
                  <ProviderNotice>{t("identity_fingerprint.notice_desc")}</ProviderNotice>
                </PreviewPanel>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="claude" className="mt-4">
            <div className="space-y-3">
              <ProviderToolbar
                toggle={
                  <ToggleSwitch
                    checked={Boolean(claude.enabled)}
                    onCheckedChange={(enabled) => updateClaude({ enabled })}
                    label={t("identity_fingerprint.claude_enabled")}
                    description={t("identity_fingerprint.claude_enabled_desc")}
                    disabled={saving}
                  />
                }
                actions={
                  <>
                    <Button
                      variant="secondary"
                      onClick={restoreClaudeDefaults}
                      disabled={loading || saving}
                    >
                      {t("identity_fingerprint.restore_defaults")}
                    </Button>
                    <Button onClick={() => void saveClaude()} disabled={loading || saving}>
                      {saving
                        ? t("identity_fingerprint.saving")
                        : t("identity_fingerprint.save_claude")}
                    </Button>
                  </>
                }
              />

              <div className={PREVIEW_GRID_CLASS}>
                <div className="space-y-3">
                  <SimplePanel
                    title={t("identity_fingerprint.claude_title")}
                    description={t("identity_fingerprint.claude_desc")}
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field
                        label={t("identity_fingerprint.claude_cli_version")}
                        hint={t("identity_fingerprint.claude_cli_version_hint")}
                      >
                        <TextInput
                          value={claude["cli-version"]}
                          onChange={(event) => updateClaude({ "cli-version": event.target.value })}
                          disabled={saving}
                        />
                      </Field>
                      <Field label={t("identity_fingerprint.claude_entrypoint")}>
                        <TextInput
                          value={claude.entrypoint}
                          onChange={(event) => updateClaude({ entrypoint: event.target.value })}
                          disabled={saving}
                        />
                      </Field>
                      <Field
                        label={t("identity_fingerprint.user_agent")}
                        hint={t("identity_fingerprint.claude_user_agent_hint")}
                      >
                        <TextInput
                          value={claude["user-agent"]}
                          onChange={(event) => updateClaude({ "user-agent": event.target.value })}
                          disabled={saving}
                        />
                      </Field>
                      <Field label={t("identity_fingerprint.claude_anthropic_beta")}>
                        <TextInput
                          value={claude["anthropic-beta"]}
                          onChange={(event) =>
                            updateClaude({ "anthropic-beta": event.target.value })
                          }
                          disabled={saving}
                        />
                      </Field>
                    </div>

                    <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-neutral-800">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                          {t("identity_fingerprint.session_title")}
                        </h4>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-white/50">
                          {t("identity_fingerprint.claude_session_desc")}
                        </p>
                      </div>
                      <div
                        className={[
                          "grid gap-3",
                          claude["session-mode"] === "fixed" ? "md:grid-cols-2" : "md:grid-cols-1",
                        ].join(" ")}
                      >
                        <Field label={t("identity_fingerprint.session_mode")}>
                          <Select
                            value={claude["session-mode"]}
                            onChange={(value) =>
                              updateClaude({
                                "session-mode": value as ClaudeIdentityFingerprint["session-mode"],
                              })
                            }
                            options={SESSION_MODE_OPTIONS.map((option) => ({
                              value: option.value,
                              label: t(option.labelKey),
                            }))}
                            aria-label={t("identity_fingerprint.session_mode")}
                            className={[
                              "w-full justify-between",
                              saving ? "pointer-events-none opacity-60" : null,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        </Field>
                        {claude["session-mode"] === "fixed" ? (
                          <Field
                            label={t("identity_fingerprint.session_id")}
                            hint={t("identity_fingerprint.session_id_hint")}
                          >
                            <TextInput
                              value={claude["session-id"]}
                              onChange={(event) => updateClaude({ "session-id": event.target.value })}
                              disabled={saving}
                              placeholder={t("identity_fingerprint.session_id_placeholder")}
                            />
                          </Field>
                        ) : null}
                      </div>
                    </div>
                  </SimplePanel>

                  <CollapsiblePanel
                    title={t("identity_fingerprint.claude_stainless_title")}
                    description={t("identity_fingerprint.claude_stainless_desc")}
                    open={claudeAdvancedOpen}
                    onOpenChange={setClaudeAdvancedOpen}
                    toggleLabel={
                      claudeAdvancedOpen
                        ? t("identity_fingerprint.hide_advanced")
                        : t("identity_fingerprint.show_advanced")
                    }
                  >
                    <div className="grid gap-3 md:grid-cols-3">
                      <Field label={t("identity_fingerprint.claude_stainless_package_version")}>
                        <TextInput
                          value={claude["stainless-package-version"]}
                          onChange={(event) =>
                            updateClaude({ "stainless-package-version": event.target.value })
                          }
                          disabled={saving}
                        />
                      </Field>
                      <Field label={t("identity_fingerprint.claude_stainless_runtime_version")}>
                        <TextInput
                          value={claude["stainless-runtime-version"]}
                          onChange={(event) =>
                            updateClaude({ "stainless-runtime-version": event.target.value })
                          }
                          disabled={saving}
                        />
                      </Field>
                      <Field
                        label={t("identity_fingerprint.claude_stainless_timeout")}
                        hint={t("identity_fingerprint.claude_timeout_hint")}
                      >
                        <TextInput
                          value={claude["stainless-timeout"]}
                          onChange={(event) =>
                            updateClaude({ "stainless-timeout": event.target.value })
                          }
                          disabled={saving}
                        />
                      </Field>
                    </div>
                    <Field
                      label={t("identity_fingerprint.claude_device_id")}
                      hint={t("identity_fingerprint.claude_device_id_hint")}
                    >
                      <TextInput
                        value={claude["device-id"]}
                        onChange={(event) => updateClaude({ "device-id": event.target.value })}
                        disabled={saving}
                      />
                    </Field>
                    <Field label={t("identity_fingerprint.custom_headers")}>
                      <textarea
                        value={claudeCustomHeadersText}
                        onChange={(event) => setClaudeCustomHeadersText(event.target.value)}
                        disabled={saving}
                        spellCheck={false}
                        className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-slate-100"
                      />
                      <p className="mt-2 text-xs text-slate-500 dark:text-white/50">
                        {t("identity_fingerprint.claude_custom_headers_hint")}
                      </p>
                    </Field>
                  </CollapsiblePanel>
                </div>

                <PreviewPanel
                  title={t("identity_fingerprint.preview_title")}
                  description={t("identity_fingerprint.claude_preview_desc")}
                >
                  {!claude.enabled ? (
                    <PreviewDisabledNotice>{t("identity_fingerprint.preview_disabled_notice")}</PreviewDisabledNotice>
                  ) : null}
                  <HeaderPreviewBlock lines={claudePreviewHeaders} />
                  <ProviderNotice>{t("identity_fingerprint.claude_notice")}</ProviderNotice>
                </PreviewPanel>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gemini" className="mt-4">
            <div className="space-y-3">
              <ProviderToolbar
                actions={
                  <>
                    <Button
                      variant="secondary"
                      onClick={restoreGeminiDefaults}
                      disabled={loading || saving || geminiKeyCount === 0}
                    >
                      {t("identity_fingerprint.restore_defaults")}
                    </Button>
                    <Button
                      onClick={() => void saveGemini()}
                      disabled={loading || saving || geminiKeyCount === 0}
                    >
                      {saving
                        ? t("identity_fingerprint.saving")
                        : t("identity_fingerprint.save_gemini")}
                    </Button>
                  </>
                }
              />

              <div className={PREVIEW_GRID_CLASS}>
                <SimplePanel
                  title={t("identity_fingerprint.gemini_title")}
                  description={t("identity_fingerprint.gemini_desc")}
                >
                  <Field label={t("identity_fingerprint.headers_json")}>
                    <textarea
                      value={geminiHeadersText}
                      onChange={(event) => setGeminiHeadersText(event.target.value)}
                      disabled={saving}
                      spellCheck={false}
                      className="min-h-36 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-slate-100"
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-white/50">
                      {t("identity_fingerprint.gemini_headers_hint")}
                    </p>
                  </Field>
                </SimplePanel>

                <PreviewPanel
                  title={t("identity_fingerprint.preview_title")}
                  description={t("identity_fingerprint.gemini_preview_desc")}
                >
                  <PreviewRow
                    label={t("identity_fingerprint.gemini_key_count")}
                    value={t("identity_fingerprint.gemini_key_count_value", {
                      count: geminiKeyCount,
                    })}
                  />
                  {geminiPreviewHeaders.length > 0 ? (
                    <HeaderPreviewBlock lines={geminiPreviewHeaders} />
                  ) : null}
                  <ProviderNotice>
                    {geminiKeyCount > 0
                      ? t("identity_fingerprint.gemini_notice")
                      : t("identity_fingerprint.gemini_empty_notice")}
                  </ProviderNotice>
                </PreviewPanel>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="kimi" className="mt-4">
            <div className="space-y-3">
              <ProviderToolbar
                actions={
                  <>
                    <Button
                      variant="secondary"
                      onClick={restoreKimiDefaults}
                      disabled={loading || saving}
                    >
                      {t("identity_fingerprint.restore_defaults")}
                    </Button>
                    <Button onClick={() => void saveKimi()} disabled={loading || saving}>
                      {saving
                        ? t("identity_fingerprint.saving")
                        : t("identity_fingerprint.save_kimi")}
                    </Button>
                  </>
                }
              />

              <div className={PREVIEW_GRID_CLASS}>
                <SimplePanel
                  title={t("identity_fingerprint.kimi_title")}
                  description={t("identity_fingerprint.kimi_desc")}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field
                      label={t("identity_fingerprint.user_agent")}
                      hint={t("identity_fingerprint.kimi_user_agent_hint")}
                    >
                      <TextInput
                        value={kimi["user-agent"]}
                        onChange={(event) =>
                          setKimi((current) => ({ ...current, "user-agent": event.target.value }))
                        }
                        disabled={saving}
                      />
                    </Field>
                    <Field label={t("identity_fingerprint.kimi_platform")}>
                      <TextInput
                        value={kimi.platform}
                        onChange={(event) =>
                          setKimi((current) => ({ ...current, platform: event.target.value }))
                        }
                        disabled={saving}
                      />
                    </Field>
                    <Field label={t("identity_fingerprint.version")}>
                      <TextInput
                        value={kimi.version}
                        onChange={(event) =>
                          setKimi((current) => ({ ...current, version: event.target.value }))
                        }
                        disabled={saving}
                      />
                    </Field>
                  </div>
                </SimplePanel>

                <PreviewPanel
                  title={t("identity_fingerprint.preview_title")}
                  description={t("identity_fingerprint.kimi_preview_desc")}
                >
                  <HeaderPreviewBlock lines={kimiPreviewHeaders} />
                  <ProviderNotice>{t("identity_fingerprint.kimi_notice")}</ProviderNotice>
                </PreviewPanel>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function ProviderToolbar({
  toggle,
  actions,
}: {
  toggle?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 dark:border-neutral-800 lg:flex-row lg:items-start lg:justify-between">
      {toggle ? <div className="min-w-0 flex-1">{toggle}</div> : <div className="flex-1" />}
      <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
    </div>
  );
}

function ProviderNotice({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:bg-amber-400/10 dark:text-amber-100">
      {children}
    </div>
  );
}

function PreviewDisabledNotice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-white/65">
      {children}
    </div>
  );
}

function PreviewPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="sticky top-4 self-start rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-white/60">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function CollapsiblePanel({
  title,
  description,
  open,
  onOpenChange,
  toggleLabel,
  children,
}: {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toggleLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950/60">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-white/60">{description}</p>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 dark:text-white/55">
          {toggleLabel}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {open ? <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3 dark:border-neutral-800">{children}</div> : null}
    </section>
  );
}

function SimplePanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/60">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-white/60">{description}</p>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-slate-700 dark:text-white/75">{label}</span>
      {children}
      {hint ? (
        <span className="block text-xs text-slate-500 dark:text-white/45">{hint}</span>
      ) : null}
    </label>
  );
}

function HeaderPreviewBlock({ lines }: { lines: HeaderPreviewLine[] }) {
  if (lines.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 dark:border-neutral-700 dark:text-white/35">
        —
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950/80">
      <pre className="max-h-80 overflow-auto p-3 font-mono text-[11px] leading-5 text-slate-800 dark:text-slate-200">
        {lines.map((line) => (
          <div key={line.name} className="break-all">
            <span className="text-slate-500 dark:text-white/45">{line.name}: </span>
            <span>{line.value}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 rounded-xl bg-white px-3 py-2 dark:bg-neutral-950/80">
      <div className="text-xs text-slate-500 dark:text-white/45">{label}</div>
      <div className="mt-1 break-all text-sm font-medium text-slate-900 dark:text-white">
        {value || "-"}
      </div>
    </div>
  );
}
