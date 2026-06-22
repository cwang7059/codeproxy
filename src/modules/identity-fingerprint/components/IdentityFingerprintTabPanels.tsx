import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import type {
  ClaudeIdentityFingerprint,
  CodexIdentityFingerprint,
} from "@/lib/http/apis/identity-fingerprint";
import {
  CollapsiblePanel,
  Field,
  HeaderPreviewBlock,
  PreviewDisabledNotice,
  PreviewPanel,
  PreviewRow,
  ProviderNotice,
  ProviderToolbar,
  SimplePanel,
} from "@/modules/identity-fingerprint/components/IdentityFingerprintPagePieces";
import {
  PREVIEW_GRID_CLASS,
  SESSION_MODE_OPTIONS,
  type HeaderPreviewLine,
  type KimiHeaderDefaults,
} from "@/modules/identity-fingerprint/identity-fingerprint-constants";
import { Button } from "@/modules/ui/Button";
import { TextInput } from "@/modules/ui/Input";
import { Select } from "@/modules/ui/Select";
import { TabsContent } from "@/modules/ui/Tabs";
import { ToggleSwitch } from "@/modules/ui/ToggleSwitch";

const textareaClassName =
  "min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-slate-100";

type CodexTabProps = {
  codex: Required<CodexIdentityFingerprint>;
  saving: boolean;
  loading: boolean;
  codexAdvancedOpen: boolean;
  setCodexAdvancedOpen: (open: boolean) => void;
  customHeadersText: string;
  setCustomHeadersText: (value: string) => void;
  codexPreviewHeaders: HeaderPreviewLine[];
  updateCodex: (patch: Partial<CodexIdentityFingerprint>) => void;
  restoreDefaults: () => void;
  onSave: () => void;
};

export function IdentityFingerprintCodexTab({
  codex,
  saving,
  loading,
  codexAdvancedOpen,
  setCodexAdvancedOpen,
  customHeadersText,
  setCustomHeadersText,
  codexPreviewHeaders,
  updateCodex,
  restoreDefaults,
  onSave,
}: CodexTabProps) {
  const { t } = useTranslation();

  return (
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
              <Button variant="secondary" onClick={restoreDefaults} disabled={loading || saving}>
                {t("identity_fingerprint.restore_defaults")}
              </Button>
              <Button onClick={onSave} disabled={loading || saving}>
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
                    onChange={(event) => updateCodex({ "websocket-beta": event.target.value })}
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
                  className={textareaClassName}
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
              <PreviewDisabledNotice>
                {t("identity_fingerprint.preview_disabled_notice")}
              </PreviewDisabledNotice>
            ) : null}
            <HeaderPreviewBlock lines={codexPreviewHeaders} />
            <ProviderNotice>{t("identity_fingerprint.notice_desc")}</ProviderNotice>
          </PreviewPanel>
        </div>
      </div>
    </TabsContent>
  );
}

type ClaudeTabProps = {
  claude: Required<ClaudeIdentityFingerprint>;
  saving: boolean;
  loading: boolean;
  claudeAdvancedOpen: boolean;
  setClaudeAdvancedOpen: (open: boolean) => void;
  claudeCustomHeadersText: string;
  setClaudeCustomHeadersText: (value: string) => void;
  claudePreviewHeaders: HeaderPreviewLine[];
  updateClaude: (patch: Partial<ClaudeIdentityFingerprint>) => void;
  restoreClaudeDefaults: () => void;
  onSave: () => void;
};

export function IdentityFingerprintClaudeTab({
  claude,
  saving,
  loading,
  claudeAdvancedOpen,
  setClaudeAdvancedOpen,
  claudeCustomHeadersText,
  setClaudeCustomHeadersText,
  claudePreviewHeaders,
  updateClaude,
  restoreClaudeDefaults,
  onSave,
}: ClaudeTabProps) {
  const { t } = useTranslation();

  return (
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
              <Button onClick={onSave} disabled={loading || saving}>
                {saving ? t("identity_fingerprint.saving") : t("identity_fingerprint.save_claude")}
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
                    onChange={(event) => updateClaude({ "anthropic-beta": event.target.value })}
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
                  className={textareaClassName}
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
              <PreviewDisabledNotice>
                {t("identity_fingerprint.preview_disabled_notice")}
              </PreviewDisabledNotice>
            ) : null}
            <HeaderPreviewBlock lines={claudePreviewHeaders} />
            <ProviderNotice>{t("identity_fingerprint.claude_notice")}</ProviderNotice>
          </PreviewPanel>
        </div>
      </div>
    </TabsContent>
  );
}

type GeminiTabProps = {
  saving: boolean;
  loading: boolean;
  geminiHeadersText: string;
  setGeminiHeadersText: (value: string) => void;
  geminiKeyCount: number;
  geminiPreviewHeaders: HeaderPreviewLine[];
  restoreGeminiDefaults: () => void;
  onSave: () => void;
};

export function IdentityFingerprintGeminiTab({
  saving,
  loading,
  geminiHeadersText,
  setGeminiHeadersText,
  geminiKeyCount,
  geminiPreviewHeaders,
  restoreGeminiDefaults,
  onSave,
}: GeminiTabProps) {
  const { t } = useTranslation();

  return (
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
              <Button onClick={onSave} disabled={loading || saving || geminiKeyCount === 0}>
                {saving ? t("identity_fingerprint.saving") : t("identity_fingerprint.save_gemini")}
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
              value={t("identity_fingerprint.gemini_key_count_value", { count: geminiKeyCount })}
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
  );
}

type KimiTabProps = {
  kimi: KimiHeaderDefaults;
  setKimi: Dispatch<SetStateAction<KimiHeaderDefaults>>;
  saving: boolean;
  loading: boolean;
  kimiPreviewHeaders: HeaderPreviewLine[];
  restoreKimiDefaults: () => void;
  onSave: () => void;
};

export function IdentityFingerprintKimiTab({
  kimi,
  setKimi,
  saving,
  loading,
  kimiPreviewHeaders,
  restoreKimiDefaults,
  onSave,
}: KimiTabProps) {
  const { t } = useTranslation();

  return (
    <TabsContent value="kimi" className="mt-4">
      <div className="space-y-3">
        <ProviderToolbar
          actions={
            <>
              <Button variant="secondary" onClick={restoreKimiDefaults} disabled={loading || saving}>
                {t("identity_fingerprint.restore_defaults")}
              </Button>
              <Button onClick={onSave} disabled={loading || saving}>
                {saving ? t("identity_fingerprint.saving") : t("identity_fingerprint.save_kimi")}
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
  );
}
