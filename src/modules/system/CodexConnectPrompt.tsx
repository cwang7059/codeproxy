import { Link2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDesktopCodexStatus, isDesktopClient } from "@/lib/desktop";
import { useAuth } from "@/modules/auth/AuthProvider";
import { connectDesktopCodex } from "@/modules/system/codexIntegration";
import { Button } from "@/modules/ui/Button";
import { Modal } from "@/modules/ui/Modal";
import { useToast } from "@/modules/ui/ToastProvider";

const SESSION_DISMISS_KEY = "code-proxy-codex-connect-prompt-dismissed";

function readSessionDismissed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSessionDismissed(): void {
  try {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
  } catch {
    // ignore storage failures
  }
}

export function CodexConnectPrompt() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const auth = useAuth();
  const wasAuthenticatedRef = useRef(auth.state.isAuthenticated);
  const [open, setOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!isDesktopClient() || auth.state.isRestoring || !auth.state.isAuthenticated) {
      wasAuthenticatedRef.current = auth.state.isAuthenticated;
      return;
    }

    const justLoggedIn = !wasAuthenticatedRef.current && auth.state.isAuthenticated;
    wasAuthenticatedRef.current = auth.state.isAuthenticated;

    if (!justLoggedIn && readSessionDismissed()) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void getDesktopCodexStatus()
        .then((status) => {
          if (cancelled || status?.managed) {
            return;
          }
          setOpen(true);
        })
        .catch(() => {
          // Desktop IPC unavailable; skip prompting.
        });
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [auth.state.isAuthenticated, auth.state.isRestoring]);

  const handleDismiss = useCallback(() => {
    writeSessionDismissed();
    setOpen(false);
  }, []);

  const handleConnect = useCallback(async () => {
    if (!auth.state.apiBase.trim()) {
      notify({ type: "error", message: t("system_page.codex_connect_failed") });
      return;
    }

    setConnecting(true);
    try {
      await connectDesktopCodex(auth.state.apiBase, auth.state.role);
      setOpen(false);
      notify({ type: "success", message: t("system_page.codex_connect_success") });
    } catch (error) {
      notify({
        type: "error",
        message:
          error instanceof Error && error.message === "codex_no_api_key"
            ? t("system_page.codex_no_api_key")
            : error instanceof Error && error.message !== "codex_connect_failed"
            ? error.message
            : t("system_page.codex_connect_failed"),
      });
    } finally {
      setConnecting(false);
    }
  }, [auth.state.apiBase, auth.state.role, notify, t]);

  if (!isDesktopClient()) {
    return null;
  }

  return (
    <Modal
      open={open}
      title={t("codex_connect_prompt.title")}
      description={t("codex_connect_prompt.description")}
      maxWidth="max-w-md"
      onClose={handleDismiss}
      footer={
        <>
          <Button variant="secondary" onClick={handleDismiss} disabled={connecting}>
            {t("codex_connect_prompt.later")}
          </Button>
          <Button variant="primary" onClick={() => void handleConnect()} disabled={connecting}>
            <Link2 size={14} />
            {connecting ? t("codex_connect_prompt.connecting") : t("system_page.codex_connect_button")}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600 dark:text-white/65">
        {t("codex_connect_prompt.body", { server: auth.state.apiBase || "-" })}
      </p>
    </Modal>
  );
}
