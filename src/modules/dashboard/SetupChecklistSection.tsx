import { CheckCircle2, Circle, Copy, FileKey, KeyRound, Link2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getDesktopCodexStatus, isDesktopClient } from "@/lib/desktop";
import { apiKeyEntriesApi } from "@/lib/http/apis/api-keys";
import { authFilesApi } from "@/lib/http/apis/auth-files";
import { useAuth } from "@/modules/auth/AuthProvider";
import { isPanelAdmin } from "@/lib/panel-role";
import { connectDesktopCodex } from "@/modules/system/codexIntegration";
import { Button } from "@/modules/ui/Button";
import { Card } from "@/modules/ui/Card";
import { useToast } from "@/modules/ui/ToastProvider";

const DISMISS_STORAGE_KEY = "cli-proxy-dashboard-setup-dismissed";

const CODEX_CONFIG_SNIPPET = `model_provider = "clirelay"
model = "gpt-5.4"

[model_providers.clirelay]
name = "CliRelay"
base_url = "http://localhost:8317/v1"
wire_api = "responses"
supports_websockets = false
experimental_bearer_token = "local-dev-key"`;

type ChecklistItem = {
  id: "api-keys" | "auth-files" | "codex";
  done: boolean;
  to: string;
  icon: typeof KeyRound;
};

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function SetupChecklistSection() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const { state: authState } = useAuth();
  const desktopClient = isDesktopClient();
  const adminView = isPanelAdmin(authState.role);
  const [dismissed, setDismissed] = useState(() => readDismissed());
  const [loading, setLoading] = useState(true);
  const [apiKeyCount, setApiKeyCount] = useState(0);
  const [authFileCount, setAuthFileCount] = useState(0);
  const [codexConnected, setCodexConnected] = useState(false);
  const [codexCopied, setCodexCopied] = useState(false);
  const [codexConnecting, setCodexConnecting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [entries, authFiles, codexStatus] = await Promise.all([
        apiKeyEntriesApi.list(),
        authFilesApi.list(),
        desktopClient ? getDesktopCodexStatus() : Promise.resolve(null),
      ]);
      setApiKeyCount(entries.filter((entry) => String(entry.key ?? "").trim()).length);
      setAuthFileCount(authFiles.files?.length ?? 0);
      setCodexConnected(Boolean(codexStatus?.managed));
    } catch {
      setApiKeyCount(0);
      setAuthFileCount(0);
      setCodexConnected(false);
    } finally {
      setLoading(false);
    }
  }, [desktopClient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const codexDone = desktopClient ? codexConnected : codexCopied;

  const items = useMemo<ChecklistItem[]>(
    () => [
      {
        id: "api-keys",
        done: apiKeyCount > 0,
        to: "/api-keys",
        icon: KeyRound,
      },
      {
        id: "auth-files",
        done: authFileCount > 0,
        to: "/auth-files",
        icon: FileKey,
      },
      {
        id: "codex",
        done: codexDone,
        to: desktopClient ? "/system" : "/api-keys",
        icon: desktopClient ? Link2 : Copy,
      },
    ],
    [apiKeyCount, authFileCount, codexDone, desktopClient],
  );

  const allDone = items.every((item) => item.done);

  useEffect(() => {
    if (!loading && allDone && !dismissed) {
      localStorage.setItem(DISMISS_STORAGE_KEY, "1");
      setDismissed(true);
    }
  }, [allDone, dismissed, loading]);

  const copyCodexConfig = async () => {
    try {
      await navigator.clipboard.writeText(CODEX_CONFIG_SNIPPET);
      setCodexCopied(true);
      notify({ type: "success", message: t("dashboard.setup_codex_copied") });
    } catch {
      notify({ type: "error", message: t("dashboard.setup_codex_copy_failed") });
    }
  };

  const connectCodex = async () => {
    const apiBase = authState.apiBase.trim();
    if (!apiBase) {
      notify({ type: "error", message: t("dashboard.setup_codex_connect_failed") });
      return;
    }

    setCodexConnecting(true);
    try {
      await connectDesktopCodex(apiBase, authState.role);
      setCodexConnected(true);
      notify({ type: "success", message: t("dashboard.setup_codex_connected") });
    } catch {
      notify({ type: "error", message: t("dashboard.setup_codex_connect_failed") });
    } finally {
      setCodexConnecting(false);
    }
  };

  if (!adminView) {
    return null;
  }

  if (dismissed || loading) {
    return null;
  }

  if (apiKeyCount > 0 && authFileCount > 0 && codexDone) {
    return null;
  }

  return (
    <Card
      className="rounded-2xl border-blue-200/80 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-500/5"
      bodyClassName="space-y-4"
      padding="compact"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-950 dark:text-white">
            {t("dashboard.setup_checklist_title")}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-white/65">
            {t("dashboard.setup_checklist_desc")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="xs"
          aria-label={t("dashboard.setup_dismiss")}
          onClick={() => {
            localStorage.setItem(DISMISS_STORAGE_KEY, "1");
            setDismissed(true);
          }}
        >
          <X size={14} />
        </Button>
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const StatusIcon = item.done ? CheckCircle2 : Circle;
          const labelKey =
            item.id === "api-keys"
              ? "dashboard.setup_api_keys"
              : item.id === "auth-files"
                ? "dashboard.setup_auth_files"
                : "dashboard.setup_codex_config";

          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 dark:border-white/10 dark:bg-neutral-950/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <StatusIcon
                  size={18}
                  className={
                    item.done
                      ? "shrink-0 text-emerald-600 dark:text-emerald-400"
                      : "shrink-0 text-slate-400 dark:text-white/35"
                  }
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t(labelKey)}</p>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    {item.id === "api-keys"
                      ? t("dashboard.setup_api_keys_hint", { count: apiKeyCount })
                      : item.id === "auth-files"
                        ? t("dashboard.setup_auth_files_hint", { count: authFileCount })
                        : desktopClient
                          ? t("dashboard.setup_codex_config_hint_desktop")
                          : t("dashboard.setup_codex_config_hint")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.id === "codex" ? (
                  desktopClient ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void connectCodex()}
                      disabled={codexConnecting || item.done}
                    >
                      <Icon size={14} />
                      {codexConnecting
                        ? t("codex_connect_prompt.connecting")
                        : t("dashboard.setup_codex_connect")}
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => void copyCodexConfig()}>
                      <Icon size={14} />
                      {t("dashboard.setup_codex_copy")}
                    </Button>
                  )
                ) : (
                  <Link to={item.to} viewTransition>
                    <Button size="sm" variant={item.done ? "secondary" : "primary"}>
                      <Icon size={14} />
                      {item.done ? t("dashboard.setup_manage") : t("dashboard.setup_go_configure")}
                    </Button>
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
