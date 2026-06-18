import { desktopWindowRegion, isDesktopFrameless } from "@/lib/desktop";
import { DesktopHeaderActions } from "@/modules/ui/DesktopHeaderActions";

export function DesktopWindowChrome() {
  const desktop = window.codeProxyDesktop;

  if (!isDesktopFrameless() || !desktop) {
    return null;
  }

  const handleDoubleClick = () => {
    void desktop.toggleWindowMaximize?.();
  };

  return (
    <header
      className="relative z-30 flex h-10 shrink-0 items-stretch border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/70"
      onDoubleClick={handleDoubleClick}
    >
      <div className="min-w-0 flex-1" style={desktopWindowRegion("drag")} />
      <div className="flex shrink-0 items-center pr-1">
        <DesktopHeaderActions />
      </div>
    </header>
  );
}
