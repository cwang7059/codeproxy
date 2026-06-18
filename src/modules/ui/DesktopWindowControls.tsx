import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Minus, Square, X } from "lucide-react";
import { desktopWindowRegion, isDesktopFrameless } from "@/lib/desktop";

function useDesktopWindow() {
  const desktop = window.codeProxyDesktop;
  const [maximized, setMaximized] = useState(false);

  const refreshMaximized = useCallback(async () => {
    if (!desktop?.isWindowMaximized) {
      return;
    }

    setMaximized(await desktop.isWindowMaximized());
  }, [desktop]);

  useEffect(() => {
    if (!isDesktopFrameless() || !desktop?.onWindowMaximizeChanged) {
      return;
    }

    void refreshMaximized();
    return desktop.onWindowMaximizeChanged((next) => {
      setMaximized(next);
    });
  }, [desktop, refreshMaximized]);

  return { desktop, maximized };
}

export function DesktopWindowControls({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { desktop, maximized } = useDesktopWindow();

  if (!isDesktopFrameless() || !desktop) {
    return null;
  }

  const buttonClass = compact
    ? "inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-neutral-800"
    : "inline-flex h-10 w-10 items-center justify-center text-slate-500 transition-colors hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10";
  const closeClass = compact
    ? "inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-red-500 hover:text-white dark:text-slate-400"
    : "inline-flex h-10 w-10 items-center justify-center text-slate-500 transition-colors hover:bg-red-500 hover:text-white dark:text-slate-300";

  return (
    <div className="flex shrink-0 items-center gap-1" style={desktopWindowRegion("no-drag")}>
      <button
        type="button"
        aria-label={t("shell.desktop_minimize")}
        title={t("shell.desktop_minimize")}
        className={buttonClass}
        onClick={() => void desktop.minimizeWindow?.()}
      >
        <Minus size={14} />
      </button>
      <button
        type="button"
        aria-label={maximized ? t("shell.desktop_restore") : t("shell.desktop_maximize")}
        title={maximized ? t("shell.desktop_restore") : t("shell.desktop_maximize")}
        className={buttonClass}
        onClick={() => void desktop.toggleWindowMaximize?.()}
      >
        {maximized ? <Copy size={13} /> : <Square size={12} />}
      </button>
      <button
        type="button"
        aria-label={t("shell.desktop_close")}
        title={t("shell.desktop_close")}
        className={closeClass}
        onClick={() => void desktop.closeWindow?.()}
      >
        <X size={14} />
      </button>
    </div>
  );
}
