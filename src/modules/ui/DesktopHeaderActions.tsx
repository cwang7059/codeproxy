import { desktopWindowRegion, isDesktopFrameless } from "@/lib/desktop";
import { LanguageSelector } from "@/modules/ui/LanguageSelector";
import { ThemeToggleButton } from "@/modules/ui/ThemeProvider";
import { DesktopWindowControls } from "@/modules/ui/DesktopWindowControls";

export function DesktopHeaderActions({ compact = false }: { compact?: boolean }) {
  if (!isDesktopFrameless()) {
    return null;
  }

  const controlSize = compact ? "h-9 w-9" : "h-10 w-10";
  const languageClass = compact
    ? "inline-flex h-9 min-w-[58px] items-center justify-center gap-0.5 rounded-xl px-2 text-slate-500 transition-colors duration-200 ease-out hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-neutral-800 dark:hover:text-white"
    : "inline-flex h-10 min-w-[62px] items-center justify-center gap-0.5 px-2 text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white";
  const themeClass = compact
    ? `inline-flex ${controlSize} items-center justify-center rounded-xl text-slate-500 transition-colors duration-200 ease-out hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-neutral-800 dark:hover:text-white`
    : `inline-flex ${controlSize} items-center justify-center text-slate-500 transition-colors hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10`;

  return (
    <div
      className="relative z-30 flex shrink-0 items-center gap-2 pl-2 sm:pl-3"
      style={desktopWindowRegion("no-drag")}
    >
      <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/70 px-1 py-1 shadow-sm dark:border-neutral-800/80 dark:bg-neutral-900/70">
        <LanguageSelector className={languageClass} />
        <ThemeToggleButton className={themeClass} />
      </div>
      <div className="shrink-0 border-l border-slate-200/80 pl-2 dark:border-neutral-800/80">
        <DesktopWindowControls compact={compact} />
      </div>
    </div>
  );
}
